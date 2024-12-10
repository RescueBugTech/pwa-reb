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
    sliderTitle.textContent = tabId.replace('-', ' ');
    sliderContent.innerHTML = '';

    if (tabId === 'home') {
      const name = window.userName || 'User';
      const p = document.createElement('p');
      p.textContent = `Hello, ${name}. Select a tab to get started.`;
      sliderContent.appendChild(p);

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
    li.classList.add('resource-item');

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

    // Create a toggle section for additional actions
    // This container will hold the extra controls and is initially hidden
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'resource-details';
    // Initially hidden. You can manage show/hide with CSS classes.
    
    // BOOK BUTTON
    const bookButton = document.createElement('button');
    bookButton.textContent = 'Book this asset';
    if (lift.isBooked) {
      // If already booked by someone else, disable
      bookButton.disabled = true;
    } else {
      // Available to book
      bookButton.addEventListener('click', async () => {
	    e.stopPropagation(); // <-- Add this line
        await window.bookResource(lift.id);
        await window.refreshResources();
        populateSliderContent('scissor-lifts');
      });
    }
    detailsContainer.appendChild(bookButton);

    // CANCEL BUTTON
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel your booking';
    if (lift.isBooked && lift.bookingInfo.organizer === window.userName) {
      // User booked this lift, allow cancel
      cancelButton.disabled = false;
      cancelButton.addEventListener('click', async () => {
    	e.stopPropagation(); // <-- Add this line
        await window.cancelBooking(lift.id);
        await window.refreshResources();
        populateSliderContent('scissor-lifts');
      });
    } else {
      // Not booked by current user; disable
      cancelButton.disabled = true;
    }
    detailsContainer.appendChild(cancelButton);

    // NOTIFY ME CHECKBOX
    // Only meaningful if currently booked by someone else. If available, no need for notifications.
    const notifyLabel = document.createElement('label');
    notifyLabel.textContent = 'Notify me when available';

    const notifyCheckbox = document.createElement('input');
    notifyCheckbox.type = 'checkbox';

    // If the item is currently booked by someone else, user may want notification
    if (lift.isBooked && lift.bookingInfo.organizer !== window.userName) {
      notifyCheckbox.disabled = false;
      // On change, record user’s preference
      notifyCheckbox.addEventListener('change', async (e) => {
    	e.stopPropagation(); // <-- Add this line
        await window.toggleNotify(lift.id, e.target.checked);
      });
    } else {
      // If it's available or booked by the user, no need to notify
      notifyCheckbox.disabled = true;
    }

    notifyLabel.prepend(notifyCheckbox);
    detailsContainer.appendChild(notifyLabel);

    li.appendChild(detailsContainer);

    // Add a click event to toggle visibility of detailsContainer
    li.addEventListener('click', (e) => {
      // Avoid triggering on button clicks inside the container
      // If you want, you can check if (e.target === li) or add a specific "expand" icon
      li.classList.toggle('expanded'); 
      // .expanded can be a CSS class that shows detailsContainer
    });

    ul.appendChild(li);
  });

  sliderContent.appendChild(ul);
}

 else if (tabId === 'vehicles') {
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
      p2.textContent = 'Version: 1.0.0';
      sliderContent.appendChild(p2);

      const p3 = document.createElement('p');
      p3.textContent = '© 2023 Your Company Name';
      sliderContent.appendChild(p3);

      const upcomingTitle = document.createElement('h4');
      upcomingTitle.textContent = 'Upcoming Plans:';
      sliderContent.appendChild(upcomingTitle);

      const ul = document.createElement('ul');
      const plans = ['Add R&D Vehicles', 'Ability to book from the app', 'Push alerts for availability', 'Improve visuals'];
      plans.forEach(plan => {
        const li = document.createElement('li');
        li.textContent = plan;
        ul.appendChild(li);
      });
      sliderContent.appendChild(ul);
    }
  }
});
