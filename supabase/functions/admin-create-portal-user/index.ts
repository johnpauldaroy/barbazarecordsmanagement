import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function parseBoolean(value: unknown, fallbackValue = true) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallbackValue;
}

function roleRequiresBarangayAssignment(roleKey: string) {
  return roleKey === 'barangay_secretary' || roleKey === 'barangay_staff';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(500, { error: 'Supabase environment variables are missing on the Edge Function.' });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Missing authorization header.' });
  }

  const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user: requester },
    error: requesterError,
  } = await requesterClient.auth.getUser();

  if (requesterError || !requester) {
    return jsonResponse(401, { error: 'Unable to authenticate request.' });
  }

  const { data: requesterRoles, error: requesterRolesError } = await requesterClient
    .from('user_roles')
    .select('is_active, effective_from, effective_to, roles!inner(key)')
    .eq('user_id', requester.id)
    .is('barangay_id', null);

  if (requesterRolesError) {
    return jsonResponse(403, { error: 'Unable to verify administrator role.' });
  }

  const now = new Date();
  const isSuperAdmin = (requesterRoles ?? []).some((assignment) => {
    const roleKey = assignment.roles?.key;
    const effectiveFrom = assignment.effective_from ? new Date(assignment.effective_from) : null;
    const effectiveTo = assignment.effective_to ? new Date(assignment.effective_to) : null;

    return (
      roleKey === 'super_admin'
      && assignment.is_active
      && (!effectiveFrom || effectiveFrom <= now)
      && (!effectiveTo || effectiveTo >= now)
    );
  });

  if (!isSuperAdmin) {
    return jsonResponse(403, { error: 'Only super admins can create portal users.' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: 'Request body must be valid JSON.' });
  }

  const displayName = String(payload.displayName ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const password = String(payload.password ?? '');
  const roleKey = String(payload.role ?? 'resident').trim() || 'resident';
  const isActive = parseBoolean(payload.isActive, true);
  const rawBarangayId = String(payload.barangayId ?? '').trim();

  if (!displayName) {
    return jsonResponse(400, { error: 'Display name is required.' });
  }

  if (!email || !email.includes('@')) {
    return jsonResponse(400, { error: 'A valid email address is required.' });
  }

  if (password.length < 8) {
    return jsonResponse(400, { error: 'Password must be at least 8 characters.' });
  }

  if (roleRequiresBarangayAssignment(roleKey) && !rawBarangayId) {
    return jsonResponse(400, { error: 'Barangay assignment is required for barangay staff roles.' });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: targetRole, error: roleLookupError } = await adminClient
    .from('roles')
    .select('id, key, name')
    .eq('key', roleKey)
    .maybeSingle();

  if (roleLookupError) {
    return jsonResponse(500, { error: roleLookupError.message });
  }

  if (!targetRole) {
    return jsonResponse(400, { error: `Role "${roleKey}" was not found.` });
  }

  const assignedBarangayId = roleRequiresBarangayAssignment(roleKey) ? rawBarangayId : null;
  let assignedBarangay: { id: string; code: string; name: string } | null = null;

  if (assignedBarangayId) {
    const { data: barangay, error: barangayLookupError } = await adminClient
      .from('barangays')
      .select('id, code, name')
      .eq('id', assignedBarangayId)
      .maybeSingle();

    if (barangayLookupError) {
      return jsonResponse(500, { error: barangayLookupError.message });
    }

    if (!barangay) {
      return jsonResponse(400, { error: 'Assigned barangay was not found.' });
    }

    assignedBarangay = barangay;
  }

  let createdUserId: string | null = null;

  try {
    const { data: createdAuthData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
      },
    });

    if (createAuthError) {
      return jsonResponse(400, { error: createAuthError.message });
    }

    const createdUser = createdAuthData.user;
    if (!createdUser) {
      return jsonResponse(500, { error: 'Auth user creation did not return a user record.' });
    }

    createdUserId = createdUser.id;
    const nowIso = new Date().toISOString();

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({
        display_name: displayName,
        default_barangay_id: assignedBarangay?.id ?? null,
        is_active: isActive,
        updated_at: nowIso,
      })
      .eq('id', createdUser.id);

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    const { error: deactivateRoleError } = await adminClient
      .from('user_roles')
      .update({
        is_primary: false,
        is_active: false,
        effective_to: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', createdUser.id);

    if (deactivateRoleError) {
      throw deactivateRoleError;
    }

    let existingRoleAssignmentQuery = adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', createdUser.id)
      .eq('role_id', targetRole.id);

    if (assignedBarangay?.id) {
      existingRoleAssignmentQuery = existingRoleAssignmentQuery.eq('barangay_id', assignedBarangay.id);
    } else {
      existingRoleAssignmentQuery = existingRoleAssignmentQuery.is('barangay_id', null);
    }

    const { data: existingRoleAssignment, error: existingRoleError } = await existingRoleAssignmentQuery.maybeSingle();

    if (existingRoleError) {
      throw existingRoleError;
    }

    if (existingRoleAssignment?.id) {
      const { error: roleUpdateError } = await adminClient
        .from('user_roles')
        .update({
          is_primary: true,
          is_active: isActive,
          effective_to: isActive ? null : nowIso,
          updated_at: nowIso,
        })
        .eq('id', existingRoleAssignment.id);

      if (roleUpdateError) {
        throw roleUpdateError;
      }
    } else {
      const { error: roleInsertError } = await adminClient
        .from('user_roles')
        .insert({
          user_id: createdUser.id,
          role_id: targetRole.id,
          barangay_id: assignedBarangay?.id ?? null,
          is_primary: true,
          is_active: isActive,
          effective_from: nowIso,
          effective_to: isActive ? null : nowIso,
        });

      if (roleInsertError) {
        throw roleInsertError;
      }
    }

    return jsonResponse(200, {
      user: {
        id: createdUser.id,
        displayName,
        email,
        role: targetRole.key,
        roleName: targetRole.name,
        isActive,
        lastSignIn: createdUser.last_sign_in_at ?? null,
        barangayId: assignedBarangay?.id ?? null,
        barangayCode: assignedBarangay?.code ?? null,
        barangayName: assignedBarangay?.name ?? null,
      },
    });
  } catch (error) {
    if (createdUserId) {
      await adminClient.auth.admin.deleteUser(createdUserId);
    }

    const message = error instanceof Error ? error.message : 'Failed to create portal user.';
    return jsonResponse(500, { error: message });
  }
});
