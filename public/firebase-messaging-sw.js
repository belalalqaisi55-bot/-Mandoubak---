importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD97gdVWpbS2NWTgvaqu4mEY9JQd0ZoAAM",
  authDomain: "wired-sol-514110-i2.firebaseapp.com",
  projectId: "wired-sol-514110-i2",
  storageBucket: "wired-sol-514110-i2.firebasestorage.app",
  messagingSenderId: "139332771047",
  appId: "1:139332771047:web:ab4a14ad0f4c7a0786d642"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    (payload && payload.notification && payload.notification.title) ||
    (payload && payload.data && payload.data.title) ||
    "مندوبك الطبي";
  const notificationBody =
    (payload && payload.notification && payload.notification.body) ||
    (payload && payload.data && payload.data.body) ||
    "لديك إشعار جديد من منصة مندوبك الطبي";

  const notificationOptions = {
    body: notificationBody,
    icon: "/icons/pwa-192x192.png",
    badge: "/icons/pwa-192x192.png",
    dir: "rtl",
    lang: "ar",
    vibrate: [200, 100, 200],
    data: (payload && payload.data) || { url: "/" }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
