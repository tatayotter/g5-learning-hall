import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tatayotter.g5learninghall',
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
};

export default config;
