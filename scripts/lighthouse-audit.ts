#!/usr/bin/env tsx
// @ts-nocheck

/**
 * Lighthouse Performance Audit Script
 * 
 * Runs Lighthouse audits on key pages and generates a report.
 * Targets: >90 mobile, >95 desktop
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'fs/promises';
import path from 'path';

interface AuditResult {
  url: string;
  device: 'mobile' | 'desktop';
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: number;
  lcp: number;
  cls: number;
  tti: number;
  tbt: number;
}

const PAGES_TO_AUDIT = [
  '/',
  '/en/news',
  '/en/courses',
  '/en/kg',
  '/en/dashboard',
  '/en/trending',
  '/en/analytics',
];

const BASE_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';

async function runAudit(url: string, device: 'mobile' | 'desktop'): Promise<AuditResult> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  const options: lighthouse.Flags = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
    emulatedFormFactor: device,
    throttling: device === 'mobile' 
      ? {
          rttMs: 150,
          throughputKbps: 1638.4,
          requestLatencyMs: 562.5,
          downloadThroughputKbps: 1638.4,
          uploadThroughputKbps: 675,
          cpuSlowdownMultiplier: 4
        }
      : {
          rttMs: 40,
          throughputKbps: 10240,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
          cpuSlowdownMultiplier: 1
        },
  };

  const runnerResult = await lighthouse(url, options);
  
  await chrome.kill();
  
  if (!runnerResult?.lhr) {
    throw new Error('Lighthouse failed to generate report');
  }

  const { lhr } = runnerResult;

  return {
    url,
    device,
    performance: Math.round((lhr.categories.performance?.score || 0) * 100),
    accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
    seo: Math.round((lhr.categories.seo?.score || 0) * 100),
    fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
    lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
    cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
    tti: lhr.audits['interactive']?.numericValue || 0,
    tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
  };
}

async function main() {
  console.log('🚀 Starting Lighthouse Performance Audit...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results: AuditResult[] = [];
  
  for (const page of PAGES_TO_AUDIT) {
    const fullUrl = `${BASE_URL}${page}`;
    
    console.log(`📱 Auditing: ${fullUrl} (mobile)...`);
    const mobileResult = await runAudit(fullUrl, 'mobile');
    results.push(mobileResult);
    
    console.log(`💻 Auditing: ${fullUrl} (desktop)...`);
    const desktopResult = await runAudit(fullUrl, 'desktop');
    results.push(desktopResult);
    
    console.log('');
  }

  // Generate Report
  console.log('📊 LIGHTHOUSE AUDIT REPORT');
  console.log('='.repeat(100));
  console.log('');

  for (const result of results) {
    const perfStatus = result.performance >= (result.device === 'mobile' ? 90 : 95) ? '✅' : '❌';
    const a11yStatus = result.accessibility >= 90 ? '✅' : '❌';
    
    console.log(`${result.url} [${result.device}]`);
    console.log(`  ${perfStatus} Performance: ${result.performance}/100`);
    console.log(`  ${a11yStatus} Accessibility: ${result.accessibility}/100`);
    console.log(`  Best Practices: ${result.bestPractices}/100`);
    console.log(`  SEO: ${result.seo}/100`);
    console.log(`  Core Web Vitals:`);
    console.log(`    - FCP: ${(result.fcp / 1000).toFixed(2)}s`);
    console.log(`    - LCP: ${(result.lcp / 1000).toFixed(2)}s`);
    console.log(`    - CLS: ${result.cls.toFixed(3)}`);
    console.log(`    - TTI: ${(result.tti / 1000).toFixed(2)}s`);
    console.log(`    - TBT: ${result.tbt.toFixed(0)}ms`);
    console.log('');
  }

  // Calculate Averages
  const mobileResults = results.filter(r => r.device === 'mobile');
  const desktopResults = results.filter(r => r.device === 'desktop');

  const avgMobilePerf = mobileResults.reduce((sum, r) => sum + r.performance, 0) / mobileResults.length;
  const avgDesktopPerf = desktopResults.reduce((sum, r) => sum + r.performance, 0) / desktopResults.length;

  console.log('📈 SUMMARY');
  console.log('='.repeat(100));
  console.log(`Average Mobile Performance: ${avgMobilePerf.toFixed(1)}/100 ${avgMobilePerf >= 90 ? '✅' : '❌'}`);
  console.log(`Average Desktop Performance: ${avgDesktopPerf.toFixed(1)}/100 ${avgDesktopPerf >= 95 ? '✅' : '❌'}`);

  // Save to file
  const reportPath = path.join(process.cwd(), 'lighthouse-report.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);

  // Exit with error if targets not met
  if (avgMobilePerf < 90 || avgDesktopPerf < 95) {
    console.log('\n❌ Performance targets not met!');
    process.exit(1);
  } else {
    console.log('\n✅ All performance targets met!');
  }
}

main().catch((error) => {
  console.error('Error running Lighthouse audit:', error);
  process.exit(1);
});
