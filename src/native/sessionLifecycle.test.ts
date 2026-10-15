import { describe, expect, it, vi } from 'vitest';
import { installNativeSessionLifecycle, type NativeActivitySource } from './sessionLifecycle';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function fixture(initial = true) {
  let emit!: (state: { isActive: boolean }) => void;
  const remove = vi.fn(async () => {});
  const app = { addListener: vi.fn(async (_event: 'appStateChange', listener: typeof emit): Promise<{ remove(): Promise<void> }> => { emit = listener; return { remove }; }), getState: vi.fn(async () => ({ isActive: initial })) };
  const auth = { initialize: vi.fn(async () => {}), startAutoRefresh: vi.fn(async () => {}), stopAutoRefresh: vi.fn(async () => {}) };
  const failed = vi.fn();
  return { app, auth, failed, remove, emit: (isActive: boolean) => emit({ isActive }), install: () => installNativeSessionLifecycle({ app, auth, failed }) };
}

describe('native session refresh ownership', () => {
  it('waits for initialization, takes ownership and refreshes only while active', async () => {
    const f = fixture(); const c = f.install(); await c.ready;
    expect(f.auth.initialize.mock.invocationCallOrder[0]).toBeLessThan(f.auth.stopAutoRefresh.mock.invocationCallOrder[0]);
    expect(f.auth.stopAutoRefresh.mock.invocationCallOrder[0]).toBeLessThan(f.auth.startAutoRefresh.mock.invocationCallOrder[0]);
    f.emit(false); await c.settled(); expect(f.auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
    f.emit(true); await c.settled(); expect(f.auth.startAutoRefresh).toHaveBeenCalledTimes(2);
    await c.dispose(); expect(f.auth.stopAutoRefresh).toHaveBeenCalledTimes(3); expect(f.remove).toHaveBeenCalledTimes(1);
  });
  it('does not start in the background or repeat identical states', async () => {
    const f = fixture(false); const c = f.install(); await c.ready;
    f.emit(false); f.emit(false); await c.settled(); expect(f.auth.startAutoRefresh).not.toHaveBeenCalled();
    expect(f.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    f.emit(true); f.emit(true); await c.settled(); expect(f.auth.startAutoRefresh).toHaveBeenCalledTimes(1); await c.dispose();
  });
  it('keeps the latest event when getState resolves an outdated active state', async () => {
    const f = fixture(); let resolve!: (state: { isActive: boolean }) => void;
    f.app.getState.mockImplementation(() => new Promise(done => { resolve = done; }));
    const c = f.install(); await tick(); f.emit(false); resolve({ isActive: true }); await c.ready;
    expect(f.auth.startAutoRefresh).not.toHaveBeenCalled(); await c.dispose();
  });
  it('serializes a background event behind an unfinished start', async () => {
    const f = fixture(); let finish!: () => void;
    f.auth.startAutoRefresh.mockImplementation(() => new Promise(done => { finish = done; }));
    const c = f.install(); await tick(); f.emit(false);
    expect(f.auth.stopAutoRefresh).toHaveBeenCalledTimes(1);
    finish(); await c.ready; await c.settled(); expect(f.auth.stopAutoRefresh).toHaveBeenCalledTimes(2); await c.dispose();
  });
  it('stops after an unfinished start when disposed and ignores later events', async () => {
    const f = fixture(); let finish!: () => void;
    f.auth.startAutoRefresh.mockImplementation(() => new Promise(done => { finish = done; }));
    const c = f.install(); await tick(); const stopped = c.dispose(); finish(); await stopped; await c.ready;
    f.emit(true); await c.settled(); expect(f.auth.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(f.auth.stopAutoRefresh).toHaveBeenCalledTimes(2); await c.dispose(); expect(f.remove).toHaveBeenCalledTimes(1);
  });
  it('cleans a late listener without starting auth after unmount', async () => {
    const f = fixture(); let registered!: (handle: { remove(): Promise<void> }) => void;
    f.app.addListener.mockImplementation(() => new Promise(done => { registered = done; }));
    const c = f.install(); await tick(); await c.dispose(); registered({ remove: f.remove }); await c.ready;
    expect(f.remove).toHaveBeenCalledTimes(1); expect(f.auth.initialize).not.toHaveBeenCalled();
  });
  it('reports an unavailable state and remains stopped', async () => {
    const f = fixture(); f.app.getState.mockRejectedValue(new Error('sensitive fixture'));
    const c = f.install(); await c.ready; expect(f.failed).toHaveBeenCalledWith();
    expect(f.auth.startAutoRefresh).not.toHaveBeenCalled(); await c.dispose();
  });
  it('can retry a failed transition on the next event without a rejected background promise', async () => {
    const f = fixture(); f.auth.startAutoRefresh.mockRejectedValueOnce(new Error('fixture'));
    const c = f.install(); await c.ready; expect(f.failed).toHaveBeenCalledTimes(1);
    f.emit(true); await c.settled(); expect(f.auth.startAutoRefresh).toHaveBeenCalledTimes(2); await c.dispose();
  });
  it('does not create a second refresh owner when stopping the SDK owner fails', async () => {
    const f = fixture(); f.auth.stopAutoRefresh.mockRejectedValueOnce(new Error('fixture'));
    const c = f.install(); await c.ready; f.emit(true); f.emit(false); f.emit(true); await c.settled();
    expect(f.failed).toHaveBeenCalledTimes(1); expect(f.auth.startAutoRefresh).not.toHaveBeenCalled(); await c.dispose();
  });
});
