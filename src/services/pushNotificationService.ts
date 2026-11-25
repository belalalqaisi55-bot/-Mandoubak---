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
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notifOptions: NotificationOptions = {
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    dir: 'rtl',
    lang: 'ar',
    ...options,
  };

  const triggerWebFallback = () => {
    try {
      new Notification(title, notifOptions);
    } catch {
      // Ignore if browser blocks Notification constructor in favor of ServiceWorker
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration('/firebase-cloud-messaging-push-scope')
      .then((fcmReg) => {
        if (fcmReg && fcmReg.active) {
          return fcmReg.showNotification(title, notifOptions);
        }
        return Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 1200)),
        ]).then((registration) => registration.showNotification(title, notifOptions));
      })
      .catch(triggerWebFallback);
  } else {
    triggerWebFallback();
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

  if (Capacitor.getPlatform() === 'android') {
    try {
      await PushNotifications.createChannel({
        id: 'mandoubak_med_default',
        name: 'إشعارات مندوبك الطبي',
        description: 'التنبيهات الفورية للطلبيات والعروض والموافقات',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });
    } catch {
      // Ignore if channel already exists or OS version is < Android 8
    }
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
