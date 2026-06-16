# Getting Started with Auth Flow Testing

## 🚀 Quick Start

### 1. Current Status
- ✅ Build: 16.0 seconds, zero errors
- ✅ Code: 4 commits ready locally
- ⏳ Deployment: Pending GitHub availability (currently 503)

### 2. To Test Locally

```bash
# Start dev server (already running on http://localhost:3000)
npm run dev

# In a new terminal, verify build
npm run build
```

### 3. Test Login Flow

1. Open http://localhost:3000/en
2. Click "Sign In"
3. Enter credentials
4. **Expected:** Modal closes, profile appears in header
5. **Check:** Browser console for logs

### 4. Verify Session

In browser console:
```javascript
// Check sessionStorage
sessionStorage.getItem('ainews_auth_user')

// Check server session
await fetch('/api/debug/auth-flow').then(r => r.json()).then(console.log)

// Check diagnostics
window.authFlowDiagnostics.checkSession()
```

### 5. Test Course Enrollment

After login:
1. Go to http://localhost:3000/en/courses
2. Click on a course
3. Click "Enroll"
4. **Expected:** No 401 error, enrollment succeeds

### 6. Test Refresh Persistence

After login:
1. Press F5 to refresh page
2. **Expected:** Profile still shows in header

---

## 📋 Testing Checklist

### Login Flow
- [ ] Modal appears on sign-in click
- [ ] Can enter credentials
- [ ] Modal closes after login
- [ ] Profile shows in header
- [ ] Page doesn't navigate away
- [ ] Console shows: `[Header] Auth state changed event received`

### Session Persistence
- [ ] Refresh page
- [ ] Profile still visible
- [ ] No login prompt
- [ ] API calls don't return 401

### Course Enrollment
- [ ] After login, navigate to courses
- [ ] Click enroll button
- [ ] No 401 error
- [ ] Enrollment succeeds
- [ ] Course appears in dashboard

### Logout
- [ ] Click profile avatar
- [ ] Click sign out
- [ ] Profile disappears
- [ ] sessionStorage clears (check console)
- [ ] Login prompt appears on protected features

---

## 🔍 Console Log Verification

### Expected Logs After Login
```
[AuthModal] Stored user in sessionStorage: { id: '...', email: 'user@example.com' }
[AuthModal] Auth state changed event dispatched
[Header] Auth state changed event received, refetching user profile
[useUser] Refetch called
[useUser] Found user in sessionStorage: { ... }
[useUser] Synced profile from database
```

### Debug Commands
```javascript
// Monitor all sessionStorage changes
window.authFlowDiagnostics = setupAuthFlowDiagnostics();

// Check current session
window.authFlowDiagnostics.checkSession();

// Simulate auth event (for testing)
window.authFlowDiagnostics.simulateAuthChange();

// Clear session manually
window.authFlowDiagnostics.clearSession();
```

---

## 📊 Monitoring During Testing

### Network Tab
1. Open DevTools → Network
2. Filter: Fetch/XHR
3. Look for:
   - `/api/auth/sync` → Should return 200 with user data
   - `/api/courses/enroll` → Should return 200 after login
   - Other API calls → No 401 errors

### Console Tab
1. Monitor for:
   - No red error messages
   - Expected log messages
   - Custom event dispatches
2. Run diagnostic commands as needed

### Storage Tab
1. Check sessionStorage:
   - `ainews_auth_user` → Should contain user object after login
   - Should be empty after logout
2. Check Cookies:
   - Supabase auth cookies should be present
   - Should persist across page refresh

---

## ⚠️ Common Issues & Solutions

### Issue: Profile Not Appearing
**Symptom:** Modal closes but profile never shows in header

**Debug:**
1. Check console for error messages
2. Run: `window.authFlowDiagnostics.checkSessionStorage()`
3. Check Network tab for `/api/auth/sync` response
4. Verify: `sessionStorage.getItem('ainews_auth_user')`

**Solutions:**
- Clear browser cache and try again
- Check browser console for JavaScript errors
- Verify `/api/auth/sync` is returning correct data

### Issue: 401 on Enrollment
**Symptom:** Clicking enroll shows 401 error

**Debug:**
1. Check Network tab for `/api/courses/enroll` request
2. Check if cookies are being sent
3. Run: `await fetch('/api/debug/auth-flow').then(r => r.json()).then(console.log)`
4. Verify: Is `authenticated: true`?

**Solutions:**
- Refresh page (might be stale session)
- Log out and log back in
- Check if cookies are properly set

### Issue: Modal Doesn't Close
**Symptom:** Modal stays open after login

**Debug:**
1. Check Network tab for `/api/auth/sync`
2. Is it returning a 200 response?
3. Check response body for user data
4. Look for JavaScript errors in console

**Solutions:**
- Check if `/api/auth/sync` endpoint is working
- Try creating a new user account
- Check Supabase auth setup

---

## 🔧 Advanced Diagnostics

### Check Build Output
```bash
npm run build 2>&1 | grep -E "error|warning|✓"
```

### View TypeScript Errors
```bash
npm run build
```

### Monitor Event Firing
```javascript
// Listen for all events
window.addEventListener('auth-state-changed', (event) => {
  console.log('🔄 Auth event:', event.detail);
});
```

### Check Middleware Logs
The middleware logs cookie normalization in browser console:
```javascript
// Should see:
[CookieNorm] Normalization complete
[Middleware] Cookie: sb-... (base64url encoded)
```

---

## 📝 When to Push to GitHub

Once GitHub is available (503 error resolves):
```bash
git push origin master
```

This will:
1. Push 4 commits
2. Trigger Vercel deployment
3. Run build verification
4. Deploy to production

---

## 🎯 Success Criteria

After testing, all should be ✅:
- [ ] Profile appears immediately after login
- [ ] No console errors during login
- [ ] Session persists on refresh
- [ ] Course enrollment works without 401
- [ ] Logout clears session
- [ ] `/api/debug/auth-flow` shows authenticated: true
- [ ] Build succeeds on Vercel

---

## 📚 Related Documentation

| Document | Purpose |
|----------|---------|
| `AUTH_FLOW_TESTING.md` | Comprehensive testing guide |
| `COMPLETION_SUMMARY.md` | Quick overview with visual diagrams |
| `IMPLEMENTATION_REPORT.md` | Detailed technical report |
| `docs/AUTH_FLOW_SOLUTION.md` | Architecture and design decisions |

---

## 🆘 Getting Help

**If something isn't working:**

1. **Check logs first:**
   - Browser console (expected logs listed above)
   - Network tab (check `/api/auth/sync` response)
   - Storage tab (check sessionStorage and cookies)

2. **Run diagnostics:**
   ```javascript
   window.authFlowDiagnostics.checkSession()
   window.authFlowDiagnostics.checkSessionStorage()
   ```

3. **Try common fixes:**
   - Refresh page
   - Clear browser cache
   - Log out and log back in
   - Check `/api/debug/auth-flow`

4. **Check recent commits:**
   ```bash
   git log --oneline -10
   ```

---

## ✅ Testing Completed

Mark off as you test:
- [ ] Local build succeeds
- [ ] Dev server starts without errors
- [ ] Can open app at http://localhost:3000
- [ ] Login modal opens and works
- [ ] Profile appears after successful login
- [ ] Profile persists on page refresh
- [ ] Course enrollment works
- [ ] Logout clears session
- [ ] No 401 errors on protected endpoints
- [ ] All console logs match expected pattern

---

**Status: Ready for Testing**

Start with: `npm run dev`
Then: http://localhost:3000/en
