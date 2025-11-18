import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Match the common Supabase auth helpers default so client/server cookie
      // formats are consistent (avoid JSON parse issues in the auth helper code)
      cookieEncoding: 'base64url',
    }
  );
}
