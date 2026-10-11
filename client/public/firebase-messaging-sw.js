/* eslint-disable no-restricted-globals */
// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
const firebaseConfig = {
  apiKey: 'AIzaSyAI9YZWIn1zSGy1-WndSNDrz_RB003RE6k',
  authDomain: 'tech-share-80539.firebaseapp.com',
  projectId: 'tech-share-80539',
  storageBucket: 'tech-share-80539.firebasestorage.app',
  messagingSenderId: '215197206890',
  appId: '1:215197206890:web:645a4a4fe0136ff6f4bd13',
  measurementId: 'G-WEJH0576JW',
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'TechShare';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới.',
    icon: payload.notification?.icon || '/assets/logo.svg',
    badge: '/assets/logo.svg',
    tag: payload.data?.notificationId || 'techshare-notification',
    data: {
      url: payload.data?.url || (payload.data?.relatedId ? `/devices/${payload.data.relatedId}` : '/'),
      ...payload.data,
    },
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Xử lý khi người dùng nhấn vào thông báo nền
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Nếu đã có tab đang mở, focus vào tab đó và điều hướng
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Nếu chưa có tab nào mở, mở cửa sổ mới
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

