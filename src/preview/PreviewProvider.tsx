import { createContext, useCallback, useEffect, useContext, useRef, useState, type MutableRefObject, type ReactNode, type SetStateAction } from 'react';
import { createPreviewSession, previewStorageKey, seedPreviewState, type PreviewCart, type PreviewState, type PreviewStorage } from './state';

const PreviewContext = createContext<{
  state: PreviewState;
  now: Date;
  currentState: MutableRefObject<PreviewState>;
  setState: (action: SetStateAction<PreviewState>) => void;
  reset: () => void;
  setCart: (action: (cart: PreviewCart) => PreviewCart) => void;
} | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => {
    // Access localStorage inside the guarded adapter (even the property getter
    // can throw in a restricted browser). No backend or hosted client here.
    const storage: PreviewStorage = {
      getItem: key => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    };
    return createPreviewSession(storage, previewStorageKey(new Date()), seedPreviewState());
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  const [state, publish] = useState(session.getState);
  const [error, setError] = useState<string | null>(null);
  const currentState = useRef(state);
  const setState = useCallback((action: SetStateAction<PreviewState>) => {
    try {
      const next = typeof action === 'function' ? action(currentState.current) : action;
      if (next === currentState.current) return;
      session.commit(next);
      currentState.current = next;
      publish(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La modification locale a échoué.');
      throw cause;
    }
  }, [session]);
  const setCart = useCallback((action: (cart: PreviewCart) => PreviewCart) => {
    try {
      session.editCart(action(currentState.current.cart));
      currentState.current = session.getState(); publish(session.getState()); setError(null);
    } catch (cause) {
      currentState.current = session.getState(); publish(session.getState());
      setError(cause instanceof Error ? cause.message : 'Le brouillon n’a pas pu être enregistré.');
      throw cause;
    }
  }, [session]);
  const reset = useCallback(() => setState(seedPreviewState()), [setState]);
  return <PreviewContext.Provider value={{ state, now, currentState, setState, setCart, reset }}>
    {session.getWarning() && <p role="status" className="border-b border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{session.getWarning()}</p>}
    {error && <div role="alert" className="border-b border-red-200 bg-red-50 p-3 text-sm text-red-950">{error} <button type="button" onClick={() => window.location.reload()} className="underline">Recharger la démo</button></div>}
    {children}
  </PreviewContext.Provider>;
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) throw new Error('La démonstration nécessite son provider local.');
  return context;
}
