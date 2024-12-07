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
    } else {
      signIn();
    }
  })
  .catch((error) => {
    console.error('Redirect login failed:', error);
  });

// Function to handle Microsoft 365 sign-in with redirect
function signIn() {
  msalInstance.loginRedirect({
    scopes: ['User.Read', 'Calendars.ReadWrite.Shared']
  });
}

// Store the token in local storage after login
function storeToken(token) {
  localStorage.setItem("msalAccessToken", token);
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

  // Add event listeners for resource actions
  addResourceEventListeners();
}

// Helper function to get the current time range (next hour)
function getTimeRange() {
  const start = new Date();
  const end = new Date();
  end.setHours(end.getHours() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Function to convert UTC time to local time without seconds and without leading zero in hour
function formatTime(dateString) {
  const utcDate = new Date(dateString);
  const localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
  return localDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Update UI with booking info
function updateUI(name, isBooked, bookingInfo = null) {
  const listElement = document.getElementById(`${name.toLowerCase()}-list`);
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

// Open modal for booking options
function openActionDialog(liftId, bookings) {
  const bookingModal = document.getElementById('bookingModal');
  const closeModal = document.querySelector('.close');
  const bookResourceBtn = document.getElementById('bookResourceBtn');
  const reviewBookingBtn = document.getElementById('reviewBookingBtn');
  const extendBookingBtn = document.getElementById('extendBookingBtn');
  const cancelBookingBtn = document.getElementById('cancelBookingBtn');
  const dateTimePicker = document.getElementById('dateTimePicker');

  bookingModal.style.display = 'block';

  const hasActiveBooking = bookings.some(booking => booking.organizer.emailAddress.address === 'yourUserEmailHere');
  const isAvailable = bookings.length === 0;

  bookResourceBtn.disabled = !isAvailable;
  reviewBookingBtn.disabled = !hasActiveBooking;
  extendBookingBtn.disabled = !hasActiveBooking;
  cancelBookingBtn.disabled = !hasActiveBooking;

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

  closeModal.onclick = function () {
    bookingModal.style.display = 'none';
  };

  window.onclick = function (event) {
    if (event.target == bookingModal) {
      bookingModal.style.display = 'none';
    }
  };
}

// Confirm booking logic
function confirmBooking(liftId, selectedDateTime) {
  if (confirm(`Confirm Booking for ${new Date(selectedDateTime).toLocaleString()}?`)) {
    makeBooking(liftId, selectedDateTime);
  }
}

// Implement booking-related actions (make, review, extend, cancel)
async function makeBooking(liftId, dateTime) {
  // Logic for making a booking
}

function reviewBooking(liftId, bookings) {
  // Logic for reviewing booking
}

function extendBooking(liftId, selection) {
  // Logic for extending booking
}

function cancelBooking(liftId, bookings) {
  // Logic for canceling booking
}
