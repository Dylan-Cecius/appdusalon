import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the current user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin in their salon
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role, salon_id')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Only admins can create employees');
    }

    const salonId = roleData.salon_id;

    // Parse request body
    const { email, display_name, color, role } = await req.json();

    // Validate input
    if (!email || !display_name || !color || !role) {
      throw new Error('Missing required fields');
    }

    // Create Supabase auth user with a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        display_name,
      },
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      throw new Error(`Failed to create user: ${createError?.message}`);
    }

    // Create employee record
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        salon_id: salonId,
        user_id: newUser.user.id,
        display_name,
        color,
        is_active: true,
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Error creating employee:', employeeError);
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to create employee: ${employeeError.message}`);
    }

    // Create user role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        salon_id: salonId,
        role: role,
      });

    if (roleError) {
      console.error('Error creating role:', roleError);
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      await supabaseAdmin.from('employees').delete().eq('id', employee.id);
      throw new Error(`Failed to create user role: ${roleError.message}`);
    }

    // Send password reset email so user can set their own password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (resetError) {
      console.warn('Warning: Could not send invitation email:', resetError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        employee,
        message: 'Employé créé avec succès. Un email d\'invitation a été envoyé.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-employee function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: error.message === 'Unauthorized' || error.message === 'Only admins can create employees' ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
