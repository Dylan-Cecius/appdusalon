import { Capacitor } from '@capacitor/core';
import { resolveNativeAuthConfiguration } from './authConfiguration';

// No configured callback or opt-in is shipped by the demo build.
export const nativeAuth = resolveNativeAuthConfiguration(
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios',
  import.meta.env.VITE_NATIVE_AUTH_ENABLED,
  import.meta.env.VITE_NATIVE_AUTH_REDIRECT_URL,
);
