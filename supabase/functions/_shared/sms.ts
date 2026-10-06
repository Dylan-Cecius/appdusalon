import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

export type SmsEntitlement = "automation" | "marketing";

export const getTwilioConfig = () => {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("sms_provider_not_configured");
  }

  return { accountSid, authToken, fromNumber };
};

export const sendSms = async (to: string, body: string) => {
  const { accountSid, authToken, fromNumber } = getTwilioConfig();
  const auth = btoa(`${accountSid}:${authToken}`);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: body,
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    sid: payload?.sid ?? null,
    error: response.ok ? null : payload?.message ?? "sms_send_failed",
  };
};

export const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    throw new Error("not_authenticated");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user?.email) {
    throw new Error("not_authenticated");
  }

  return { admin, user: data.user };
};

const normalizeTier = (tier?: string | null) => {
  if (tier === "Pro") return "Equipe";
  if (tier === "Enterprise") return "Lifetime";
  return tier ?? null;
};

export const resolveSalonAndCheckEntitlement = async (
  admin: ReturnType<typeof createClient>,
  user: { id: string; email?: string | null },
  entitlement: SmsEntitlement
) => {
  const { data: salonId, error: salonError } = await admin.rpc("get_user_salon_id", {
    _user_id: user.id,
  });

  if (salonError || !salonId) {
    throw new Error("salon_not_found");
  }

  const email = (user.email || "").toLowerCase();

  const [{ data: platformAdmin }, { data: subscriber }] = await Promise.all([
    email
      ? admin
          .from("platform_admin_emails")
          .select("email")
          .eq("email", email)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from("subscribers")
      .select("subscribed, subscription_tier, subscription_end")
      .or(`user_id.eq.${user.id},email.eq.${email}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (platformAdmin) {
    return { salonId: String(salonId), tier: "Lifetime" };
  }

  const tier = normalizeTier(subscriber?.subscription_tier);
  const subscriptionValid =
    subscriber?.subscribed === true &&
    (!subscriber.subscription_end ||
      new Date(subscriber.subscription_end).getTime() > Date.now());

  if (!subscriptionValid) {
    throw new Error("subscription_required");
  }

  const allowed =
    entitlement === "automation"
      ? ["Solo", "Equipe", "Lifetime"].includes(tier || "")
      : ["Equipe", "Lifetime"].includes(tier || "");

  if (!allowed) {
    throw new Error("upgrade_required");
  }

  return { salonId: String(salonId), tier };
};
