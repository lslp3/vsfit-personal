import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vsfit.personal',
  appName: 'VSFit Personal',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#050505',
      androidSplashResourceName: 'splash',
    },
    PushNotifications: {},
  },
};

export default config;
