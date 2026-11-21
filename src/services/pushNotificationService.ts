import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support push notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function showLocalNotification(title: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/icons/pwa-192x192.png',
          badge: '/icons/pwa-192x192.png',
          dir: 'rtl',
          lang: 'ar',
          ...options,
        });
      }).catch(() => {
        new Notification(title, {
          icon: '/icons/pwa-192x192.png',
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/icons/pwa-192x192.png',
        ...options,
      });
    }
  }
}

export async function initNativePushNotifications(
  onTokenReceived?: (token: string) => void,
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationAction?: (action: ActionPerformed) => void
): Promise<(() => Promise<void>) | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    return null;
  }

  const handles: PluginListenerHandle[] = [];

  handles.push(
    await PushNotifications.addListener('registration', (token) => {
      if (onTokenReceived && token?.value) {
        onTokenReceived(token.value);
      }
    })
  );

  handles.push(
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM registration error:', err);
    })
  );

  handles.push(
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    })
  );

  handles.push(
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action performed:', action);
      if (onNotificationAction) {
        onNotificationAction(action);
      }
    })
  );

  await PushNotifications.register();

  return async () => {
    await Promise.allSettled(handles.map((h) => h.remove()));
  };
}
