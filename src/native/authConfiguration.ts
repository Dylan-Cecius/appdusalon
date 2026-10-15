import { validateNativeRedirect } from './authCallback';

export function resolveNativeAuthConfiguration(nativeIOS: boolean, enabled: unknown, redirect: unknown) {
  const callback = nativeIOS && enabled === 'true' ? validateNativeRedirect(redirect) : null;
  return { nativeIOS, enabled: callback !== null, redirect: callback };
}

export function resolveAuthRedirect(config: ReturnType<typeof resolveNativeAuthConfiguration>, origin: string, purpose: 'signup' | 'recovery'): string | null {
  if (config.nativeIOS) return config.redirect;
  try {
    const base = new URL(origin);
    if (!['https:', 'http:'].includes(base.protocol) || base.origin !== origin) return null;
    return `${origin}${purpose === 'recovery' ? '/auth' : '/'}`;
  } catch { return null; }
}
