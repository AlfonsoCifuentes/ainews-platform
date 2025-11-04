'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy /auth route - redirects to home with modal
 * This exists only to handle old cached links
 */
export default function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home - the modal should be opened via client-side state
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-white/60">Redirecting...</p>
      </div>
    </div>
  );
}
