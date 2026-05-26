import { hasSupabaseConfig, supabase } from './supabase';

const SESSION_KEY = 'barbaza-mswd-session';
const IS_TEST_MODE = process.env.NODE_ENV === 'test';

export const demoCredentials = {
  email: 'ana.ramos@barbaza.gov.ph',
  password: 'mswd-demo-2026',
};

const demoSession = {
  email: demoCredentials.email,
  name: 'Ana B. Ramos',
  role: 'Barangay Secretary',
  roleKey: 'barangay_secretary',
  barangayName: 'Palma',
};

export const isSupabaseEnabled = hasSupabaseConfig;

function formatDisplayName(email = '') {
  const localPart = email.split('@')[0] ?? '';

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeRoleKey(role) {
  return typeof role === 'string' ? role.trim() : '';
}

async function resolveSessionUser(user) {
  if (!user) {
    return null;
  }

  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  const metadataRole = user.user_metadata?.role ?? user.app_metadata?.role;
  let profileName = metadataName || formatDisplayName(user.email) || 'Portal User';
  let role = metadataRole || 'Barangay Secretary';
  let roleKey = normalizeRoleKey(metadataRole);
  let barangayId = null;
  let barangayName = null;
  let barangayCode = null;

  if (isSupabaseEnabled && supabase) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, default_barangay_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profileError && profile?.display_name) {
      profileName = profile.display_name;
    }

    const { data: assignedRoles, error: assignedRolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        barangay_id,
        is_primary,
        is_active,
        effective_from,
        effective_to,
        updated_at,
        role:roles(key, name),
        barangay:barangays(id, code, name)
      `)
      .eq('user_id', user.id);

    if (!assignedRolesError) {
      const now = Date.now();
      const activeRoles = (assignedRoles ?? [])
        .filter((assignment) => {
          if (!assignment.is_active) {
            return false;
          }

          const effectiveFrom = assignment.effective_from ? new Date(assignment.effective_from).getTime() : now;
          const effectiveTo = assignment.effective_to ? new Date(assignment.effective_to).getTime() : null;

          return effectiveFrom <= now && (effectiveTo === null || effectiveTo >= now);
        })
        .sort((left, right) => {
          if (Boolean(left.is_primary) !== Boolean(right.is_primary)) {
            return left.is_primary ? -1 : 1;
          }

          return new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime();
        });

      const normalizeRelation = (value) => (Array.isArray(value) ? value[0] : value);
      const primaryRole = activeRoles[0];
      const primaryRoleInfo = normalizeRelation(primaryRole?.role);
      if (primaryRoleInfo) {
        role = primaryRoleInfo.name || role;
        roleKey = primaryRoleInfo.key || roleKey;
      }

      const scopedBarangay = normalizeRelation(
        activeRoles.find((assignment) => assignment.barangay_id)?.barangay
      );
      if (scopedBarangay) {
        barangayId = scopedBarangay.id || null;
        barangayName = scopedBarangay.name || null;
        barangayCode = scopedBarangay.code || null;
      }
    }

    if (!barangayId && profile?.default_barangay_id) {
      const { data: profileBarangay, error: profileBarangayError } = await supabase
        .from('barangays')
        .select('id, code, name')
        .eq('id', profile.default_barangay_id)
        .maybeSingle();

      if (!profileBarangayError && profileBarangay) {
        barangayId = profileBarangay.id || null;
        barangayName = profileBarangay.name || null;
        barangayCode = profileBarangay.code || null;
      }
    }
  }

  return {
    id: user.id,
    email: user.email ?? '',
    name: profileName,
    role,
    roleKey,
    barangayId,
    barangayName,
    barangayCode,
  };
}

function getLocalSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(SESSION_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

function setLocalSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearLocalSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export async function getStoredSession() {
  if (IS_TEST_MODE && !isSupabaseEnabled) {
    return getLocalSession();
  }

  if (!isSupabaseEnabled) {
    throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return resolveSessionUser(session?.user);
}

export async function authenticateUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (IS_TEST_MODE && !isSupabaseEnabled) {
    if (normalizedEmail !== demoCredentials.email || password !== demoCredentials.password) {
      throw new Error('Use the demo MSWD account shown on the sign-in card.');
    }

    setLocalSession(demoSession);
    return demoSession;
  }

  if (!isSupabaseEnabled) {
    throw new Error('Supabase environment variables are missing. Restart the app after updating `.env.local`.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return resolveSessionUser(data.session?.user);
}

export async function clearStoredSession() {
  if (IS_TEST_MODE && !isSupabaseEnabled) {
    clearLocalSession();
    return;
  }

  if (!isSupabaseEnabled) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export function subscribeToAuthChanges(callback) {
  if (IS_TEST_MODE && !isSupabaseEnabled) {
    return () => {};
  }

  if (!isSupabaseEnabled) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    void resolveSessionUser(session?.user)
      .then(callback)
      .catch(() => callback(null));
  });

  return () => {
    subscription.unsubscribe();
  };
}
