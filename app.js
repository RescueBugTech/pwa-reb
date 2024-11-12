// MSAL.js Configuration
const msalConfig = {
  auth: {
    clientId: '896e65ec-f48b-43cc-8dd0-584d153b8622',  // Replace with your client ID from Azure AD
    authority: 'https://login.microsoftonline.com/98c82fc2-43b4-41ec-9b19-c979102344da',  // Replace with your tenant ID
    redirectUri: 'https://rescuebugtech.github.io/pwa-reb/index.html'  // Redirect URI; update if using a specific URL
  },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// Handle the redirect response
msalInstance.handleRedirectPromise()
  .then((response) => {
    if (response) {
      msalInstance.setActiveAccount(response.account);
      storeToken(response.accessToken);
      displayUserName();
      getResourceStatus();  // Load resources after successful login
      promptForBiometricEnrollment();
    } else {
      authenticateWithBiometrics();
    }
  })
  .catch((error) => {
    console.error('Redirect login failed:', error);
  });

// Function to handle Microsoft 365 sign-in with redirect
function signIn() {
  msalInstance.loginRedirect({
    scopes: ['User.Read', 'Calendars.Read.Shared']
  });
}

// Store the token in local storage after login
function storeToken(token) {
  localStorage.setItem("msalAccessToken", token);
}

// Prompt user to enable biometrics for subsequent logins
function promptForBiometricEnrollment() {
  if (window.cordova && cordova.plugins && cordova.plugins.fingerprint) {
    cordova.plugins.fingerprint.isAvailable((result) => {
      if (result.isAvailable) {
        if (confirm("Would you like to enable Face ID / Touch ID for future logins?")) {
          cordova.plugins.fingerprint.show({
            clientId: "Resource Availability App",
            clientSecret: "password"
          }, () => {
            console.log("Biometric enrollment successful");
          }, (error) => {
            console.error("Biometric enrollment failed:", error);
          });
        }
      }
    });
  } else {
    console.warn("Biometric authentication not supported on this device or browser.");
  }
}

// Check for token in local storage and prompt for biometric authentication if available
async function authenticateWithBiometrics() {
  const token = localStorage.getItem("msalAccessToken");
  if (token) {
    if (window.cordova && cordova.plugins && cordova.plugins.fingerprint) {
      cordova.plugins.fingerprint.show({
        clientId: "Resource Availability App",
        clientSecret: "password"
      }, () => {
        displayUserName();
        getResourceStatus();
      }, (error) => {
        console.error("Biometric auth failed:", error);
        signIn();
      });
    } else {
      signIn();
    }
  } else {
    signIn();
  }
}

// Function to get access token from local storage
async function getToken() {
  const token = localStorage.getItem("msalAccessToken");
  if (!token) {
    console.warn("No token found, user needs to sign in.");
    return null;
  }
  return token;
}

// Function to display the signed-in user's name
async function displayUserName() {
  const token = await getToken();
  if (!token) return;

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userData = await response.json();
    document.getElementById('user-name').textContent = `Welcome, ${userData.displayName}!`;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
  }
}

// Existing function to fetch lift booking status
async function getResourceStatus() {
  const token = await getToken();
  if (!token) return;

  const scissorLifts = [
    { name: 'Engineering', email: 'ScissorLiftENG@rescue.com' },
    { name: 'Molding', email: 'ScissorLiftMOLD@rescue.com' },
    { name: 'Maintenance', email: 'ScissorLiftMAINT@rescue.com' },
  ];

  scissorLifts.forEach(async (lift) => {
    try {
      const bookings = await fetchBookingsForDate(lift.name, new Date().toISOString().slice(0, 10));
      updateUI(lift.name, bookings);
    } catch (error) {
      console.error(`Failed to fetch data for ${lift.name}:`, error);
    }
  });
}

// Function to convert UTC time to local time without seconds and without leading zero in hour
function formatTime(dateString) {
  const utcDate = new Date(dateString);

  // Apply the timezone offset to get the local date and time
  const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);

  return localDate.toLocaleTimeString([], {
    hour: 'numeric',  // Use 'numeric' to remove leading zero from single-digit hours
    minute: '2-digit',
    hour12: true  // Ensures 12-hour format with AM/PM
  });
}

function updateUI(name, bookings) {
  const listElement = document.getElementById(`${name.toLowerCase()}-list`);
  if (!listElement) {
    console.error(`Element with ID ${name.toLowerCase()}-list not found`);
    return;
  }

  const infoElement = listElement.querySelector('.lift-info');
  infoElement.innerHTML = bookings.length > 0 ? bookings.map(booking => `
    <div class="booking-info">
      <span class="resource-status booked"></span>
      <p><strong>Booked by:</strong> ${booking.organizer.emailAddress.name}</p>
      <p><strong>Time:</strong> ${formatTime(booking.start.dateTime)} - ${formatTime(booking.end.dateTime)}</p>
    </div>
  `).join('') : `
    <div class="booking-info">
      <span class="resource-status available"></span>
      <p>Available</p>
    </div>
  `;
}


// Helper function to get the current time range (next hour)
function getTimeRange() {
  const start = new Date();
  const end = new Date();
  end.setHours(end.getHours() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Tab switching functionality with active button highlight
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // Refresh Scissor Lifts section if the tab is clicked
      if (target === 'scissor-lifts') {
        clearScissorLiftData();
        getResourceStatus();
      }

      // Set active state for tab content
      tabContents.forEach((content) => {
        content.classList.toggle('active', content.id === target);
      });

      // Highlight the active tab button
      tabs.forEach((btn) => btn.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});

// Clear scissor lift data to refresh it when tab is clicked
function clearScissorLiftData() {
  document.querySelectorAll('.lift-info').forEach((element) => {
    element.innerHTML = '<p>Loading...</p>';
  });
}

// Fetch bookings for a specific lift and date
async function fetchBookingsForDate(lift, date) {
  const token = await getToken();
  const liftEmail = getLiftEmail(lift);
  const startDate = new Date(`${date}T00:00:00Z`).toISOString();
  const endDate = new Date(`${date}T23:59:59Z`).toISOString();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${liftEmail}/calendar/calendarView?startDateTime=${startDate}&endDateTime=${endDate}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (response.ok) {
    const data = await response.json();
    return data.value || [];
  }
  return [];
}

// Map lift ID to email address
function getLiftEmail(liftId) {
  const liftEmails = {
    'engineering-list': 'ScissorLiftENG@rescue.com',
    'molding-list': 'ScissorLiftMOLD@rescue.com',
    'maintenance-list': 'ScissorLiftMAINT@rescue.com'
  };
  return liftEmails[liftId];
}

// Helper function to get disabled times based on existing bookings
function getDisabledTimes(existingBookings) {
  return existingBookings.map(booking => {
    const start = new Date(booking.start.dateTime);

    return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
}