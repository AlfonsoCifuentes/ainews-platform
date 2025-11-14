import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

function createBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are missing. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: true, // CRITICAL: Persist session to localStorage so user stays logged in
      autoRefreshToken: true, // Auto-refresh tokens before expiry
      detectSessionInUrl: true, // Detect session from URL (OAuth callbacks)
    },
  });
}

function createServerClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseServerClient must only be called on the server.');
  }

  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase server environment variables are missing. Please check SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'AINews-Server',
      },
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }

  return browserClient;
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!serverClient) {
    serverClient = createServerClient();
  }

  return serverClient;
}
