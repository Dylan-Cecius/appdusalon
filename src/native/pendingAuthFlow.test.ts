import { describe, expect, it, vi } from 'vitest';
import { createPendingAuthFlow, requestNativeEmailAuth } from './pendingAuthFlow';
import { createNativeAuthCallbackHandler } from './authCallback';

const redirect = 'com.example.appdusalon.test://auth/callback';
const first = 'a'.repeat(32), second = 'b'.repeat(32);
function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn((key: string) => { values.delete(key); }),
  };
  let time = 1000, id = first;
  const make = () => createPendingAuthFlow(() => storage, () => time, () => id);
  return { values, storage, make, flow: make(), time: (value: number) => { time = value; }, id: (value: string) => { id = value; } };
}

describe('pending native email flow', () => {
  it('persists only correlation metadata and consumes it once across reloads', () => {
    const f = fixture();
    expect(f.flow.begin('recovery', redirect)).toEqual({ id: first, redirectTo: `${redirect}?flow=${first}` });
    expect(JSON.parse([...f.values.values()][0])).toEqual({ id: first, purpose: 'recovery', createdAt: 1000 });
    expect(f.make().consume(first)?.purpose).toBe('recovery');
    expect(f.flow.isPending(first)).toBe(false); expect(f.make().consume(first)).toBeNull();
  });
  it('never lets an older callback consume or cancel a newer request', () => {
    const f = fixture(); f.flow.begin('signup', redirect); f.id(second); f.flow.begin('recovery', redirect);
    expect(f.flow.consume(first)).toBeNull(); f.flow.cancel(first);
    expect(f.flow.isPending(second)).toBe(true);
  });
  it.each([1000 + 60 * 60 * 1000 + 1, 999])('rejects an expired or future record at %s', time => {
    const f = fixture(); f.flow.begin('signup', redirect); f.time(time);
    expect(f.flow.isPending(first)).toBe(false); expect(f.flow.consume(first)).toBeNull();
  });
  it.each(['broken', 'null', '{"id":"bad"}', JSON.stringify({ id: first, purpose: 'oauth', createdAt: 1000 }), JSON.stringify({ id: first, purpose: 'signup', createdAt: '1000' })])('rejects malformed stored data %#', value => {
    const f = fixture(); f.flow.begin('signup', redirect); f.values.set([...f.values.keys()][0], value);
    expect(f.flow.consume(first)).toBeNull();
  });
  it('fails closed when storage is inaccessible or randomness fails', () => {
    const flow = createPendingAuthFlow(() => { throw new Error('blocked'); }, Date.now, () => first);
    expect(flow.begin('signup', redirect)).toBeNull(); expect(flow.consume(first)).toBeNull();
    const f = fixture(); f.id('invalid'); expect(f.flow.begin('signup', redirect)).toBeNull();
    expect(createPendingAuthFlow(() => f.storage, Date.now, () => { throw new Error('unavailable'); }).begin('signup', redirect)).toBeNull();
  });
  it('requires successful persistence and removal before accepting a return', () => {
    const f = fixture(); f.storage.setItem.mockImplementationOnce(() => {});
    expect(f.flow.begin('signup', redirect)).toBeNull();
    f.flow.begin('signup', redirect); f.storage.removeItem.mockImplementationOnce(() => {});
    expect(f.flow.consume(first)).toBeNull();
    f.storage.removeItem.mockImplementationOnce(() => { throw new Error('denied'); });
    expect(f.flow.consume(first)).toBeNull();
  });
  it('rejects an unconfigured redirect before touching storage', () => {
    const f = fixture(); expect(f.flow.begin('signup', 'capacitor://localhost')).toBeNull();
    expect(f.storage.setItem).not.toHaveBeenCalled();
  });
});

describe('email request correlation', () => {
  it('keeps an accepted request and supplies the correlated redirect', async () => {
    const f = fixture(), request = vi.fn(async () => ({ error: null }));
    await requestNativeEmailAuth({ flow: f.flow, purpose: 'recovery', redirect, request });
    expect(request).toHaveBeenCalledWith(`${redirect}?flow=${first}`); expect(f.flow.isPending(first)).toBe(true);
  });
  it.each(['returned', 'thrown'])('cancels a %s request failure', async kind => {
    const f = fixture();
    await requestNativeEmailAuth({ flow: f.flow, purpose: 'signup', redirect, request: async () => {
      if (kind === 'thrown') throw new Error('fixture'); return { error: new Error('fixture') };
    } }).catch(() => {});
    expect(f.flow.isPending(first)).toBe(false);
  });
  it('does not send a request when persistence failed', async () => {
    const f = fixture(), request = vi.fn(async () => ({ error: null })); f.storage.setItem.mockImplementation(() => { throw new Error('denied'); });
    await expect(requestNativeEmailAuth({ flow: f.flow, purpose: 'signup', redirect, request })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('does not cancel a newer request when an earlier request fails late', async () => {
    const f = fixture(); let finish!: (result: { error: Error }) => void;
    const work = requestNativeEmailAuth({ flow: f.flow, purpose: 'signup', redirect, request: () => new Promise<{ error: Error }>(resolve => { finish = resolve; }) });
    f.id(second); f.flow.begin('recovery', redirect); finish({ error: new Error('fixture') }); await work;
    expect(f.flow.isPending(second)).toBe(true);
  });
  it('ignores stale, rejected and replayed callbacks, even with a fresh handler', async () => {
    const f = fixture(), sdk = vi.fn(async () => ({ authenticated: true, recovery: false })), failed = vi.fn();
    const make = () => createNativeAuthCallbackHandler({ redirect, isPending: f.flow.isPending, rejected: f.flow.cancel,
      exchange: async (code, flowId) => { const pending = f.flow.consume(flowId); return pending ? sdk() : { authenticated: false, recovery: false, ignored: true }; },
      authenticated: vi.fn(), failed,
    });
    const link = (id: string) => `${redirect}?flow=${id}&code=synthetic`;
    f.flow.begin('signup', redirect); await make().handle(link(second)); expect(sdk).not.toHaveBeenCalled();
    await make().handle(link(first)); await make().handle(link(first)); expect(sdk).toHaveBeenCalledTimes(1);
    f.id(second); f.flow.begin('recovery', redirect);
    await make().handle(`${redirect}?flow=${second}&error=denied`); await make().handle(link(second));
    expect(sdk).toHaveBeenCalledTimes(1); expect(failed).toHaveBeenCalledTimes(1);
  });
});
