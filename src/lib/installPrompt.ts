// Installation de l'app (PWA).
// Le navigateur n'émet « beforeinstallprompt » qu'une fois, souvent avant que
// React ait monté le bouton : on l'intercepte dès le démarrage et on le garde.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

export const subscribeInstall = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** L'app tourne déjà comme une app installée (plein écran, sans barre d'adresse). */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isIos = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS se présente comme un Mac, mais avec un écran tactile
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

export const getInstallState = () => ({
  canPrompt: deferredPrompt !== null,
  installed: installed || isStandalone(),
});

/** Ouvre la fenêtre d'installation du navigateur. Renvoie false si elle n'est pas disponible. */
export const promptInstall = async (): Promise<boolean> => {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  deferredPrompt = null;
  await event.prompt();
  await event.userChoice.catch(() => undefined);
  notify();
  return true;
};
