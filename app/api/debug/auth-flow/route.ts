import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Diagnostic endpoint to verify auth flow is working
 * GET /api/debug/auth-flow
 */
export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const sbCookies = allCookies.filter(c => 
    c.name.toLowerCase().startsWith('sb-') || 
    c.name.toLowerCase().includes('supabase')
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        storageKey: 'sb-auth-token',
        storage: {
          getItem: (key: string) => {
            const cookie = allCookies.find(c => c.name === key);
            return cookie?.value || null;
          },
          setItem: () => {},
          removeItem: () => {},
        },
      },
    }
  );

  try {
    const { data, error } = await supabase.auth.getUser();

    return Response.json({
      status: 'ok',
      authenticated: !!data.user,
      user: data.user ? {
        id: data.user.id,
        email: data.user.email,
        hasMetadata: !!data.user.user_metadata,
      } : null,
      error: error ? error.message : null,
      cookies: {
        total: allCookies.length,
        supabaseCookies: sbCookies.length,
        supabaseCookieNames: sbCookies.map(c => c.name),
      },
      notes: [
        'This endpoint validates that:',
        '1. Cookies are being received by the server',
        '2. Supabase auth can validate the session',
        '3. User is properly authenticated',
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({
      status: 'error',
      authenticated: false,
      user: null,
      error: message,
      cookies: {
        total: allCookies.length,
        supabaseCookies: sbCookies.length,
      },
    }, { status: 500 });
  }
}
