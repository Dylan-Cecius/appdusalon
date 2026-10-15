import { validateNativeRedirect } from './authCallback';

type Purpose = 'signup' | 'recovery';
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type PendingFlow = { id: string; purpose: Purpose; createdAt: number };
const key = 'appdusalon.native-auth.pending.v1';
const maxAge = 60 * 60 * 1000;
const validId = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{32}$/.test(id);

/** Stores only a random correlation ID, purpose and time; never emails or tokens. */
export function createPendingAuthFlow(storage: () => StoragePort, now: () => number, randomId: () => string) {
  const read = (): PendingFlow | null => {
    try {
      const value = JSON.parse(storage().getItem(key) || 'null');
      if (!value || !validId(value.id) || !['signup', 'recovery'].includes(value.purpose)
        || !Number.isFinite(value.createdAt) || now() < value.createdAt || now() - value.createdAt > maxAge) return null;
      return value;
    } catch { return null; }
  };
  const cancel = (id: string) => {
    try { if (read()?.id === id) storage().removeItem(key); } catch { /* Caller stays fail-closed. */ }
  };
  return {
    begin(purpose: Purpose, redirect: string): { id: string; redirectTo: string } | null {
      if (!validateNativeRedirect(redirect)) return null;
      try {
        const id = randomId(); if (!validId(id)) return null;
        const value = JSON.stringify({ id, purpose, createdAt: now() });
        storage().setItem(key, value);
        if (storage().getItem(key) !== value) return null;
        return { id, redirectTo: `${redirect}?flow=${id}` };
      } catch { return null; }
    },
    isPending: (id: string) => validId(id) && read()?.id === id,
    consume(id: string): PendingFlow | null {
      const value = read(); if (!value || value.id !== id) return null;
      try {
        storage().removeItem(key);
        if (storage().getItem(key) !== null) return null;
        return value;
      } catch { return null; }
    },
    cancel,
  };
}

export async function requestNativeEmailAuth<T extends { error: unknown }>(options: {
  flow: ReturnType<typeof createPendingAuthFlow>;
  purpose: Purpose;
  redirect: string;
  request: (redirectTo: string) => Promise<T>;
}): Promise<T> {
  const pending = options.flow.begin(options.purpose, options.redirect);
  if (!pending) throw new Error('Impossible de préparer le retour de connexion sur cet appareil.');
  let accepted = false;
  try {
    const result = await options.request(pending.redirectTo);
    accepted = !result.error;
    return result;
  } finally { if (!accepted) options.flow.cancel(pending.id); }
}
