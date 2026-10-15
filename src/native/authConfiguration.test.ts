import { describe, expect, it } from 'vitest';
import { resolveAuthRedirect, resolveNativeAuthConfiguration } from './authConfiguration';

const redirect = 'com.example.appdusalon.test://auth/callback';
describe('native auth opt-in', () => {
  it('requires iOS, an explicit flag and a valid destination', () => {
    expect(resolveNativeAuthConfiguration(true, 'true', redirect).enabled).toBe(true);
    for (const [ios, flag, url] of [[false, 'true', redirect], [true, true, redirect], [true, 'false', redirect], [true, 'true', undefined], [true, 'true', 'capacitor://localhost/auth']] as const) {
      expect(resolveNativeAuthConfiguration(ios, flag, url).enabled).toBe(false);
    }
  });
  it('never uses the bundled capacitor origin as an email return address', () => {
    const disabled = resolveNativeAuthConfiguration(true, undefined, undefined);
    expect(resolveAuthRedirect(disabled, 'capacitor://localhost', 'recovery')).toBeNull();
    const enabled = resolveNativeAuthConfiguration(true, 'true', redirect);
    expect(resolveAuthRedirect(enabled, 'capacitor://localhost', 'recovery')).toBe(redirect);
    expect(resolveAuthRedirect(enabled, 'capacitor://localhost', 'signup')).toBe(redirect);
  });
  it('preserves web routes and rejects invalid browser origins', () => {
    const web = resolveNativeAuthConfiguration(false, undefined, undefined);
    expect(resolveAuthRedirect(web, 'https://example.invalid', 'recovery')).toBe('https://example.invalid/auth');
    expect(resolveAuthRedirect(web, 'https://example.invalid', 'signup')).toBe('https://example.invalid/');
    expect(resolveAuthRedirect(web, 'null', 'recovery')).toBeNull();
    expect(resolveAuthRedirect(web, 'https://example.invalid/next', 'recovery')).toBeNull();
  });
});
