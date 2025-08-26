import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bc4f1f063375468ea2e9bd0862a8c643',
  appName: 'coiff-cash-pro',
  webDir: 'dist',
  server: {
    url: 'https://bc4f1f06-3375-468e-a2e9-bd0862a8c643.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;