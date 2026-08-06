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
      // Sprint 17 · ETAPA 2 — splash nativa reduzida (a Splash inteligente
      // React assume a identidade visual; total de abertura não aumenta).
      launchShowDuration: 1000,
      backgroundColor: '#050505',
      androidSplashResourceName: 'splash',
    },
    PushNotifications: {},
  },
};

export default config;
