export const isDemoOnlyPreview =
  import.meta.env.VITE_PREVIEW_DEMO_ONLY === 'true';

export const DEMO_ACCOUNT_EMAIL = 'demo@appdusalon.com';

export const isAllowedPreviewUser = (email?: string | null) =>
  !isDemoOnlyPreview ||
  String(email || '').toLowerCase() === DEMO_ACCOUNT_EMAIL;
