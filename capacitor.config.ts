import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mandoubak.app',
  appName: 'مندوبك الطبي',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.run.app',
      'remix-remix-mandoubak-med-139332771047.europe-west2.run.app',
      'wired-sol-514110-i2.web.app',
      'wired-sol-514110-i2.firebaseapp.com',
      'ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app',
      'openrouter.ai',
      'generativelanguage.googleapis.com'
    ]
  }
};

export default config;
