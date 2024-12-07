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

// Fetch resource status for scissor lifts
async function getResourceStatus() {
  const token = await getToken();
  if (!token) return;

  const scissorLifts = [
    { name: 'Engineering', email: 'ScissorLiftENG@rescue.com' },
    { name: 'Molding', email: 'ScissorLiftMOLD@rescue.com' },
    { name: 'Maintenance', email: 'ScissorLiftMAINT@rescue.com' },
  ];

  const { start, end } = getTimeRange();

  scissorLifts.forEach(async (lift) => {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${lift.email}/calendar/calendarView?startDateTime=${start}&endDateTime=${end}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const isBooked = data.value && data.value.length > 0;

        let bookingInfo = null;
        if (isBooked) {
          const event = data.value[0];
          bookingInfo = {
            organizer: event.organizer.emailAddress.name,
            start: formatTime(event.start.dateTime),
            end: formatTime(event.end.dateTime)
          };
        }

        updateUI(lift.name, isBooked, bookingInfo);
      } else {
        console.error(`Failed to fetch data for ${lift.name}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${lift.name}:`, error);
    }
  });
	
// Add this at the end of `getResourceStatus`
addResourceEventListeners();
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

// Update UI with booking info
function updateUI(name, isBooked, bookingInfo = null) {
  const listElement = document.getElementById(`${name.toLowerCase()}-list`);

  if (!listElement) {
    console.error(`Element with ID ${name.toLowerCase()}-list not found`);
    return;
  }

  const infoElement = listElement.querySelector('.lift-info');

  infoElement.innerHTML = isBooked ? `
    <div class="booking-info">
      <span class="resource-status booked"></span>
      <p><strong>Booked by:</strong> ${bookingInfo.organizer}</p>
      <p><strong>Time:</strong> ${bookingInfo.start} - ${bookingInfo.end}</p>
    </div>
  ` : `
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

// Add event listeners to the resource buttons
function addResourceEventListeners() {
  const resourceLists = document.querySelectorAll('.resource-list');
  resourceLists.forEach(list => {
    list.addEventListener('click', async () => {
      const liftId = list.id;
      const bookings = await fetchBookingsForDate(liftId, new Date().toISOString().split('T')[0]);
      
      openActionDialog(liftId, bookings);
    });
  });
}

// Get modal element
const bookingModal = document.getElementById('bookingModal');
const closeModal = document.querySelector('.close');
const bookResourceBtn = document.getElementById('bookResourceBtn');
const reviewBookingBtn = document.getElementById('reviewBookingBtn');
const extendBookingBtn = document.getElementById('extendBookingBtn');
const cancelBookingBtn = document.getElementById('cancelBookingBtn');
const dateTimePicker = document.getElementById('dateTimePicker');

// Open modal
function openActionDialog(liftId, bookings) {
  bookingModal.style.display = 'block';
  
  // Enable or disable buttons based on the booking state
  const hasActiveBooking = bookings.some(booking => booking.organizer.emailAddress.address === 'yourUserEmailHere');
  const isAvailable = bookings.length === 0;

  bookResourceBtn.disabled = !isAvailable;
  reviewBookingBtn.disabled = !hasActiveBooking;
  extendBookingBtn.disabled = !hasActiveBooking;
  cancelBookingBtn.disabled = !hasActiveBooking;

  // Event listeners for buttons
  bookResourceBtn.onclick = () => {
    dateTimePicker.style.display = 'block';
    dateTimePicker.addEventListener('change', () => {
      const selectedDateTime = new Date(dateTimePicker.value).toISOString();
      confirmBooking(liftId, selectedDateTime);
      bookingModal.style.display = 'none';
    });
  };

  reviewBookingBtn.onclick = () => {
    reviewBooking(liftId, bookings);
  };

  extendBookingBtn.onclick = () => {
    // Display the options for extending
    const options = ["15 Minutes", "30 Minutes", "45 Minutes", "1 Hour"];
    let extendSelection = prompt(`Extend Booking by:\n${options.join('\n')}`);
    if (options.includes(extendSelection)) {
      extendBooking(liftId, extendSelection);
    }
  };

  cancelBookingBtn.onclick = () => {
    if (confirm("Do you really want to cancel this booking?")) {
      cancelBooking(liftId, bookings);
      bookingModal.style.display = 'none';
    }
  };
}

// Close modal when user clicks on <span> (x)
closeModal.onclick = function () {
  bookingModal.style.display = 'none';
};

// Close modal if user clicks outside of it
window.onclick = function (event) {
  if (event.target == bookingModal) {
    bookingModal.style.display = 'none';
  }
};

// Confirm booking logic
function confirmBooking(liftId, selectedDateTime) {
  if (confirm(`Confirm Booking for ${new Date(selectedDateTime).toLocaleString()}?`)) {
    makeBooking(liftId, selectedDateTime);
  }
}


async function makeBooking(liftId, dateTime) {
  const token = await getToken();
  if (!token) return;

  // Assuming the liftId maps to an email (as in your current implementation)
  const email = getLiftEmail(liftId);
  
  // Example data for the event creation request
  const bookingData = {
    subject: 'Resource Booking',
    start: { dateTime: dateTime, timeZone: 'UTC' },
    end: { dateTime: new Date(new Date(dateTime).getTime() + 3600000).toISOString(), timeZone: 'UTC' },  // 1 hour booking by default
    attendees: [{ emailAddress: { address: email }, type: 'required' }]
  };

  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${email}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    if (response.ok) {
      alert("Booking confirmed!");
    } else {
      console.error('Failed to create booking:', response.statusText);
    }
  } catch (error) {
    console.error('Error while booking:', error);
  }
}

function openActionDialog(liftId, bookings) {
  // Add a native dialog for selecting different actions
  const action = prompt("Select action: \n1. Book this Resource\n2. Review Booking\n3. Extend Booking\n4. Cancel Booking");

  switch (action) {
    case "1":
      openDateTimePicker(liftId, bookings);
      break;
    case "2":
      reviewBooking(liftId, bookings);
      break;
    case "3":
      extendBooking(liftId, bookings);
      break;
    case "4":
      cancelBooking(liftId, bookings);
      break;
    default:
      alert("Invalid selection.");
      break;
  }
}

function reviewBooking(liftId, bookings) {
  if (bookings.length === 0) {
    alert("No bookings available to review.");
    return;
  }

  const booking = bookings[0]; // Assuming only one booking at a time
  alert(`Booking Details:\nBooked By: ${booking.organizer.emailAddress.name}\nStart: ${booking.start.dateTime}\nEnd: ${booking.end.dateTime}`);
}

function extendBooking(liftId, bookings) {
  if (bookings.length === 0) {
    alert("No active booking to extend.");
    return;
  }

  const options = ["15 Minutes", "30 Minutes", "45 Minutes", "1 Hour"];
  const selection = prompt(`Extend Booking by:\n${options.join('\n')}`);

  if (options.includes(selection)) {
    // Extend booking logic
    alert(`Booking extended by ${selection}.`);
  } else {
    alert("Invalid selection.");
  }
}

function cancelBooking(liftId, bookings) {
  if (bookings.length === 0) {
    alert("No active booking to cancel.");
    return;
  }

  if (confirm("Do you really want to cancel this booking?")) {
    // Logic to cancel booking
    alert("Booking cancelled.");
  }
}
