// service-worker.js
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});

// Add push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json(); // Expecting push data in JSON format
    console.log('Push event received:', data);

    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || 'eyecons/icon-512x512.png',
      badge: data.badge || 'eyecons/icon-512x512.png',
      actions: data.actions || [], // Add custom actions if any
      tag: data.tag || 'general-notification', // A unique identifier for the notification
      requireInteraction: data.requireInteraction || false, // Forces user interaction before dismissal
    });
  } else {
    console.warn('Push event received with no data.');
  }
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event.notification);

  event.notification.close();

  // Focus or open the app when the notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
