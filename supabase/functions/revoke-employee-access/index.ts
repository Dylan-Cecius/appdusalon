import { isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { resolveBillingOwner } from "../_shared/billing-owner.ts";
import { requireMfaAssurance } from "../_shared/mfa.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (!isTrustedAppOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "backend_not_configured" }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData.user;

    if (userError || !user) return jsonResponse({ error: "unauthorized" }, 401);

    await requireMfaAssurance(req);

    const billingOwner = await resolveBillingOwner(admin, user);
    if (!billingOwner.salonId) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const { data: isSalonAdmin, error: roleError } = await admin.rpc(
      "has_role_in_salon",
      {
        _user_id: user.id,
        _salon_id: billingOwner.salonId,
        _role: "admin",
      }
    );

    if (roleError) throw roleError;
    if (isSalonAdmin !== true) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const salonId = billingOwner.salonId;

    const { staff_id } = await req.json();
    const staffId = String(staff_id || "").trim();
    if (!staffId) return jsonResponse({ error: "staff_id_required" }, 400);

    const { data: staff, error: staffError } = await admin
      .from("staff")
      .select("id, auth_user_id")
      .eq("id", staffId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (staffError) throw staffError;
    if (!staff) return jsonResponse({ error: "staff_not_found" }, 404);

    if (!staff.auth_user_id) {
      return jsonResponse({ success: true, already_revoked: true });
    }

    const targetUserId = staff.auth_user_id as string;

    const { data: targetRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (targetRole?.role === "admin") {
      return jsonResponse({ error: "cannot_revoke_admin_owner" }, 403);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) throw deleteError;

    // staff.auth_user_id is ON DELETE SET NULL.
    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal_server_error";
    const status =
      message === "mfa_required" ? 403 :
      message === "auth_not_configured" || message === "mfa_check_failed" ? 503 : 500;

    console.error("[REVOKE-EMPLOYEE-ACCESS]", error);
    return jsonResponse(
      { error: status === 500 ? "internal_server_error" : message },
      status
    );
  }
});
