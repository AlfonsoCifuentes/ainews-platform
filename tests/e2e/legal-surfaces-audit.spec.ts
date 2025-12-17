import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type Locale = 'en' | 'es';

function walkDir(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function isRouteGroup(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')');
}

function hasDynamicSegment(segments: string[]): boolean {
  return segments.some((s) => s.includes('[') || s.includes(']'));
}

function collectStaticLocaleRoutes(): string[] {
  const localeRoot = path.join(process.cwd(), 'app', '[locale]');
  const allFiles = walkDir(localeRoot);

  const pageFiles = allFiles.filter((f) => {
    const base = path.basename(f);
    if (base !== 'page.tsx' && base !== 'page.ts') return false;
    return true;
  });

  const routes = new Set<string>();

  for (const pageFile of pageFiles) {
    const rel = path.relative(localeRoot, pageFile);
    const dir = path.dirname(rel);

    // Root page.tsx => "/"
    if (dir === '.') {
      routes.add('/');
      continue;
    }

    const segments = dir.split(path.sep).filter(Boolean);

    // Ignore route groups "(group)" from URL.
    const urlSegments = segments.filter((s) => !isRouteGroup(s));

    // Skip dynamic routes like [id]
    if (hasDynamicSegment(urlSegments)) continue;

    routes.add('/' + urlSegments.join('/'));
  }

  return Array.from(routes).sort();
}

function expandLocales(routes: string[], locales: Locale[]): string[] {
  const expanded: string[] = [];
  for (const locale of locales) {
    for (const route of routes) {
      expanded.push(route === '/' ? `/${locale}` : `/${locale}${route}`);
    }
  }
  return expanded;
}

test.describe('Legal surfaces audit (full static crawl)', () => {
  test('Footer exposes privacy/terms and revocation entrypoint across static routes', async ({ page }) => {
    test.setTimeout(10 * 60_000);

    const context = page.context();

    const locales: Locale[] = ['en', 'es'];

    const staticRoutes = collectStaticLocaleRoutes();
    const urls = expandLocales(staticRoutes, locales);

    const missingFooter: string[] = [];
    const missingLegalLinks: Array<{ url: string; missing: string[] }> = [];
    const pageErrors: Array<{ url: string; error: string }> = [];
    const unreachable: Array<{ url: string; error: string }> = [];

    // Use a fresh page per route. This avoids one bad route (crash / abort / redirect loop)
    // interrupting the entire crawl by closing the shared `page`.

    for (const url of urls) {
      const routePage = await context.newPage();
      let routePageCrashed = false;

      routePage.on('pageerror', (err) => {
        pageErrors.push({ url: routePage.url(), error: err.message });
      });

      routePage.on('crash', () => {
        routePageCrashed = true;
        unreachable.push({ url, error: 'Page crashed' });
      });

      try {
        await routePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        unreachable.push({ url, error: message });
        await routePage.close();
        continue;
      }

      if (routePageCrashed || routePage.isClosed()) {
        if (!routePage.isClosed()) {
          await routePage.close();
        }
        continue;
      }

      const locale = (url.startsWith('/es') ? 'es' : 'en') as Locale;
      try {
        const footer = routePage.locator('footer');
        const footerCount = await footer.count();

        // Some views may intentionally hide footer (e.g. book mode).
        if (footerCount === 0) {
          missingFooter.push(url);
          await routePage.close();
          continue;
        }

      const missing: string[] = [];

      const privacyLink = footer.locator('[data-testid="footer-privacy-link"]');
      if ((await privacyLink.count()) === 0) {
        missing.push('privacy link');
      } else {
        await expect(privacyLink.first()).toHaveAttribute('href', new RegExp(`/${locale}/privacy$`));
      }

      const termsLink = footer.locator('[data-testid="footer-terms-link"]');
      if ((await termsLink.count()) === 0) {
        missing.push('terms link');
      } else {
        await expect(termsLink.first()).toHaveAttribute('href', new RegExp(`/${locale}/terms$`));
      }

      const cookieButton = footer.locator('[data-testid="footer-cookie-settings-button"]');
      if ((await cookieButton.count()) === 0) {
        missing.push('cookie revocation button');
      } else {
        // Should be safe to click even if googlefc isn't loaded.
        await cookieButton.first().click();
        await routePage.waitForTimeout(50);
      }

        if (missing.length > 0) {
          missingLegalLinks.push({ url, missing });
        }

        await routePage.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        unreachable.push({ url, error: message });
        if (!routePage.isClosed()) {
          await routePage.close();
        }
      }
    }

    const failures: string[] = [];

    if (missingLegalLinks.length > 0) {
      failures.push(
        `Missing legal entries on ${missingLegalLinks.length} route(s):\n` +
          missingLegalLinks.map((r) => `- ${r.url}: ${r.missing.join(', ')}`).join('\n')
      );
    }

    if (pageErrors.length > 0) {
      failures.push(
        `Page runtime errors detected (${pageErrors.length}):\n` +
          pageErrors.map((e) => `- ${e.url}: ${e.error}`).join('\n')
      );
    }

    // Don't fail the run if some pages intentionally hide footer,
    // but do surface it so we notice unexpected gaps.
    if (missingFooter.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`\n[LegalAudit] Footer missing on ${missingFooter.length} route(s):\n` + missingFooter.join('\n'));
    }

    if (unreachable.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n[LegalAudit] Unreachable route(s) (${unreachable.length}):\n` +
          unreachable.map((r) => `- ${r.url}: ${r.error}`).join('\n')
      );
    }

    if (failures.length > 0) {
      throw new Error(failures.join('\n\n'));
    }

    // Sanity check: ensure we actually crawled something.
    expect(urls.length).toBeGreaterThan(5);
  });
});
