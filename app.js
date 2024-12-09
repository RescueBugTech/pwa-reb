// MSAL.js Configuration
const msalConfig = {
  auth: {
    clientId: '896e65ec-f48b-43cc-8dd0-584d153b8622', 
    authority: 'https://login.microsoftonline.com/98c82fc2-43b4-41ec-9b19-c979102344da', 
    redirectUri: window.location.href
  },
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

msalInstance.handleRedirectPromise()
  .then((response) => {
    if (response) {
      msalInstance.setActiveAccount(response.account);
      storeToken(response.accessToken);
      displayUserName();
      getResourceStatus();
      promptForBiometricEnrollment();
    } else {
      authenticateWithBiometrics();
    }
  })
  .catch((error) => {
    console.error('Redirect login failed:', error);
  });

function signIn() {
  msalInstance.loginRedirect({
    scopes: ['User.Read', 'Calendars.Read.Shared']
  });
}

function storeToken(token) {
  localStorage.setItem("msalAccessToken", token);
}

function promptForBiometricEnrollment() {
  console.warn("Biometric enrollment prompt stub (Cordova not used here).");
}

async function authenticateWithBiometrics() {
  const token = localStorage.getItem("msalAccessToken");
  if (token) {
    displayUserName();
    getResourceStatus();
  } else {
    signIn();
  }
}

async function getToken() {
  const token = localStorage.getItem("msalAccessToken");
  if (!token) {
    console.warn("No token found, user needs to sign in.");
    return null;
  }
  return token;
}

async function displayUserName() {
  const token = await getToken();
  if (!token) return;

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const userData = await response.json();
    document.getElementById('user-name').textContent = `Welcome, ${userData.displayName}!`;
    window.userName = userData.displayName;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
  }
}

async function getResourceStatus() {
  const token = await getToken();
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
        liftsData.push({ ...lift, isBooked, bookingInfo });
      } else {
        console.error(`Failed to fetch data for ${lift.name}:`, response.statusText);
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${lift.name}:`, error);
    }
  }

  window.scissorLiftsData = liftsData;

  // For vehicles, let's mock data as in the previous example
  const vehicles = [
    { name: 'Truck 1', status: 'available' },
    { name: 'Van 1', status: 'booked' },
    { name: 'Car 1', status: 'available' },
  ];
  window.vehiclesData = vehicles;
}

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



if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service worker registered'))
    .catch(console.error);
}

