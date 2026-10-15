export type NativeAuthCallback = { kind: 'code'; code: string; flowId: string } | { kind: 'error'; flowId: string };

/** No default: this is an explicit allowlist entry, not an Apple registration. */
export function validateNativeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 1024 || /[\s\\%]/.test(value)) return null;
  try {
    const url = new URL(value);
    const customScheme = /^[a-z][a-z0-9+-]*(?:\.[a-z0-9+-]+)+:$/.test(url.protocol);
    if (url.protocol !== 'https:' && !customScheme) return null;
    if (!url.hostname || url.username || url.password || url.port || url.search || url.hash) return null;
    if (!/^\/[a-zA-Z0-9/_-]+$/.test(url.pathname) || url.pathname.includes('//')) return null;
    // Reject normalization tricks (dot segments, empty ports, altered authority).
    return url.href === value ? value : null;
  } catch { return null; }
}

function isProviderError(params: URLSearchParams): boolean {
  const keys = [...params.keys()];
  return new Set(keys).size === keys.length && !!params.get('error')
    && keys.every(key => ['error', 'error_code', 'error_description'].includes(key));
}

/** Only PKCE codes and generic errors are accepted. Never install URL bearer tokens. */
export function parseNativeAuthCallback(raw: unknown, redirect: string): NativeAuthCallback | null {
  if (!validateNativeRedirect(redirect) || typeof raw !== 'string' || raw.length > 4096 || /[\s\\]/.test(raw)) return null;
  if (!raw.startsWith(`${redirect}?`)) return null;
  try {
    const url = new URL(raw);
    const keys = [...url.searchParams.keys()];
    if (new Set(keys).size !== keys.length) return null;
    const flowId = url.searchParams.get('flow');
    if (!flowId || !/^[a-f0-9]{32}$/.test(flowId)) return null;
    if (raw.includes('#')) {
      // Supabase errors may use fragments. Only the local flow ID belongs in
      // the query; mixed code/error/token payloads must never reach the SDK.
      if (keys.length !== 1 || !url.hash) return null;
      return isProviderError(new URLSearchParams(url.hash.slice(1))) ? { kind: 'error', flowId } : null;
    }
    if (keys.length === 2 && keys.includes('code')) {
      const code = url.searchParams.get('code')!;
      return /^[A-Za-z0-9._~-]{1,2048}$/.test(code) ? { kind: 'code', code, flowId } : null;
    }
    const errorParams = new URLSearchParams(url.searchParams);
    errorParams.delete('flow');
    if (isProviderError(errorParams)) {
      return { kind: 'error', flowId }; // Never expose provider error descriptions/URLs.
    }
    return null;
  } catch { return null; }
}

export function createNativeAuthCallbackHandler(options: {
  redirect: string;
  exchange: (code: string, flowId: string) => Promise<{ authenticated: boolean; recovery: boolean; ignored?: boolean }>;
  isPending?: (flowId: string) => boolean;
  rejected?: (flowId: string) => void;
  authenticated: (recovery: boolean) => void;
  failed: () => void;
}) {
  const seen = new Set<string>();
  let active = true;
  let pending = 0;
  let queue = Promise.resolve();
  return {
    handle(raw: unknown): Promise<void> {
      if (!active) return Promise.resolve();
      const callback = parseNativeAuthCallback(raw, options.redirect);
      if (!callback) return Promise.resolve();
      if (options.isPending && !options.isPending(callback.flowId)) return Promise.resolve();
      if (callback.kind === 'error') { options.rejected?.(callback.flowId); options.failed(); return Promise.resolve(); }
      if (seen.has(callback.code)) return Promise.resolve();
      if (pending >= 4) return Promise.resolve();
      // Bound sensitive in-memory data; no URL or code is persisted or logged.
      seen.add(callback.code);
      if (seen.size > 32) seen.delete(seen.values().next().value!);
      pending += 1;
      queue = queue.then(async () => {
        try {
          if (!active) return;
          const result = await options.exchange(callback.code, callback.flowId);
          if (!active) return;
          if (result.ignored) return;
          if (result.authenticated) options.authenticated(result.recovery);
          else options.failed();
        } catch { if (active) options.failed(); }
        finally { pending -= 1; }
      });
      return queue;
    },
    dispose() { active = false; seen.clear(); },
  };
}
