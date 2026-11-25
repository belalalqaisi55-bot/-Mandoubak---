/* eslint-disable no-undef */
// Mandoubak Med - Firebase Cloud Messaging Service Worker (Background & Closed-App Push)
importScripts('https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD97gdVWpbS2NWTgvaqu4mEY9JQd0ZoAAM',
  authDomain: 'wired-sol-514110-i2.firebaseapp.com',
  projectId: 'wired-sol-514110-i2',
  storageBucket: 'wired-sol-514110-i2.firebasestorage.app',
  messagingSenderId: '139332771047',
  appId: '1:139332771047:web:1c6c9f7ffd54744e86d642',
  measurementId: 'G-8MQL3BMBKB',
});

const messaging = firebase.messaging();

// Ensure updated service worker activates immediately without waiting for all tabs to close
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle data-only background/closed-app push payloads.
// Note: If payload already carries a `notification` block, FCM's internal SW handler displays it automatically.
messaging.onBackgroundMessage((payload) => {
  if (payload && payload.notification) {
    return;
  }

  const data = (payload && payload.data) || {};
  const title = data.title || 'مندوبك الطبي - Mandoubak Med';
  const body = data.body || data.message || 'لديك تحديث جديد في الطلبيات أو الحسابات.';
  const tag = data.tag || data.notification_id || 'mandoubak-med-notification';
  const targetUrl = data.url || '/';

  const options = {
    body,
    icon: data.icon || '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    tag,
    renotify: true,
    requireInteraction: false,
    data: {
      ...data,
      url: targetUrl,
    },
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification && event.notification.data ? event.notification.data : {};
  const fcmMsgData = notifData.FCM_MSG && notifData.FCM_MSG.data ? notifData.FCM_MSG.data : {};
  const fcmLink =
    notifData.FCM_MSG && notifData.FCM_MSG.fcmOptions && notifData.FCM_MSG.fcmOptions.link
      ? notifData.FCM_MSG.fcmOptions.link
      : '';

  const rawUrl = notifData.url || fcmMsgData.url || fcmLink || '/';
  let targetUrl = '/';
  try {
    const resolved = new URL(rawUrl, self.location.origin);
    targetUrl = resolved.origin === self.location.origin ? resolved.href : self.location.origin + '/';
  } catch {
    targetUrl = self.location.origin + '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            client.postMessage({
              type: 'FCM_NOTIFICATION_CLICK',
              url: targetUrl,
              data: { ...fcmMsgData, ...notifData },
            });
          } catch {
            // Ignore postMessage issues on legacy clients
          }
          if ('navigate' in client && rawUrl && rawUrl !== '/' && client.url !== targetUrl) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
