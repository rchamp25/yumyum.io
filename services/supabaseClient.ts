
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// IMPORTANT: REPLACE THESE VALUES WITH YOUR KEYS FROM SUPABASE DASHBOARD
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://qurpztlnaanhbbpmxxjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cnB6dGxuYWFuaGJicG14eGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTIzNTQsImV4cCI6MjA3OTIyODM1NH0.X78TX1WEN0VcowOEKSdKHFRNyPxR7S9d4lZ1lDCH154';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
