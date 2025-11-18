/**
 * Client-side diagnostic script for auth flow debugging
 * Add to browser console to monitor auth events
 */

export function setupAuthFlowDiagnostics() {
  console.log('🔍 [AuthFlow] Setting up diagnostics...');

  // Track sessionStorage changes
  const originalSetItem = sessionStorage.setItem;
  sessionStorage.setItem = function(key: string, value: string) {
    if (key === 'ainews_auth_user') {
      console.log('📦 [SessionStorage] User data stored:', JSON.parse(value));
    }
    return originalSetItem.call(this, key, value);
  };

  const originalRemoveItem = sessionStorage.removeItem;
  sessionStorage.removeItem = function(key: string) {
    if (key === 'ainews_auth_user') {
      console.log('🗑️  [SessionStorage] User data cleared');
    }
    return originalRemoveItem.call(this, key);
  };

  // Track custom events
  window.addEventListener('auth-state-changed', (event: Event) => {
    const customEvent = event as CustomEvent;
    console.log('🔄 [CustomEvent] auth-state-changed received:', customEvent.detail);
  });

  // Periodic check of sessionStorage
  setInterval(() => {
    const stored = sessionStorage.getItem('ainews_auth_user');
    if (stored) {
      const userData = JSON.parse(stored);
      console.log('💾 [Check] SessionStorage user still present:', {
        id: userData.id,
        email: userData.email,
      });
    }
  }, 5000);

  console.log('✅ [AuthFlow] Diagnostics ready. Check console for events.');

  // Return helper functions
  return {
    checkSession: async () => {
      const response = await fetch('/api/debug/auth-flow');
      const data = await response.json();
      console.log('🔐 [Session Check]:', data);
      return data;
    },
    checkSessionStorage: () => {
      const user = sessionStorage.getItem('ainews_auth_user');
      console.log('📦 [SessionStorage Check]:', user ? JSON.parse(user) : 'EMPTY');
      return user;
    },
    clearSession: () => {
      sessionStorage.removeItem('ainews_auth_user');
      console.log('🗑️  [Manual Clear] SessionStorage cleared');
    },
    simulateAuthChange: () => {
      window.dispatchEvent(new CustomEvent('auth-state-changed', {
        detail: { userId: 'test', user: { id: 'test' } }
      }));
      console.log('🔄 [Simulated] auth-state-changed event fired');
    },
  };
}

// Auto-setup if in development
if (typeof window !== 'undefined') {
  const win = window as typeof window & { authFlowDiagnostics?: ReturnType<typeof setupAuthFlowDiagnostics> };
  win.authFlowDiagnostics = setupAuthFlowDiagnostics();
  console.log('📊 [AuthFlow] Diagnostics available as window.authFlowDiagnostics');
  console.log('Available methods:');
  console.log('  - checkSession()');
  console.log('  - checkSessionStorage()');
  console.log('  - clearSession()');
  console.log('  - simulateAuthChange()');
}
