type AuthEvent = string;
interface SessionSource<T> {
  subscribe: (listener: (event: AuthEvent, session: T | null) => void) => () => void;
  readSession: () => Promise<T | null>;
  onSession: (session: T | null) => void;
  onReady: () => void;
  onError: () => void;
}

/** Coordinate restoration and live auth events without importing a backend. */
export function observeAuthSession<T>(source: SessionSource<T>): () => void {
  let active = true;
  let receivedEvent = false;
  let receivedLiveEvent = false;
  let ready = false;
  const publish = (session: T | null) => {
    if (!active) return;
    source.onSession(session);
    if (!ready) { ready = true; source.onReady(); }
  };
  const unsubscribe = source.subscribe((event, session) => {
    if (!active || (event === 'INITIAL_SESSION' && (receivedLiveEvent || ready))) return;
    receivedEvent = true;
    if (event !== 'INITIAL_SESSION') receivedLiveEvent = true;
    // SIGNED_OUT is authoritative even immediately after login/refresh.
    publish(event === 'SIGNED_OUT' ? null : session);
  });
  void Promise.resolve().then(() => active ? source.readSession() : null).then(session => {
    if (!receivedEvent) publish(session);
  }).catch(() => {
    if (!active || receivedEvent) return;
    source.onError();
    publish(null);
  });
  return () => { active = false; unsubscribe(); };
}
