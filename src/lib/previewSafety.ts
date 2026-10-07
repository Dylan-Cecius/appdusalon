export const isDemoOnlyPreview =
  import.meta.env.VITE_PREVIEW_DEMO_ONLY === 'true';

export const DEMO_ACCOUNT_EMAIL =
  String(import.meta.env.VITE_DEMO_ACCOUNT_EMAIL || 'demo@appdusalon.com')
    .trim()
    .toLowerCase();

export const isAllowedPreviewUser = (email?: string | null) =>
  !isDemoOnlyPreview ||
  String(email || '').trim().toLowerCase() === DEMO_ACCOUNT_EMAIL;
