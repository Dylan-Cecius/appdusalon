-- pgcrypto is installed in extensions on Supabase. A public-only search_path
-- breaks bcrypt calls, and the legacy hash helper silently falls back to MD5.
-- Change configuration only: retain function bodies, access checks and ACLs.
-- pg_catalog is first and pg_temp is explicitly last to prevent temp shadowing.
ALTER FUNCTION public.hash_password(text)
  SET search_path = pg_catalog, extensions, public, pg_temp;

ALTER FUNCTION public.verify_password(text, text)
  SET search_path = pg_catalog, extensions, public, pg_temp;

ALTER FUNCTION public.set_stats_password(text)
  SET search_path = pg_catalog, extensions, public, pg_temp;

ALTER FUNCTION public.verify_stats_password(text)
  SET search_path = pg_catalog, extensions, public, pg_temp;
