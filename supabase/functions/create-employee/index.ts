import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    if (userError || !user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }

    const { data: roleData, error: roleLookupError } = await supabaseAdmin
      .from('user_roles')
      .select('role, salon_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleLookupError) throw roleLookupError;

    if (!roleData || roleData.role !== 'admin' || !roleData.salon_id) {
      return jsonResponse({ error: 'forbidden' }, 403);
    }

    const { email, display_name, color } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(display_name || '').trim();
    const normalizedColor = String(color || '').trim();

    if (!normalizedEmail || !normalizedName || !normalizedColor) {
      return jsonResponse({ error: 'missing_required_fields' }, 400);
    }

    if (
      normalizedEmail.length > 254 ||
      normalizedName.length > 100 ||
      normalizedColor.length > 50
    ) {
      return jsonResponse({ error: 'invalid_input_length' }, 400);
    }

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          display_name: normalizedName,
          account_type: 'employee',
        },
      });

    if (createError || !newUser.user) {
      console.error('[CREATE-EMPLOYEE] invitation failed', createError?.message);
      return jsonResponse({ error: 'invitation_failed' }, 400);
    }

    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        salon_id: roleData.salon_id,
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
        salon_id: roleData.salon_id,
        role: 'employee',
      });

    if (insertRoleError) {
      await supabaseAdmin.from('employees').delete().eq('id', employee.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw insertRoleError;
    }

    return jsonResponse({
      success: true,
      employee,
      message: 'Employé créé avec succès. Une invitation sécurisée a été envoyée par email.',
    });
  } catch (error) {
    console.error('[CREATE-EMPLOYEE]', error);
    return jsonResponse({ error: 'internal_server_error' }, 500);
  }
});
