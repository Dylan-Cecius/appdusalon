import { describe, expect, it } from 'vitest';
import { createLatestRequestScope } from './latestRequestScope';

describe('agenda request scope', () => {
  it('prevents a slow refresh from replacing a newer response or its error/loading state', () => {
    const scope = createLatestRequestScope(); scope.setContext('user:salon');
    const first = scope.begin('user:salon')!;
    const second = scope.begin('user:salon')!;
    expect(second()).toBe(true);
    expect(first()).toBe(false);
    scope.setContext('user:salon');
    expect(second()).toBe(true);
  });
  it('invalidates the previous salon even when the user stays the same', () => {
    const scope = createLatestRequestScope(); scope.setContext('user:salon-a');
    const old = scope.begin('user:salon-a')!;
    scope.setContext('user:salon-b');
    const current = scope.begin('user:salon-b')!;
    expect(old()).toBe(false);
    expect(scope.begin('user:salon-a')).toBeNull();
    expect(current()).toBe(true);
  });
  it('invalidates requests on logout, unmount and return to the same salon', () => {
    const scope = createLatestRequestScope(); scope.setContext('user:salon');
    const old = scope.begin('user:salon')!;
    scope.setContext(null);
    expect(scope.begin(null)).toBeNull();
    scope.setContext('user:salon');
    expect(old()).toBe(false);
    const current = scope.begin('user:salon')!;
    scope.invalidate();
    expect(current()).toBe(false);
    expect(scope.begin('user:salon')!()).toBe(true);
  });
  it('lets mutation confirmations survive refreshes but rejects a previous login session', () => {
    const scope = createLatestRequestScope(); scope.setContext('user:salon');
    const mutation = scope.captureContext('user:salon');
    scope.begin('user:salon'); scope.begin('user:salon');
    expect(mutation()).toBe(true);
    scope.setContext(null); scope.setContext('user:salon');
    expect(mutation()).toBe(false);
    const next = scope.captureContext('user:salon');
    scope.invalidate();
    expect(next()).toBe(false);
  });
  it('keeps two hook instances independent', () => {
    const a = createLatestRequestScope(), b = createLatestRequestScope();
    a.setContext('user:salon'); b.setContext('user:salon');
    const check = a.begin('user:salon')!;
    b.begin('user:salon'); b.invalidate();
    expect(check()).toBe(true);
  });
});
