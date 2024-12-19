document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-button');
  const slider = document.getElementById('slider');
  const sliderTitle = document.getElementById('slider-title');
  const sliderContent = document.getElementById('slider-content');
  const sliderClose = document.getElementById('slider-close');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      setActiveTab(tabId);
      openSlider(tabId);
    });
  });

  sliderClose.addEventListener('click', () => {
    closeSlider();
  });

  function setActiveTab(tabId) {
    tabs.forEach((t) => t.classList.remove('active'));
    const currentTab = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (currentTab) currentTab.classList.add('active');
  }

  function openSlider(tabId) {
    populateSliderContent(tabId);
    slider.classList.add('open');
  }

  function closeSlider() {
    slider.classList.remove('open');
  }

  async function populateSliderContent(tabId) {
    sliderContent.innerHTML = '';
	  
	    // Define icon paths for each tab
		  const icons = {
			'home': 'eyecons/home-tab.png',
			'scissor-lifts': 'eyecons/scissor-tab.png',
			'vehicles': 'eyecons/vehicle-tab.png',
			'qr-booking': 'eyecons/qr-tab.png',
			'about': 'eyecons/about-tab.png',
		  };

		  // Add the icon image
		  if (icons[tabId]) {
			const iconImg = document.createElement('img');
			iconImg.src = icons[tabId];
			iconImg.alt = `${tabId} icon`;
			iconImg.className = 'slider-icon'; // Add CSS for styling
			sliderContent.appendChild(iconImg);
		  }

if (tabId === 'home') {
  const name = window.userName || 'User';
  const p = document.createElement('p');

  // Create and append text and <br> elements manually
  p.appendChild(document.createTextNode(`Hello, ${name}. Use this app to book a resource within the Sterling environment.`));
  p.appendChild(document.createElement('br'));
  p.appendChild(document.createElement('br'));
  p.appendChild(document.createTextNode(`If you need to use one of the Scissor Lifts, go ahead and book it.`));
  p.appendChild(document.createElement('br'));
  p.appendChild(document.createTextNode(`You can also use it to book the R&D vehicles along with one of the golf carts for a client tour.`));

  sliderContent.appendChild(p);
}


} else if (tabId === 'scissor-lifts') {
  const headingContainer = document.createElement('div');
  headingContainer.className = 'scissor-lifts-header';

  const h3 = document.createElement('h3');
  h3.textContent = 'Scissor Lifts';

  const refreshButton = document.createElement('button');
  refreshButton.className = 'refresh-button';
  refreshButton.innerHTML = '<img src="eyecons/refresh.png" alt="Refresh" class="refresh-icon">';
  refreshButton.addEventListener('click', async () => {
    await window.refreshResources();
    populateSliderContent('scissor-lifts');
  });

  headingContainer.appendChild(h3);
  headingContainer.appendChild(refreshButton);
  sliderContent.appendChild(headingContainer);

  const ul = document.createElement('ul');
  (window.scissorLiftsData || []).forEach(lift => {
    const li = document.createElement('li');
    const statusSpan = document.createElement('span');
    statusSpan.classList.add('resource-status');

    if (lift.isBooked && lift.bookingInfo) {
      statusSpan.classList.add('booked');
      li.appendChild(statusSpan);
      li.appendChild(document.createTextNode(`${lift.name}: Booked by ${lift.bookingInfo.organizer} from ${lift.bookingInfo.start} to ${lift.bookingInfo.end}`));
    } else {
      statusSpan.classList.add('available');
      li.appendChild(statusSpan);
      li.appendChild(document.createTextNode(`${lift.name}: Available`));
    }

    // Add Action Buttons
    const actionContainer = document.createElement('div');
    actionContainer.className = 'action-buttons';

    const bookButton = document.createElement('button');
    bookButton.textContent = 'Book This Resource';
    bookButton.addEventListener('click', () => openBookingModal(lift));
    actionContainer.appendChild(bookButton);

    const reviewButton = document.createElement('button');
    reviewButton.textContent = 'Review Booking';
    reviewButton.disabled = !lift.isBooked; // Enable only if there's a booking
    reviewButton.addEventListener('click', () => reviewBooking(lift));
    actionContainer.appendChild(reviewButton);

    const extendButton = document.createElement('button');
    extendButton.textContent = 'Extend Booking';
    extendButton.disabled = !lift.isBooked; // Enable only for active bookings
    extendButton.addEventListener('click', () => extendBooking(lift));
    actionContainer.appendChild(extendButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel Booking';
    cancelButton.disabled = !lift.isBooked; // Enable only for active bookings
    cancelButton.addEventListener('click', () => cancelBooking(lift));
    actionContainer.appendChild(cancelButton);

    li.appendChild(actionContainer);
    ul.appendChild(li);
  });
  sliderContent.appendChild(ul);



    } else if (tabId === 'vehicles') {
      const h3 = document.createElement('h3');
      h3.textContent = 'Vehicles';
      sliderContent.appendChild(h3);

      const ul = document.createElement('ul');
      (window.vehiclesData || []).forEach(vehicle => {
        const li = document.createElement('li');
        const statusSpan = document.createElement('span');
        statusSpan.classList.add('resource-status');

        if (vehicle.status === 'available') {
          statusSpan.classList.add('available');
          li.appendChild(statusSpan);
          li.appendChild(document.createTextNode(`${vehicle.name}: Available`));
        } else {
          statusSpan.classList.add('booked');
          li.appendChild(statusSpan);
          li.appendChild(document.createTextNode(`${vehicle.name}: Booked`));
        }

        ul.appendChild(li);
      });
      sliderContent.appendChild(ul);

    } else if (tabId === 'qr-booking') {
      const h3 = document.createElement('h3');
      h3.textContent = 'QR Booking';
      sliderContent.appendChild(h3);
      const p = document.createElement('p');
      p.textContent = 'Scan a QR code to book an asset:';
      sliderContent.appendChild(p);

      const div = document.createElement('div');
      div.className = 'qr-box';
      div.textContent = 'QR';
      sliderContent.appendChild(div);

    } else if (tabId === 'about') {
      const h3 = document.createElement('h3');
      h3.textContent = 'About Asset Tracker';
      sliderContent.appendChild(h3);

      const p1 = document.createElement('p');
      p1.textContent = 'Asset Tracker helps manage and track assets.';
      sliderContent.appendChild(p1);

      const p2 = document.createElement('p');
      p2.textContent = 'Version: 2.1.0';
      sliderContent.appendChild(p2);

      const p3 = document.createElement('p');
      p3.textContent = '© 2025 Sterling International';
      sliderContent.appendChild(p3);

      const upcomingTitle = document.createElement('h4');
      upcomingTitle.textContent = 'Upcoming Plans:';
      sliderContent.appendChild(upcomingTitle);

      const ul = document.createElement('ul');
      const plans = ['Allor booking of R$D Vehicles', 'Turn on Review, Extend, and Cancel Booking buttons', 'Push alerts for availability', 'Improve visuals'];
      plans.forEach(plan => {
        const li = document.createElement('li');
        li.textContent = plan;
        ul.appendChild(li);
      });
      sliderContent.appendChild(ul);
    }
  }
	
	window.populateSliderContent = populateSliderContent;
	console.log('populateSliderContent has been assigned to window:', typeof window.populateSliderContent);
	
});







