import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tatayotter.learninghall',
  appName: 'Learning Hall',
  webDir: 'www',
  server: {
    url: 'https://learninghall.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      // Show notifications while the app is open too. Without this, Android
      // only shows them when the app is in the background.
      presentationOptions: ['alert', 'sound'],
    },
  },
};

export default config;
