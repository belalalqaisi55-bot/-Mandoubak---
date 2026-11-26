import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mandoubak.app',
  appName: 'مندوبك الطبي',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      '*.run.app',
      'remix-remix-mandoubak-med-139332771047.europe-west2.run.app',
      'wired-sol-514110-i2.web.app',
      'wired-sol-514110-i2.firebaseapp.com',
      'ais-pre-oqwx6mdzcwvrhadryzbxjt-13849160368.europe-west1.run.app',
      'mandoubak-med-1.vercel.app',
      'mandoubak-med-1-belalalqaisi55-afks-projects.vercel.app',
      '*.vercel.app',
      'openrouter.ai',
      'generativelanguage.googleapis.com'
    ]
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f766e',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f766e'
    }
  }
};

export default config;
