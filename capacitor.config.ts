import type { CapacitorConfig } from '@capacitor/cli';

const target = process.env.APPDUSALON_MOBILE_TARGET;
if (target && target !== 'demo') {
  throw new Error('Unknown mobile target. Use the documented demo preparation command.');
}
const demo = target === 'demo';

const config: CapacitorConfig = {
  // Both IDs are local development identifiers; Apple registration is unverified.
  appId: 'app.lovable.bc4f1f063375468ea2e9bd0862a8c643' + (demo ? '.demo' : ''),
  appName: demo ? 'AppDuSalon Demo' : 'AppDuSalon V2',
  webDir: demo ? 'dist-mobile-demo' : 'dist',
  backgroundColor: '#f8fafc',
  ios: { path: demo ? 'ios-demo' : 'ios' },
  // The offline demo does not need native authentication plugins.
  ...(demo ? { includePlugins: [] } : {}),
};

export default config;
