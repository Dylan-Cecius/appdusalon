import { describe, expect, it, vi } from 'vitest';
import { observeAuthSession } from './observeAuthSession';

type Session = { userId: string; token: string };
const first = { userId: 'synthetic-a', token: 'fixture-token-1' };
const refreshed = { userId: 'synthetic-a', token: 'fixture-token-2' };
const other = { userId: 'synthetic-b', token: 'fixture-token-3' };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function fixture() {
  let resolve!: (session: Session | null) => void;
  let reject!: (error: Error) => void;
  const pending = new Promise<Session | null>((yes, no) => { resolve = yes; reject = no; });
  let emit!: (event: string, session: Session | null) => void;
  const onSession = vi.fn(), onReady = vi.fn(), onError = vi.fn(), unsubscribe = vi.fn();
  const stop = observeAuthSession<Session>({
    subscribe(listener) { emit = listener; return unsubscribe; },
    readSession: () => pending, onSession, onReady, onError,
  });
  return { resolve, reject, emit, onSession, onReady, onError, unsubscribe, stop };
}

describe('session restoration and live auth events', () => {
  it('restores a persisted session and publishes a refreshed token for the same user', async () => {
    const f = fixture(); f.resolve(first); await tick();
    expect(f.onSession).toHaveBeenLastCalledWith(first);
    f.emit('TOKEN_REFRESHED', refreshed);
    expect(f.onSession).toHaveBeenLastCalledWith(refreshed);
    expect(f.onReady).toHaveBeenCalledTimes(1); f.stop();
  });
  it('clears a session immediately on sign out and ignores a late restoration', async () => {
    const f = fixture(); f.emit('SIGNED_IN', first); f.emit('SIGNED_OUT', null);
    f.resolve(first); await tick();
    expect(f.onSession.mock.calls.map(call => call[0])).toEqual([first, null]);
    f.emit('INITIAL_SESSION', first);
    expect(f.onSession).toHaveBeenLastCalledWith(null); f.stop();
  });
  it('does not overwrite a newer login with an older getSession result', async () => {
    const f = fixture(); f.emit('SIGNED_IN', other); f.resolve(first); await tick();
    expect(f.onSession).toHaveBeenCalledTimes(1);
    expect(f.onSession).toHaveBeenLastCalledWith(other); f.stop();
  });
  it('uses INITIAL_SESSION when received before the separate restoration', async () => {
    const f = fixture(); f.emit('INITIAL_SESSION', refreshed); f.resolve(first); await tick();
    expect(f.onSession).toHaveBeenCalledTimes(1);
    expect(f.onSession).toHaveBeenLastCalledWith(refreshed); f.stop();
  });
  it('settles loading after a rejected restoration without leaking its error payload', async () => {
    const f = fixture(); f.reject(new Error('synthetic sensitive payload')); await tick();
    expect(f.onError).toHaveBeenCalledWith();
    expect(f.onSession).toHaveBeenLastCalledWith(null);
    expect(f.onReady).toHaveBeenCalledTimes(1); f.stop();
  });
  it('keeps an authoritative session when an obsolete restoration fails', async () => {
    const f = fixture(); f.emit('SIGNED_IN', first); f.reject(new Error('offline')); await tick();
    expect(f.onSession).toHaveBeenCalledTimes(1); expect(f.onError).not.toHaveBeenCalled(); f.stop();
  });
  it('ignores late work after unmount without affecting a fresh observer', async () => {
    const old = fixture(); await tick(); old.stop();
    const fresh = fixture(); fresh.resolve(other); old.resolve(first); old.emit('SIGNED_OUT', null); await tick();
    expect(old.onSession).not.toHaveBeenCalled(); expect(old.onReady).not.toHaveBeenCalled();
    expect(old.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fresh.onSession).toHaveBeenLastCalledWith(other); fresh.stop();
  });
});
