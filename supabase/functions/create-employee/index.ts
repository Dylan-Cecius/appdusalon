import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveBillingOwner } from "../_shared/billing-owner.ts";
import { resolveAppOrigin, isTrustedAppOrigin } from "../_shared/app-origin.ts";
import { requireMfaAssurance } from "../_shared/mfa.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (!isTrustedAppOrigin(req)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user?.email) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    await requireMfaAssurance(req);

    const billingOwner = await resolveBillingOwner(supabaseAdmin, user);
    if (!billingOwner.salonId) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const { data: isSalonAdmin, error: roleLookupError } = await supabaseAdmin.rpc(
      'has_role_in_salon',
      {
        _user_id: user.id,
        _salon_id: billingOwner.salonId,
        _role: 'admin',
      }
    );

    if (roleLookupError) throw roleLookupError;
    if (isSalonAdmin !== true) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const salonId = billingOwner.salonId;
    const requesterEmail = user.email.toLowerCase();

    const [{ data: platformAdmin }, { data: subscriber }] = await Promise.all([
      supabaseAdmin
        .from('platform_admin_emails')
        .select('email')
        .in('email', Array.from(new Set([requesterEmail, billingOwner.ownerEmail])))
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .or(`user_id.eq.${billingOwner.ownerUserId},email.eq.${billingOwner.ownerEmail}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const normalizedTier =
      subscriber?.subscription_tier === 'Pro'
        ? 'Equipe'
        : subscriber?.subscription_tier === 'Enterprise'
          ? 'Lifetime'
          : subscriber?.subscription_tier;

    const subscriptionValid =
      subscriber?.subscribed === true &&
      (!subscriber.subscription_end ||
        new Date(subscriber.subscription_end).getTime() > Date.now());

    if (
      !platformAdmin &&
      (!subscriptionValid || !['Equipe', 'Lifetime'].includes(normalizedTier || ''))
    ) {
      return jsonResponse({ error: 'upgrade_required' }, 403);
    }

    const { email, display_name, color, staff_id } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(display_name || '').trim();
    const normalizedColor = String(color || '').trim();
    const staffId = String(staff_id || '').trim();

    if (!normalizedEmail || !normalizedName || !normalizedColor || !staffId) {
      return jsonResponse({ error: 'missing_required_fields' }, 400);
    }

    if (
      normalizedEmail.length > 254 ||
      normalizedName.length > 100 ||
      normalizedColor.length > 50
    ) {
      return jsonResponse({ error: 'invalid_input_length' }, 400);
    }

    const { data: staffMember, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('id, auth_user_id, is_active')
      .eq('id', staffId)
      .eq('salon_id', salonId)
      .maybeSingle();

    if (staffError) throw staffError;
    if (!staffMember || !staffMember.is_active) {
      return jsonResponse({ error: 'staff_not_found' }, 404);
    }
    if (staffMember.auth_user_id) {
      return jsonResponse({ error: 'staff_access_already_linked' }, 409);
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        redirectTo: new URL('/auth', resolveAppOrigin(req)).toString(),
        data: {
          display_name: normalizedName,
          account_type: 'employee',
          staff_id: staffId,
        },
      });

    if (createError || !newUser.user) {
      console.error('[CREATE-EMPLOYEE] invitation failed', createError?.message);
      return jsonResponse({ error: 'invitation_failed' }, 400);
    }

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        salon_id: salonId,
        user_id: newUser.user.id,
        display_name: normalizedName,
        color: normalizedColor,
        is_active: true,
      })
      .select()
      .single();

    if (employeeError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw employeeError;
    }

    const { error: insertRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        salon_id: salonId,
        role: 'employee',
      });

    if (insertRoleError) {
      await supabaseAdmin.from('employees').delete().eq('id', employee.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw insertRoleError;
    }

    const { data: linkedStaff, error: linkError } = await supabaseAdmin
      .from('staff')
      .update({
        auth_user_id: newUser.user.id,
        email: normalizedEmail,
        name: normalizedName,
        color: normalizedColor,
      })
      .eq('id', staffId)
      .eq('salon_id', salonId)
      .is('auth_user_id', null)
      .select('id')
      .maybeSingle();

    if (linkError || !linkedStaff) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      if (linkError) throw linkError;
      return jsonResponse({ error: 'staff_access_link_failed' }, 409);
    }

    return jsonResponse({
      success: true,
      employee,
      staff_id: linkedStaff.id,
      message: 'Invitation envoyée. Le compte est lié au membre de l’équipe.',
    });
  } catch (error) {
    console.error('[CREATE-EMPLOYEE]', error);
    return jsonResponse({ error: 'internal_server_error' }, 500);
  }
});
