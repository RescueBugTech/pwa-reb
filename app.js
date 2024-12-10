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
    scopes: ['User.Read', 'Calendars.Read.Shared', 'Calendars.ReadWrite']
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
        scopes: ['User.Read', 'Calendars.Read.Shared', 'Calendars.ReadWrite'],
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
            end: formatTime(event.end.dateTime),
            eventId: event.id // Store the event ID for cancellation
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

// Expose refreshResources so that ui.js can call it
window.refreshResources = async function() {
  await getResourceStatus();
};

// -----------------------------
// Booking and Canceling (Pseudo Code)
// -----------------------------

// Book Resource
// resourceId will be the resource's email (e.g. 'ScissorLiftMOLD@rescue.com')
window.bookResource = async function(resourceId) {
  const token = await getToken();
  if (!token) return false;

  const { start, end } = getTimeRange();
  const subject = `Booking by ${window.userName}`;

  const eventBody = {
    subject: subject,
    start: { dateTime: start, timeZone: 'UTC' },
    end: { dateTime: end, timeZone: 'UTC' },
    attendees: [
      {
        emailAddress: {
          address: resourceId // Treating this like a user mailbox
        },
        type: "required" // Instead of "resource"
      }
    ]
  };

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });

    if (response.ok) {
      console.log('Event created on user’s calendar with scissor lift invited as a regular attendee.');
      const eventData = await response.json();
      // If needed, store eventData.id for cancellation purposes
      return true;
    } else {
      const errorText = await response.text();
      console.error('Booking failed:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error booking resource:', error);
    return false;
  }
};



// Cancel Booking
// We assume we have the eventId from the resource’s bookingInfo.
window.cancelBooking = async function(resourceId) {
  const token = await getToken();
  if (!token) return false;

  // Find the resource in window.scissorLiftsData to get eventId
  const resource = (window.scissorLiftsData || []).find(r => r.email === resourceId);
  if (!resource || !resource.bookingInfo || !resource.bookingInfo.eventId) {
    console.warn('No booking found for this resource or missing eventId.');
    return false;
  }

  const eventId = resource.bookingInfo.eventId;

  try {
    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${resourceId}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.ok) {
      console.log('Booking cancelled successfully.');
      return true;
    } else {
      console.error('Cancellation failed:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error canceling booking:', error);
    return false;
  }
};

// Toggle Notifications
// For now, we simply store user preference in localStorage. 
// Later, you might integrate this with a backend or push subscription service.
window.toggleNotify = async function(resourceId, shouldNotify) {
  const notifyKey = `notify_${resourceId}`;
  localStorage.setItem(notifyKey, shouldNotify ? 'true' : 'false');
  console.log(`Notification preference for ${resourceId} set to ${shouldNotify}`);
  return true;
};

// If a service worker is available, register it
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service worker registered'))
    .catch(console.error);
}
