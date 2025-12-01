/**
 * Supabase Client for API Routes
 * Uses the request cookies instead of next/headers cookies()
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

export function createApiClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieEncoding: 'base64url',
    cookies: {
      getAll() {
        // Get cookies from the request
        const cookieHeader = request.headers.get('cookie') || '';
        const cookies: { name: string; value: string }[] = [];
        
        if (cookieHeader) {
          cookieHeader.split(';').forEach((cookie) => {
            const [name, ...rest] = cookie.trim().split('=');
            if (name) {
              cookies.push({
                name: name.trim(),
                value: rest.join('=').trim(),
              });
            }
          });
        }
        
        return cookies;
      },
      setAll() {
        // API routes don't need to set cookies in responses for our use case
        // The middleware handles session refresh
      },
    },
  });
}
