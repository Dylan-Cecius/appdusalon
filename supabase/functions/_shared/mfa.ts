import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

export const requireMfaAssurance = async (req: Request): Promise<void> => {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("not_authenticated");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !anonKey) {
    throw new Error("auth_not_configured");
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await (client as any).rpc("mfa_session_is_sufficient");

  if (error) {
    console.error("[MFA] assurance check failed", error);
    throw new Error("mfa_check_failed");
  }

  if (data !== true) {
    throw new Error("mfa_required");
  }
};
