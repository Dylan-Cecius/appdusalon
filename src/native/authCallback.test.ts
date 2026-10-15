import { describe, expect, it, vi } from 'vitest';
import { createNativeAuthCallbackHandler, parseNativeAuthCallback, validateNativeRedirect } from './authCallback';

// Test-only scheme; not an identifier registered with Apple or a backend.
const redirect = 'com.example.appdusalon.test://auth/callback';
const flowId = 'a'.repeat(32);
const link = (code = 'synthetic-code') => `${redirect}?code=${code}&flow=${flowId}`;

describe('native callback allowlist', () => {
  it('accepts only an explicit canonical HTTPS or reverse-DNS custom endpoint', () => {
    expect(validateNativeRedirect(redirect)).toBe(redirect);
    expect(validateNativeRedirect('https://example.invalid/auth/callback')).toBe('https://example.invalid/auth/callback');
  });
  it.each([undefined, '', 'http://example.invalid/auth', 'javascript:alert(1)', 'capacitor://localhost/auth',
    'file:///auth', 'https://user@example.invalid/auth', 'https://example.invalid:443/auth',
    'https://example.invalid/auth?next=anything', 'https://example.invalid/auth#callback',
    'https://example.invalid/a/../auth', 'https://example.invalid/%61uth', 'https://example.invalid//auth',
    ' https://example.invalid/auth'])('rejects invalid configuration %s', value => {
    expect(validateNativeRedirect(value)).toBeNull();
  });
  it('parses a PKCE code without extracting session tokens', () => {
    expect(parseNativeAuthCallback(link(), redirect)).toEqual({ kind: 'code', code: 'synthetic-code', flowId });
  });
  it.each([
    `${redirect}.evil?code=a`, 'com.example.other://auth/callback?code=a',
    'com.example.appdusalon.test://auth/callback/extra?code=a',
    'com.example.appdusalon.test://auth/a/../callback?code=a',
    'com.example.appdusalon.test://user@auth/callback?code=a',
    `${redirect}?code=`, `${redirect}?code=a&code=b`, `${redirect}?code=a&%63ode=b`,
    `${redirect}?code=a&type=recovery`, `${redirect}?code=a&next=https://example.invalid`,
    `${redirect}?code=a&access_token=b`, `${redirect}#access_token=a&refresh_token=b`,
    `${redirect}?code=a#`, `${redirect}?code=a%0A`, `${redirect}?code=a+b`,
    `${redirect}?code=a&error=denied`, ` ${link()}`, `${redirect}?code=${'a'.repeat(2049)}`,
  ])('rejects wrong destinations and ambiguous input %#', raw => {
    const withFlow = raw.includes('flow=') ? raw : raw.replace('?', `?flow=${flowId}&`);
    expect(parseNativeAuthCallback(withFlow, redirect)).toBeNull();
  });
  it.each(['', '&flow=short', '&flow=' + 'A'.repeat(32), '&flow=' + flowId + '&flow=' + flowId, '&flow=' + flowId + '&%66low=' + flowId])('rejects missing, invalid or duplicate correlation IDs %#', suffix => {
    expect(parseNativeAuthCallback(redirect + '?code=fixture' + suffix, redirect)).toBeNull();
  });
  it('reduces provider errors to a generic result', () => {
    expect(parseNativeAuthCallback(`${redirect}?flow=${flowId}&error=access_denied&error_description=private%20detail`, redirect)).toEqual({ kind: 'error', flowId });
  });
});

describe('native callback exchange ordering', () => {
  function fixture(exchange = vi.fn(async () => ({ authenticated: true, recovery: false }))) {
    const authenticated = vi.fn(), failed = vi.fn();
    return { exchange, authenticated, failed, handler: createNativeAuthCallbackHandler({ redirect, exchange, authenticated, failed }) };
  }
  it('ignores unrelated links without invoking an auth client', async () => {
    const f = fixture(); await f.handler.handle('https://example.invalid/');
    expect(f.exchange).not.toHaveBeenCalled(); expect(f.failed).not.toHaveBeenCalled();
  });
  it('deduplicates a launch URL and an event for the same code', async () => {
    const f = fixture(); await Promise.all([f.handler.handle(link()), f.handler.handle(link())]);
    await f.handler.handle(link()); expect(f.exchange).toHaveBeenCalledTimes(1);
    expect(f.authenticated).toHaveBeenCalledWith(false);
  });
  it('uses the exchange result, not an incoming type flag, to request recovery', async () => {
    const f = fixture(vi.fn(async () => ({ authenticated: true, recovery: true })));
    await f.handler.handle(link()); expect(f.authenticated).toHaveBeenCalledWith(true);
  });
  it('serializes distinct exchanges and suppresses queued/completed UI work after disposal', async () => {
    let resolve!: (result: { authenticated: boolean; recovery: boolean }) => void;
    const f = fixture(vi.fn(() => new Promise(result => { resolve = result; })));
    const first = f.handler.handle(link('first')); const second = f.handler.handle(link('second'));
    await Promise.resolve(); expect(f.exchange).toHaveBeenCalledTimes(1);
    f.handler.dispose(); resolve({ authenticated: true, recovery: false }); await Promise.all([first, second]);
    expect(f.exchange).toHaveBeenCalledTimes(1); expect(f.authenticated).not.toHaveBeenCalled();
    await f.handler.handle(link('third')); expect(f.exchange).toHaveBeenCalledTimes(1);
  });
  it('reports rejection generically and never automatically replays a failed code', async () => {
    const f = fixture(vi.fn(async () => { throw new Error('sensitive fixture'); }));
    await f.handler.handle(link()); await f.handler.handle(link());
    expect(f.failed).toHaveBeenCalledWith(); expect(f.exchange).toHaveBeenCalledTimes(1);
    expect(f.authenticated).not.toHaveBeenCalled();
  });
  it('bounds queued exchanges when a source floods distinct callbacks', async () => {
    let finish!: (result: { authenticated: boolean; recovery: boolean }) => void;
    const exchange = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValue({ authenticated: true, recovery: false });
    const f = fixture(exchange);
    const work = Array.from({ length: 20 }, (_, index) => f.handler.handle(link(`fixture-${index}`)));
    await Promise.resolve(); finish({ authenticated: true, recovery: false }); await Promise.all(work);
    expect(exchange).toHaveBeenCalledTimes(4);
    await f.handler.handle(link('later')); expect(exchange).toHaveBeenCalledTimes(5);
  });
  it('does not navigate after a response without an authenticated session', async () => {
    const f = fixture(vi.fn(async () => ({ authenticated: false, recovery: false })));
    await f.handler.handle(link()); expect(f.failed).toHaveBeenCalledTimes(1); expect(f.authenticated).not.toHaveBeenCalled();
  });
});
