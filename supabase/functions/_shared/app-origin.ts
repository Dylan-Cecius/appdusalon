const DEFAULT_APP_URL = "https://appdusalon.lovable.app";

const normalizeOrigin = (value?: string | null): string | null => {
  if (!value) return null;

  try {
    const parsed = new URL(value.trim());
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

const isLocalDevelopmentOrigin = (origin: string) => {
  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
};

export const resolveAppOrigin = (req: Request): string => {
  const configuredOrigin =
    normalizeOrigin(Deno.env.get("APP_URL")) ??
    normalizeOrigin(DEFAULT_APP_URL)!;

  const extraOrigins = String(Deno.env.get("ALLOWED_APP_ORIGINS") || "")
    .split(",")
    .map(origin => normalizeOrigin(origin))
    .filter((origin): origin is string => Boolean(origin));

  const allowedOrigins = new Set([configuredOrigin, ...extraOrigins]);
  const requestOrigin = normalizeOrigin(req.headers.get("origin"));

  if (
    requestOrigin &&
    (allowedOrigins.has(requestOrigin) || isLocalDevelopmentOrigin(requestOrigin))
  ) {
    return requestOrigin;
  }

  return configuredOrigin;
};
