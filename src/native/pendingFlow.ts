import { createPendingAuthFlow } from './pendingAuthFlow';

export const pendingNativeAuth = createPendingAuthFlow(() => window.localStorage, Date.now, () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
});
