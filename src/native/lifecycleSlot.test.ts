import { expect, it, vi } from 'vitest';
import { createLifecycleSlot } from './lifecycleSlot';

it('waits for the old final stop before mounting a replacement', async () => {
  const slot = createLifecycleSlot(); let finish!: () => void;
  const oldStop = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const old = slot.mount(() => ({ ready: Promise.resolve(), dispose: oldStop })); await old.ready;
  const nextFactory = vi.fn(() => ({ ready: Promise.resolve(), dispose: async () => {} }));
  const next = slot.mount(nextFactory); await Promise.resolve();
  expect(oldStop).toHaveBeenCalledTimes(1); expect(nextFactory).not.toHaveBeenCalled();
  finish(); await next.ready; expect(nextFactory).toHaveBeenCalledTimes(1); await next.dispose();
});

it('cancels a StrictMode mount before its factory starts', async () => {
  const slot = createLifecycleSlot(); const factory = vi.fn(() => ({ ready: Promise.resolve(), dispose: async () => {} }));
  const first = slot.mount(factory); const release = first.dispose(); await release; await first.ready;
  expect(factory).not.toHaveBeenCalled();
  const next = slot.mount(factory); await next.ready; expect(factory).toHaveBeenCalledTimes(1); await next.dispose();
});

it('can dispose while initialization waits, without waiting for ready', async () => {
  const slot = createLifecycleSlot(); let finish!: () => void;
  const dispose = vi.fn(async () => {});
  const owner = slot.mount(() => ({ ready: new Promise<void>(resolve => { finish = resolve; }), dispose }));
  await Promise.resolve(); await owner.dispose(); expect(dispose).toHaveBeenCalledTimes(1);
  finish(); await owner.ready; await owner.dispose(); expect(dispose).toHaveBeenCalledTimes(1);
});
