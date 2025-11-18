# Authentication Flow Fix - Implementation Summary

## Problem Statement
After user login, the profile was not displaying in the header and subsequent API calls were returning 401 errors. The session wasn't being properly synchronized between the authentication modal and the header component that displays the user profile.

## Root Cause
The session synchronization mechanism wasn't properly triggering profile refresh in the Header component after login. The `useUser` hook couldn't be called to refetch the profile because:
1. No mechanism existed to externally trigger `useUser` to refetch
2. Header component wasn't aware that authentication state had changed
3. sessionStorage wasn't being used to provide immediate user availability

## Solution Architecture

### 1. useUser Hook Refactoring (`lib/hooks/useUser.ts`)

**Pattern: useRef + useCallback for External Refetch**

```typescript
// Store the refetch function in a ref so it persists across renders
const refetchRef = useRef<(() => Promise<void>) | null>(null);

useEffect(() => {
  const syncUserProfile = async () => {
    // ... profile sync logic ...
    // Check sessionStorage first for immediately available user
    const stored = sessionStorage.getItem('ainews_auth_user');
    if (stored) {
      storedUser = JSON.parse(stored);
    }
    // ... fetch from Supabase ...
  };

  // Store function in ref so external code can call it
  refetchRef.current = syncUserProfile;
}, [supabase]);

// Export callback that safely calls the stored function
const refetch = useCallback(async () => {
  if (refetchRef.current) {
    await refetchRef.current();
  }
}, []);

return { profile, locale, isLoading, refetch };
```

**Why this pattern?**
- `syncUserProfile` needs access to `isMounted` and `clearedCookiesOnce` (scoped to useEffect)
- External code needs to call `refetch()` to trigger profile refresh
- `useRef` holds the function reference that persists across renders
- `useCallback` provides a stable reference for dependency arrays

### 2. Header Component Event Listener (`components/layout/Header.tsx`)

```typescript
const { profile, locale, refetch } = useUser();

useEffect(() => {
  const handleAuthStateChange = async (_event: Event) => {
    console.log('[Header] Auth state changed event received, refetching user profile');
    await refetch?.();
  };
  window.addEventListener('auth-state-changed', handleAuthStateChange);
  return () => window.removeEventListener('auth-state-changed', handleAuthStateChange);
}, [refetch]);
```

**How it works:**
1. Header listens for custom `auth-state-changed` event
2. When event fires, calls `refetch()` from useUser hook
3. This triggers profile sync, updating the header with user data
4. Header re-renders with new profile information

### 3. AuthModal Session Synchronization (`components/auth/AuthModal.tsx`)

**Flow after successful login:**
```typescript
// Step 1: Perform login with Supabase
const { data, error } = await signInWithEmail(email, password);

// Step 2: Wait for cookies to be set
await new Promise(resolve => setTimeout(resolve, 300));

// Step 3: Sync session with server
const syncResponse = await fetch('/api/auth/sync', { 
  credentials: 'include' 
});
const syncData = await syncResponse.json();

// Step 4: Store user in sessionStorage for immediate availability
sessionStorage.setItem('ainews_auth_user', JSON.stringify(syncData.user));

// Step 5: Dispatch custom event to trigger Header refetch
window.dispatchEvent(new CustomEvent('auth-state-changed', {
  detail: { userId: syncData.user.id, user: syncData.user }
}));

// Step 6: Refresh page data (doesn't redirect)
router.refresh();
```

### 4. Session Sync Endpoint (`app/api/auth/sync/route.ts`)

```typescript
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(url, key, { 
    cookies: { getAll: () => cookieStore.getAll() }
  });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  return Response.json({
    authenticated: !!user,
    user: user ? { id, email, user_metadata } : null
  });
}
```

**Purpose:**
- Validates session server-side
- Returns authenticated user data
- Used by AuthModal to verify successful login

## Data Flow

```
User Logs In
    ↓
AuthModal.signInWithEmail()
    ↓
Wait 300ms for cookies to be set
    ↓
Fetch /api/auth/sync (with credentials)
    ↓
sessionStorage.setItem('ainews_auth_user', user)
    ↓
window.dispatchEvent('auth-state-changed')
    ↓
Header's useEffect listens for event
    ↓
Header calls refetch()
    ↓
useUser's refetch calls syncUserProfile via ref
    ↓
syncUserProfile checks sessionStorage first (instant user data)
    ↓
Then fetches full profile from database
    ↓
Header re-renders with profile
```

## Key Improvements

### 1. Immediate User Availability
- sessionStorage provides instant user data after login
- No blank header while profile is loading
- Better UX for quick feedback

### 2. Proper Event-Based Communication
- Custom events decouple components
- Header doesn't need to know about AuthModal implementation
- Easy to add more listeners if needed

### 3. Server-Side Session Validation
- `/api/auth/sync` validates session server-side
- Ensures cookies are properly transmitted
- Returns user metadata for immediate use

### 4. Session Persistence
- sessionStorage cleared on logout
- Cookies validated on each request via middleware
- Profile persists across page refreshes

## Testing Verification

### Build Status
- ✅ `npm run build`: 24.4 seconds
- ✅ No TypeScript errors
- ✅ No compilation warnings

### Console Logs to Verify
After login, you should see:
```
[AuthModal] Stored user in sessionStorage: { id: '...', email: 'user@example.com' }
[AuthModal] Auth state changed event dispatched
[Header] Auth state changed event received, refetching user profile
[useUser] Refetch called
[useUser] Found user in sessionStorage: { id: '...', email: '...' }
[useUser] Synced profile from database
```

### Expected Behavior
1. **Login**: Modal closes, profile appears in header, stays on current page
2. **Refresh**: Page reloads, profile still shows (session persisted via cookies)
3. **Enrollment**: Can enroll in courses without 401 errors
4. **Logout**: Profile disappears, sessionStorage cleared

## Files Modified

1. **lib/hooks/useUser.ts**
   - Added useRef for refetchRef
   - Added useCallback for refetch export
   - Added sessionStorage check in syncUserProfile
   - Added imports: `useCallback`, `useRef`

2. **components/layout/Header.tsx**
   - Added `refetch` to useUser destructuring
   - Added useEffect for auth-state-changed listener

3. **components/auth/AuthModal.tsx**
   - Added sessionStorage storage after sync
   - Added custom event dispatch
   - Added logging for debugging

4. **app/api/debug/auth-flow/route.ts** (NEW)
   - Diagnostic endpoint for verifying auth flow

5. **lib/utils/auth-flow-diagnostics.ts** (NEW)
   - Client-side diagnostic helpers

## Rollback Plan

If issues arise:
```bash
git revert HEAD
npm run build
```

## Future Improvements

1. **Automatic Refetch Trigger**
   - Could use Supabase's onAuthStateChange directly without custom events

2. **Indexed Cookies**
   - Implement cookie versioning for better invalidation

3. **Profile Cache**
   - Cache profile data with TTL to reduce database queries

4. **Error Recovery**
   - More sophisticated error handling for cookie parsing failures

## Monitoring

After deployment, monitor:
- Browser console for auth-related errors
- API response times for `/api/auth/sync`
- 401 error rates on protected endpoints
- sessionStorage size (should be < 1KB)
