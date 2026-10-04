import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// When the env vars are missing, index.tsx renders a setup message instead of the app,
// so nothing touches this client.
export const supabase: SupabaseClient = isSupabaseConfigured
    ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
    : (null as unknown as SupabaseClient);
