import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.REACT_APP_SUPABASE_URL?.trim() ?? '';
export const supabasePublishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
