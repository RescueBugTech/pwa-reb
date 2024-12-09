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

  function populateSliderContent(tabId) {
    sliderTitle.textContent = tabId.replace('-', ' ');
    sliderContent.innerHTML = '';

    if (tabId === 'home') {
      const name = window.userName || 'User';
      const p = document.createElement('p');
      p.textContent = `Hello, ${name}. Select a tab to get started.`;
      sliderContent.appendChild(p);
    } else if (tabId === 'scissor-lifts') {
      const h3 = document.createElement('h3');
      h3.textContent = 'Scissor Lifts';
      sliderContent.appendChild(h3);
      const ul = document.createElement('ul');
      (window.scissorLiftsData || []).forEach(lift => {
        const li = document.createElement('li');
        if (lift.isBooked && lift.bookingInfo) {
          li.textContent = `${lift.name}: Booked by ${lift.bookingInfo.organizer} from ${lift.bookingInfo.start} to ${lift.bookingInfo.end}`;
        } else {
          li.textContent = `${lift.name}: Available`;
        }
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
        li.textContent = `${vehicle.name}: ${vehicle.status === 'available' ? 'Available' : 'Booked'}`;
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
