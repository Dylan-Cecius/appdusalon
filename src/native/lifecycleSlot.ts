interface Lifecycle { ready: Promise<void>; dispose(): Promise<void> }

/** Replacing a root must await the old owner's final stop before starting anew. */
export function createLifecycleSlot() {
  let releasePrevious = () => Promise.resolve();
  return {
    mount(factory: () => Lifecycle) {
      const previous = releasePrevious();
      let disposed = false;
      let owner: Lifecycle | undefined;
      let release: Promise<void> | undefined;
      const started = previous.then(() => { if (!disposed) owner = factory(); });
      const ready = started.then(() => owner?.ready);
      const dispose = () => {
        disposed = true;
        release ??= started.then(() => owner?.dispose()).then(() => {});
        return release;
      };
      releasePrevious = dispose;
      return { ready, dispose };
    },
  };
}
