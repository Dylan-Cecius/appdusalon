import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { resolveBillingOwner } from "./billing-owner.ts";

const normalizeTier = (tier: string | null) => {
  if (tier === "Pro") return "Equipe";
  if (tier === "Enterprise") return "Lifetime";
  return tier;
};

export const hasReportAccess = async (
  supabaseAdmin: any,
  userId: string,
): Promise<boolean> => {
  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.getUserById(userId);

  if (userError || !userData.user?.email) return false;

  const billingOwner = await resolveBillingOwner(supabaseAdmin, userData.user);
  if (!billingOwner.salonId) return false;

  const requesterEmail = userData.user.email.toLowerCase();

  const [{ data: requesterPlatformAdmin }, { data: ownerPlatformAdmin }, { data: isSalonAdmin }, { data: subscriber, error }] =
    await Promise.all([
      supabaseAdmin
        .from("platform_admin_emails")
        .select("email")
        .eq("email", requesterEmail)
        .maybeSingle(),
      supabaseAdmin
        .from("platform_admin_emails")
        .select("email")
        .eq("email", billingOwner.ownerEmail)
        .maybeSingle(),
      supabaseAdmin.rpc("has_role_in_salon", {
        _user_id: userId,
        _salon_id: billingOwner.salonId,
        _role: "admin",
      }),
      supabaseAdmin
        .from("subscribers")
        .select("subscribed, subscription_tier, subscription_end")
        .or(`user_id.eq.${billingOwner.ownerUserId},email.eq.${billingOwner.ownerEmail}`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (requesterPlatformAdmin || ownerPlatformAdmin) return true;
  if (isSalonAdmin !== true) return false;
  if (error || !subscriber?.subscribed) return false;

  const tier = normalizeTier(subscriber.subscription_tier);
  if (!["Solo", "Equipe", "Lifetime"].includes(tier || "")) return false;

  if (tier === "Lifetime") return true;
  if (!subscriber.subscription_end) return true;

  return new Date(subscriber.subscription_end).getTime() > Date.now();
};

export const getAuthenticatedUserId = async (
  supabaseUrl: string,
  anonKey: string,
  authorization: string | null,
): Promise<string | null> => {
  if (!authorization?.startsWith("Bearer ")) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const token = authorization.slice("Bearer ".length);
  const { data, error } = await client.auth.getClaims(token);

  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
};
