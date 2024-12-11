// MSAL.js Configuration
const msalConfig = {
  auth: {
    clientId: '896e65ec-f48b-43cc-8dd0-584d153b8622',
    authority: 'https://login.microsoftonline.com/98c82fc2-43b4-41ec-9b19-c979102344da',
    redirectUri: 'https://rescuebugtech.github.io/pwa-reb/index.html'
  },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

// Handle redirect sign-in response
msalInstance.handleRedirectPromise()
  .then((response) => {
    if (response) {
      msalInstance.setActiveAccount(response.account);
      storeToken(response.accessToken);
      displayUserName();
      getResourceStatus();
      promptForBiometricEnrollment();
    } else {
      // No token from redirect, try silent token acquisition or sign-in
      authenticateWithBiometrics();
    }
  })
  .catch((error) => {
    console.error('Redirect login failed:', error);
    signIn();
  });

// Function to sign in interactively (if silent fails)
function signIn() {
  msalInstance.loginRedirect({
    scopes: ['User.Read', 'Calendars.Read.Shared']
  });
}

// Store token after login
function storeToken(token) {
  localStorage.setItem("msalAccessToken", token);
}

// Try silent token acquisition first, fallback to sign-in if it fails
async function ensureToken() {
  let token = localStorage.getItem("msalAccessToken");

  if (!token) {
    // No token stored locally, try silent acquisition
    try {
      const silentResult = await msalInstance.acquireTokenSilent({
        scopes: ['User.Read', 'Calendars.Read.Shared'],
        account: msalInstance.getActiveAccount()
      });
      if (silentResult && silentResult.accessToken) {
        storeToken(silentResult.accessToken);
        return silentResult.accessToken;
      } else {
        // Silent failed; prompt interactive sign-in
        signIn();
        return null;
      }
    } catch (silentError) {
      console.warn("Silent token acquisition failed:", silentError);
      signIn();
      return null;
    }
  }

  // If we have a token, optionally check if it's still valid. Normally, acquireTokenSilent handles refresh.
  return token;
}

// Get token, ensuring it's valid or re-acquired
async function getToken() {
  const token = await ensureToken();
  if (!token) {
    console.warn("No valid token found, user may need to sign in.");
    return null;
  }
  return token;
}

// Prompt for Biometric Enrollment (Stub for now)
function promptForBiometricEnrollment() {
  console.warn("Biometric enrollment prompt stub.");
}

// Authenticate with biometrics if available, otherwise sign in
async function authenticateWithBiometrics() {
  const token = await ensureToken();
  if (token) {
    displayUserName();
    getResourceStatus();
  } else {
    // ensureToken() already tries signIn if it fails silently
  }
}

// Display the signed-in user's name
async function displayUserName() {
  let token = await getToken();
  if (!token) return;

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      const userData = await response.json();
      document.getElementById('user-name').textContent = `Welcome, ${userData.displayName}!`;
      window.userName = userData.displayName;
    } else if (response.status === 401) {
      // If unauthorized, token may be invalid, clear and retry
      localStorage.removeItem("msalAccessToken");
      await ensureToken();
      await displayUserName(); // retry once
    } else {
      console.error('Failed to fetch user profile:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
  }
}

// Fetch resource status for scissor lifts
async function getResourceStatus() {
  let token = await getToken();
  if (!token) return;

  const scissorLifts = [
    { name: 'Engineering', email: 'ScissorLiftENG@rescue.com' },
    { name: 'Molding', email: 'ScissorLiftMOLD@rescue.com' },
    { name: 'Maintenance', email: 'ScissorLiftMAINT@rescue.com' },
  ];

  const { start, end } = getTimeRange();

  const liftsData = [];
  for (const lift of scissorLifts) {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/users/${lift.email}/calendar/calendarView?startDateTime=${start}&endDateTime=${end}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        liftsData.push({ ...lift, isBooked, bookingInfo });
      } else if (response.status === 401) {
        // Token invalid, retry token acquisition
        localStorage.removeItem("msalAccessToken");
        await ensureToken();
        return getResourceStatus(); // retry once
      } else {
        console.error(`Failed to fetch data for ${lift.name}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${lift.name}:`, error);
    }
  }

  window.scissorLiftsData = liftsData;

  // Mock vehicles data
  const vehicles = [
    { name: 'Truck 1', status: 'available' },
    { name: 'Van 1', status: 'booked' },
    { name: 'Car 1', status: 'available' },
  ];
  window.vehiclesData = vehicles;
}

// Helper functions
function formatTime(dateString) {
  const utcDate = new Date(dateString);
  const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
  return localDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getTimeRange() {
  const start = new Date();
  const end = new Date();
  end.setHours(end.getHours() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}


async function openBookingModal(lift) {
  const existingBookings = await fetchBookings(lift.email);
  const blockedTimes = existingBookings.map(booking => ({
    start: new Date(booking.start),
    end: new Date(booking.end),
  }));

  // Clear existing modal content
  const modalContent = document.getElementById('slider-content');
  modalContent.innerHTML = '';

  // Add Back button
  const backButton = document.createElement('button');
  backButton.textContent = 'Back';
  backButton.className = 'back-button';
  backButton.addEventListener('click', () => {
    navigateToTab('scissor-lifts');
  });
  modalContent.appendChild(backButton);

  // Add title
  const title = document.createElement('h3');
  title.textContent = `Book ${lift.name}`;
  modalContent.appendChild(title);

  // Add date pickers
  const startTimeLabel = document.createElement('label');
  startTimeLabel.textContent = 'Start Time';
  const startTimePicker = document.createElement('input');
  startTimePicker.type = 'datetime-local';
  startTimePicker.className = 'date-picker';

  const toLabel = document.createElement('span');
  toLabel.textContent = ' to ';
  toLabel.style.display = 'block'; // Inline-block for alignment

  const endTimeLabel = document.createElement('label');
  endTimeLabel.textContent = 'End Time';
  const endTimePicker = document.createElement('input');
  endTimePicker.type = 'datetime-local';
  endTimePicker.className = 'date-picker';

  modalContent.appendChild(startTimeLabel);
  modalContent.appendChild(startTimePicker);
  modalContent.appendChild(toLabel);
  modalContent.appendChild(endTimeLabel);
  modalContent.appendChild(endTimePicker);

  // Block unavailable times
  startTimePicker.addEventListener('change', () => {
    const selectedStart = new Date(startTimePicker.value);
    if (blockedTimes.some(({ start, end }) => selectedStart >= start && selectedStart < end)) {
      alert('Selected time overlaps with an existing booking.');
      startTimePicker.value = ''; // Reset value
    }
  });

  endTimePicker.addEventListener('change', () => {
    const selectedEnd = new Date(endTimePicker.value);
    if (blockedTimes.some(({ start, end }) => selectedEnd > start && selectedEnd <= end)) {
      alert('Selected time overlaps with an existing booking.');
      endTimePicker.value = ''; // Reset value
    }
  });

  // Add confirm button
  const confirmButton = document.createElement('button');
  confirmButton.textContent = 'Confirm Booking';
  confirmButton.className = 'action-buttons';
  confirmButton.addEventListener('click', async () => {
    const start = startTimePicker.value;
    const end = endTimePicker.value;
    if (!start || !end) {
      alert('Please select valid start and end times.');
      return;
    }
    await createBooking(lift.email, start, end);
    alert('Booking confirmed!');
    populateSliderContent('scissor-lifts');
  });
  modalContent.appendChild(confirmButton);
}





async function fetchBookings(resourceEmail) {
  const token = await getToken();
  if (!token) return [];

  const { start, end } = getTimeRange();
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${resourceEmail}/calendar/calendarView?startDateTime=${start}&endDateTime=${end}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    console.error('Failed to fetch bookings:', response.statusText);
    return [];
  }

  const data = await response.json();
  return data.value;
}

async function createBooking(resourceEmail, start, end) {
  const token = await getToken();
  if (!token) return;

  const event = {
    subject: 'Resource Booking',
    start: { dateTime: start, timeZone: 'UTC' },
    end: { dateTime: end, timeZone: 'UTC' },
  };

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${resourceEmail}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    console.error('Failed to create booking:', response.statusText);
    return false;
  }
  return true;
}




// Expose refreshResources so that ui.js can call it
window.refreshResources = async function() {
  await getResourceStatus();
};


if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service worker registered'))
    .catch(console.error);
}

