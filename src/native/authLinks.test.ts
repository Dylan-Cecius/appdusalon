import { describe, expect, it, vi } from 'vitest';
import { installNativeAuthLinks, type NativeLinkSource } from './authLinks';

const redirect = 'com.example.appdusalon.test://auth/callback';
const flowId = 'a'.repeat(32);
const link = (code: string) => `${redirect}?code=${code}&flow=${flowId}`;
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function fixture(getLaunchUrl: NativeLinkSource['getLaunchUrl'] = async () => ({ url: link('cold') }), isPending?: (id: string) => boolean) {
  let emit!: (event: { url: string }) => void;
  const remove = vi.fn(async () => {}), exchange = vi.fn(async () => ({ authenticated: true, recovery: false }));
  const authenticated = vi.fn(), failed = vi.fn();
  const app = { addListener: vi.fn(async (_event: 'appUrlOpen', listener: typeof emit) => { emit = listener; return { remove }; }), getLaunchUrl: vi.fn(getLaunchUrl) };
  const controller = installNativeAuthLinks({ app, redirect, exchange, authenticated, failed, isPending });
  return { controller, app, exchange, authenticated, failed, remove, emit: (url: string) => emit({ url }) };
}

describe('native launch and URL listeners', () => {
  it('installs the listener before reading the cold-start URL', async () => {
    const f = fixture(); await f.controller.ready;
    expect(f.app.addListener.mock.invocationCallOrder[0]).toBeLessThan(f.app.getLaunchUrl.mock.invocationCallOrder[0]);
    expect(f.exchange).toHaveBeenCalledWith('cold', flowId);
    f.emit(link('cold')); await tick(); expect(f.exchange).toHaveBeenCalledTimes(1);
    f.emit(link('warm')); await tick(); expect(f.exchange).toHaveBeenCalledWith('warm', flowId); f.controller.dispose();
  });
  it('keeps a new warm link when an older launch result resolves later', async () => {
    let resolve!: (value: { url: string }) => void;
    const f = fixture(() => new Promise(done => { resolve = done; })); await tick();
    f.emit(link('new')); resolve({ url: link('old') }); await f.controller.ready; await tick();
    expect(f.exchange.mock.calls).toEqual([['new', flowId]]); f.controller.dispose();
  });
  it('does not let an unrelated incoming link discard the pending auth callback', async () => {
    let resolve!: (value: { url: string }) => void;
    const f = fixture(() => new Promise(done => { resolve = done; })); await tick();
    f.emit('https://example.invalid/unrelated'); resolve({ url: link('cold') }); await f.controller.ready;
    expect(f.exchange).toHaveBeenCalledWith('cold', flowId); f.controller.dispose();
  });
  it('does not let an obsolete flow discard the current cold-start callback', async () => {
    let resolve!: (value: { url: string }) => void;
    const f = fixture(() => new Promise(done => { resolve = done; }), id => id === flowId); await tick();
    f.emit(link('old').replace(flowId, 'b'.repeat(32)));
    resolve({ url: link('cold') }); await f.controller.ready;
    expect(f.exchange.mock.calls).toEqual([['cold', flowId]]); f.controller.dispose();
  });
  it('removes a listener registered after teardown without reading or exchanging a launch URL', async () => {
    let registered!: (value: { remove(): Promise<void> }) => void;
    const remove = vi.fn(async () => {}), getLaunchUrl = vi.fn(async () => undefined), exchange = vi.fn();
    const app: NativeLinkSource = { addListener: () => new Promise(done => { registered = done; }), getLaunchUrl };
    const c = installNativeAuthLinks({ app, redirect, exchange, authenticated: vi.fn(), failed: vi.fn() });
    await tick(); c.dispose(); registered({ remove }); await c.ready;
    expect(remove).toHaveBeenCalledTimes(1); expect(getLaunchUrl).not.toHaveBeenCalled(); expect(exchange).not.toHaveBeenCalled();
  });
  it('ignores launch results and events after disposal, with idempotent cleanup', async () => {
    let resolve!: (value: { url: string }) => void;
    const f = fixture(() => new Promise(done => { resolve = done; })); await tick();
    f.controller.dispose(); f.controller.dispose(); f.emit(link('late')); resolve({ url: link('cold') }); await f.controller.ready;
    expect(f.remove).toHaveBeenCalledTimes(1); expect(f.exchange).not.toHaveBeenCalled();
  });
  it('handles plugin failure without exposing its message', async () => {
    const f = fixture(async () => { throw new Error('sensitive fixture'); }); await f.controller.ready;
    expect(f.failed).toHaveBeenCalledWith(); expect(f.exchange).not.toHaveBeenCalled(); f.controller.dispose();
  });
});
