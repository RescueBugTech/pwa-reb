let deferredPrompt = null;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
const previouslyInstalled = localStorage.getItem('pwaInstalled');
const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

document.addEventListener('DOMContentLoaded', () => {
  if (isStandalone) {
    localStorage.setItem('pwaInstalled', 'true');
  }

  if (previouslyInstalled && !isStandalone) {
    showReminderBanner();
  }

  if (isIOS && !isStandalone && !previouslyInstalled) {
    showIOSInstructions();
  }
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isStandalone) {
    showInstallPrompt();
  }
});

function createBanner(id, innerHTML) {
  let banner = document.getElementById(id);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = id;
    banner.className = 'pwa-banner';
    banner.innerHTML = innerHTML;
    document.body.appendChild(banner);
  }
  return banner;
}

function removeBanner(id) {
  const banner = document.getElementById(id);
  if (banner) banner.remove();
}

function showInstallPrompt() {
  const banner = createBanner('install-banner', `
    <div class="pwa-banner-content">
      <p>Install this app for a better experience.</p>
      <div class="pwa-banner-actions">
        <button id="install-button">Install</button>
        <button id="dismiss-install">Not now</button>
      </div>
    </div>
  `);

  document.getElementById('install-button').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the installation prompt');
        removeBanner('install-banner');
      } else {
        console.log('User dismissed the installation prompt');
        removeBanner('install-banner');
      }
      deferredPrompt = null;
    }
  });

  document.getElementById('dismiss-install').addEventListener('click', () => {
    removeBanner('install-banner');
  });
}

function showReminderBanner() {
  const banner = createBanner('reminder-banner', `
    <div class="pwa-banner-content">
      <p>You have installed this PWA before. For the best experience, please open it from your home screen.</p>
      <div class="pwa-banner-actions">
        <button id="close-reminder">Close</button>
      </div>
    </div>
  `);

  document.getElementById('close-reminder').addEventListener('click', () => {
    removeBanner('reminder-banner');
  });
}

function showIOSInstructions() {
  const banner = createBanner('ios-banner', `
    <div class="pwa-banner-content">
      <p><strong>Add this app to your Home Screen:</strong><br>
      Tap the <span class="pwa-share-icon">[↑]</span> icon in Safari’s toolbar, then select "Add to Home Screen".</p>
      <div class="pwa-banner-actions">
        <button id="close-ios">Got it</button>
      </div>
    </div>
  `);

  document.getElementById('close-ios').addEventListener('click', () => {
    removeBanner('ios-banner');
  });
}
