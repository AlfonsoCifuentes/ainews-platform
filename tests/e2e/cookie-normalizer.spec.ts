import { test, expect } from '@playwright/test';

// Ensures that cookie/localStorage normalization runs before Supabase client initialises
// and that base64- prefixed entries are rewritten/removed.

test('normalizes base64 prefixed localStorage and cookies', async ({ page }) => {
  await page.goto('/');

  // Prepare a JSON object to store
  const payload = { user: { id: 'test-user' }, expires_at: 9999999999 };
  const base64 = (() => {
    const s = btoa(JSON.stringify(payload));
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  })();

  // Set localStorage and cookies with base64- and base64url- prefixed tokens
  await page.evaluate((base64) => {
    localStorage.setItem('supabase.auth.token', `base64-${base64}`);
    localStorage.setItem('supabase.auth.user', `base64url-${base64}`);
    document.cookie = `sb-access-token=base64-${base64}; path=/;`;
  }, base64);

  // Reload to let our beforeInteractive script normalize storage
  await page.reload();

  // Check localStorage keys are no longer base64 prefixed
  const keys = await page.evaluate(() => {
    const result = {} as Record<string, string | null>;
    result['supabase.auth.token'] = localStorage.getItem('supabase.auth.token');
    result['supabase.auth.user'] = localStorage.getItem('supabase.auth.user');
    return result;
  });

  // Validate the tokens are now JSON strings (starting with '{') rather than base64- prefixes
  for (const [k, v] of Object.entries(keys)) {
    expect(v).toBeTruthy();
    expect(v?.startsWith('base64-')).toBeFalsy();
    expect(v?.startsWith('{')).toBeTruthy();
  }

  // Check cookie is normalized
  const cookie = await page.evaluate(() => document.cookie);
  expect(cookie).not.toContain('base64-');
});
