import type { CapacitorConfig } from '@capacitor/cli';

// L'app embarque le site compilé (dossier dist) : pas d'URL distante.
const config: CapacitorConfig = {
  appId: 'com.appdusalon.app',
  appName: "L'app du salon",
  webDir: 'dist',
  backgroundColor: '#17132B',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#17132B',
      showSpinner: false
    }
  }
};

export default config;
