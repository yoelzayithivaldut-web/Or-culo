import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// Hardcoded credentials provided for the project.
const FALLBACK_URL = 'https://pokahkejkjwjrdxochda.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBva2Foa2Vqa2p3anJkeG9jaGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDY0OTMsImV4cCI6MjA4OTg4MjQ5M30.MrH7ZF5rMHakCFPVX2uRz_ArzepuCDQNvJHym_OB2_s';
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_ra1ZD7iIGVgnMxaijbTO3Q_4rsqmFW-';

const getSupabaseConfig = () => {
  // 1. Check Environment Variables (Primary)
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const envPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  // 2. Check Local Storage (Debug/Manual Override)
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('SUPABASE_URL') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('SUPABASE_ANON_KEY') : null;

  // 3. Resolve Final Values
  const url = envUrl || localUrl || FALLBACK_URL;
  const key = envKey || localKey || FALLBACK_KEY;
  const publishableKey = envPublishableKey || FALLBACK_PUBLISHABLE_KEY;

  return { url, key, publishableKey };
};

const { url: supabaseUrl, key: supabaseAnonKey, publishableKey: supabasePublishableKey } = getSupabaseConfig();

// Validation: Check if the URL is a valid Supabase URL format
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.supabase.co') || parsed.hostname === 'localhost';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  isValidUrl(supabaseUrl) &&
  !supabaseUrl.includes('placeholder')
);

// -----------------------------------------------------------------------------
// CLIENT INITIALIZATION
// -----------------------------------------------------------------------------

export const supabase = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || FALLBACK_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: { 'x-application-name': 'oraculo-crm' }
    }
  }
);

// Debug Logging
if (process.env.NODE_ENV === 'development') {
  console.log('Oráculo: Supabase initialized', {
    source: supabaseUrl === FALLBACK_URL ? 'FALLBACK' : 'ENV/LOCAL',
    isConfigured: isSupabaseConfigured,
    url: supabaseUrl
  });
}
