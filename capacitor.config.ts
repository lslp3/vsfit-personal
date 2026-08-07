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
    // Sintaxe: o native plugin SystemBars (com.getcapacitor.plugin.SystemBars)
    // passa a NÃO injetar/sobrescrever as CSS vars de safe area
    // (--safe-area-inset-*) nem a escutar insets no WebView parent.
    // Com "disable", o ÚNICO escritor das vars vira o InsetsPlugin + safeArea.ts.
    // setStyle() (ícones DARK) e as APIs de StatusBar continuam funcionando.
    SystemBars: {
      insetsHandling: 'disable',
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
