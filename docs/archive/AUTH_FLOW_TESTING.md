# Authentication Flow Testing Guide

## Current Implementation (Commit: 1f879a6)

### Changes Made
1. **useUser Hook (lib/hooks/useUser.ts)**
   - Refactored with `useRef` to store `syncUserProfile` function
   - Added `useCallback` wrapper for `refetch` function
   - Proper scoping: `isMounted` and `clearedCookiesOnce` stay inside useEffect
   - Added sessionStorage check for immediate user availability after login
   - Clears sessionStorage on logout

2. **Header Component (components/layout/Header.tsx)**
   - Listens for custom `auth-state-changed` event
   - Calls `refetch()` when auth state changes to refresh profile

3. **AuthModal Component (components/auth/AuthModal.tsx)**
   - After successful login, stores user in sessionStorage
   - Dispatches `auth-state-changed` custom event
   - No redirect - stays on same page

4. **Session Sync Endpoint (app/api/auth/sync/route.ts)**
   - Validates session server-side
   - Returns authenticated user data

## Testing Checklist

### ✓ Build Verification
- [x] `npm run build` completes successfully (24.4s)
- [x] No TypeScript errors
- [x] No compilation warnings about missing exports

### Test 1: Login Flow
**Expected Behavior**: After login, profile should immediately show in header

**Steps**:
1. Open http://localhost:3000/en
2. Click "Sign In" button
3. Enter test credentials (email/password)
4. Click "Sign In"

**Verify**:
- [ ] Modal closes smoothly
- [ ] Page stays on same URL (no redirect)
- [ ] Profile appears in header (user name/avatar)
- [ ] Console shows: `[AuthModal] Stored user in sessionStorage: {...}`
- [ ] Console shows: `[Header] Auth state changed event received, refetching user profile`
- [ ] Console shows: `[useUser] Refetch called`
- [ ] Console shows: `[useUser] Found user in sessionStorage: {...}`

**Console Logs to Look For**:
```
[AuthModal] Stored user in sessionStorage: { id: '...', email: 'test@example.com', user_metadata: {...} }
[AuthModal] Auth state changed event dispatched
[Header] Auth state changed event received, refetching user profile
[useUser] Refetch called
[useUser] Found user in sessionStorage: {...}
[useUser] Synced profile from database
```

### Test 2: Profile Persistence
**Expected**: Profile stays in header after page refresh

**Steps**:
1. Complete Test 1 (successfully logged in)
2. Refresh page (Ctrl+R or F5)
3. Wait for page to fully load

**Verify**:
- [ ] Profile still shows in header
- [ ] No login modal appears
- [ ] User can see their name/avatar

### Test 3: Course Enrollment
**Expected**: Can enroll in course without 401 error or re-login prompt

**Steps**:
1. Complete Test 1 (successfully logged in)
2. Navigate to /en/courses
3. Click on a course card
4. Click "Enroll" button

**Verify**:
- [ ] No "You must login first" message appears
- [ ] No 401 error in console
- [ ] Enrollment completes successfully
- [ ] Course appears in dashboard/my courses

**Console Checks**:
- [ ] No error messages about `401 Unauthorized`
- [ ] No error messages about missing auth session

### Test 4: Logout
**Expected**: Session properly cleared on logout

**Steps**:
1. Complete Test 1 (successfully logged in)
2. Click profile avatar in header
3. Click "Sign Out"

**Verify**:
- [ ] Profile disappears from header
- [ ] sessionStorage is cleared (console check: `sessionStorage.getItem('ainews_auth_user')` should be null)
- [ ] Modal appears when clicking protected features again

**Console Check**:
```javascript
// In browser console:
sessionStorage.getItem('ainews_auth_user')  // Should be null
```

## Known Issues to Watch For

### Issue 1: Modal Not Closing
**Symptom**: Modal stays open after login
**Possible Cause**: `/api/auth/sync` not returning valid response
**Debug**: Check `/api/auth/sync` response in network tab

### Issue 2: Profile Not Appearing
**Symptom**: Modal closes but profile never appears in header
**Possible Cause**: 
- `auth-state-changed` event not firing
- `refetch()` not executing
- sessionStorage not being populated
**Debug**: 
- Check console for all [AuthModal], [Header], [useUser] logs
- Check `sessionStorage.getItem('ainews_auth_user')` in console

### Issue 3: 401 on Enrollment
**Symptom**: Getting 401 error when trying to enroll after login
**Possible Cause**: Session not synchronized with API routes
**Debug**:
- Check `/api/courses/enroll` request in network tab
- Verify cookies are being sent (`credentials: 'include'`)
- Check middleware logs for cookie validation

## Network Debug Steps

1. **Open DevTools**: F12
2. **Go to Network Tab**: Watch for API calls
3. **Check `/api/auth/sync`**:
   - Should return 200 with `{ authenticated: true, user: {...} }`
4. **Check subsequent API calls**:
   - Should include cookies in request headers
   - Should NOT return 401

## Code Points to Debug

### Browser Console
```javascript
// Check sessionStorage
sessionStorage.getItem('ainews_auth_user')

// Check Supabase auth state
window.location.href // Should show which page you're on
```

### If Tests Fail

**Profile not appearing?**
1. Check if `/api/auth/sync` is returning user data
2. Check if `auth-state-changed` event is being dispatched
3. Check if Header's useEffect listener is attached

**401 on API calls?**
1. Verify cookies are in request (Network tab)
2. Check if middleware is sanitizing cookies correctly
3. Verify Supabase session is valid

**Modal not closing?**
1. Check `/api/auth/sync` response
2. Check if `setShowModal(false)` is being called
3. Check for JavaScript errors in console

## Rollback Plan

If auth flow breaks after these changes:
```bash
git revert HEAD  # Reverts to previous commit
npm run build
```

## Related Files

- `/lib/hooks/useUser.ts` - Core authentication hook
- `/components/layout/Header.tsx` - Header with profile display
- `/components/auth/AuthModal.tsx` - Login modal
- `/app/api/auth/sync/route.ts` - Session sync endpoint
- `/app/middleware.ts` - Cookie sanitization
- `/components/auth/AuthProvider.tsx` - Auth context (if exists)

## Build Status
- Last build: 2024-01-XX at 24.4 seconds
- Status: ✓ SUCCESS
- Deployment: Pending (GitHub push had internal error)
