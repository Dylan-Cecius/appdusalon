/** Per-hook request ordering; never share this mutable scope between users/hooks. */
export function createLatestRequestScope() {
  let context: string | null = null;
  let revision = 0;
  let contextRevision = 0;
  return {
    setContext(next: string | null) {
      if (next !== context) { context = next; revision += 1; contextRevision += 1; }
    },
    invalidate() { revision += 1; contextRevision += 1; },
    captureContext(requestContext: string | null): () => boolean {
      const captured = contextRevision;
      return () => !!requestContext && requestContext === context && captured === contextRevision;
    },
    begin(requestContext: string | null): (() => boolean) | null {
      // An old callback must not supersede a request for the new salon.
      if (!requestContext || requestContext !== context) return null;
      const requestRevision = ++revision;
      return () => requestRevision === revision && requestContext === context;
    },
  };
}
