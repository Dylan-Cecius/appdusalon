import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const normalizeTier = (tier: string | null) => {
  if (tier === "Pro") return "Equipe";
  if (tier === "Enterprise") return "Lifetime";
  return tier;
};

export const hasReportAccess = async (
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("subscribed, subscription_tier, subscription_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.subscribed) return false;

  const tier = normalizeTier(data.subscription_tier);
  if (!["Solo", "Equipe", "Lifetime"].includes(tier || "")) return false;

  if (tier === "Lifetime") return true;
  if (!data.subscription_end) return true;

  return new Date(data.subscription_end).getTime() > Date.now();
};

export const getAuthenticatedUserId = async (
  supabaseUrl: string,
  anonKey: string,
  authorization: string | null,
): Promise<string | null> => {
  if (!authorization?.startsWith("Bearer ")) return null;

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.56.0");
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const token = authorization.slice("Bearer ".length);
  const { data, error } = await client.auth.getClaims(token);

  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
};
