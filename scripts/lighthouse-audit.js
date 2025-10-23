#!/usr/bin/env node#!/usr/bin/env node



/**/**

 * Lighthouse Performance Audit Script * Lighthouse Performance Audit Script

 *  * 

 * Runs Lighthouse audits on key pages and generates a report. * Runs Lighthouse audits on key pages and generates a report.

 * Targets: >90 mobile, >95 desktop * Targets: >90 mobile, >95 desktop

 *  * 

 * Usage: * Usage:

 *   node scripts/lighthouse-audit.js *   LIGHTHOUSE_URL="https://your-site" node scripts/lighthouse-audit.js

 */ */



const lighthouse = require('lighthouse');const lighthouse = require('lighthouse');

const chromeLauncher = require('chrome-launcher');const chromeLauncher = require('chrome-launcher');

const fs = require('fs/promises');const fs = require('fs/promises');

const path = require('path');const path = require('path');



const PAGES_TO_AUDIT = [const PAGES_TO_AUDIT = [

  '/',  '/',

  '/en/news',  '/en/news',

  '/en/courses',  '/en/courses',

  '/en/kg',  '/en/kg',

  '/en/dashboard',  '/en/dashboard',

  '/en/trending',  '/en/trending',

  '/en/analytics'  '/en/analytics'

];];



const BASE_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';const BASE_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';

const OUTPUT_DIR = path.join(__dirname, '..', 'lighthouse-results');



async function auditPage(url, device = 'mobile') {

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });async function runAudit(url, device) {const path = require('path');

  

  const options = {  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

    port: chrome.port,

    logLevel: 'error',const PAGES_TO_AUDIT = [

    output: 'json',

    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],  const options = {

  };

    logLevel: 'error',  '/',interface AuditResult {

  if (device === 'mobile') {

    options.formFactor = 'mobile';    output: 'json',

    options.throttling = {

      rttMs: 150,    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],  '/en/news',  url: string;

      throughputKbps: 1638.4,

      cpuSlowdownMultiplier: 4,    port: chrome.port,

    };

  } else {    formFactor: device,  '/en/courses',  device: 'mobile' | 'desktop';

    options.formFactor = 'desktop';

    options.throttling = {    throttling: device === 'mobile'

      rttMs: 40,

      throughputKbps: 10240,      ? {  '/en/kg',  performance: number;

      cpuSlowdownMultiplier: 1,

    };          rttMs: 150,

  }

          throughputKbps: 1638.4,  '/en/dashboard',  accessibility: number;

  const fullUrl = `${BASE_URL}${url}`;

  console.log(`Auditing ${fullUrl} (${device})...`);          requestLatencyMs: 562.5,



  try {          downloadThroughputKbps: 1638.4,  '/en/trending',  bestPractices: number;

    const runnerResult = await lighthouse(fullUrl, options);

    await chrome.kill();          uploadThroughputKbps: 675,



    const { categories } = runnerResult.lhr;          cpuSlowdownMultiplier: 4  '/en/analytics',  seo: number;

    

    return {        }

      url,

      device,      : {];  fcp: number;

      performance: Math.round(categories.performance.score * 100),

      accessibility: Math.round(categories.accessibility.score * 100),          rttMs: 40,

      bestPractices: Math.round(categories['best-practices'].score * 100),

      seo: Math.round(categories.seo.score * 100),          throughputKbps: 10240,  lcp: number;

      metrics: {

        fcp: runnerResult.lhr.audits['first-contentful-paint'].numericValue,          requestLatencyMs: 0,

        lcp: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,

        tbt: runnerResult.lhr.audits['total-blocking-time'].numericValue,          downloadThroughputKbps: 0,const BASE_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';  cls: number;

        cls: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue,

        si: runnerResult.lhr.audits['speed-index'].numericValue,          uploadThroughputKbps: 0,

      }

    };          cpuSlowdownMultiplier: 1  tti: number;

  } catch (error) {

    console.error(`Error auditing ${fullUrl}:`, error.message);        }

    await chrome.kill();

    return null;  };async function runAudit(url, device) {  tbt: number;

  }

}



async function main() {  const runnerResult = await lighthouse(url, options);  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });}

  console.log('🔍 Starting Lighthouse Performance Audit\n');

  console.log(`Base URL: ${BASE_URL}`);  await chrome.kill();

  console.log(`Pages: ${PAGES_TO_AUDIT.length}\n`);

  

  const results = [];

  if (!runnerResult || !runnerResult.lhr) {

  for (const page of PAGES_TO_AUDIT) {

    const mobileResult = await auditPage(page, 'mobile');    throw new Error('Lighthouse failed to generate report');  const options = {const PAGES_TO_AUDIT = [

    if (mobileResult) results.push(mobileResult);

      }

    const desktopResult = await auditPage(page, 'desktop');

    if (desktopResult) results.push(desktopResult);    logLevel: 'error',  '/',

  }

  const { lhr } = runnerResult;

  // Create output directory

  await fs.mkdir(OUTPUT_DIR, { recursive: true });    output: 'json',  '/en/news',



  // Save JSON report  return {

  const reportPath = path.join(OUTPUT_DIR, `audit-${Date.now()}.json`);

  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));    url,    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],  '/en/courses',



  // Generate summary    device,

  console.log('\n📊 Audit Summary\n');

  console.log('=' .repeat(80));    performance: Math.round((lhr.categories.performance?.score || 0) * 100),    port: chrome.port,  '/en/kg',

  

  for (const result of results) {    accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),

    const { url, device, performance, accessibility, bestPractices, seo, metrics } = result;

    console.log(`\n${url} (${device})`);    bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),    formFactor: device,  '/en/dashboard',

    console.log(`  Performance:    ${performance}/100 ${performance >= 90 ? '✅' : '⚠️'}`);

    console.log(`  Accessibility:  ${accessibility}/100 ${accessibility >= 90 ? '✅' : '⚠️'}`);    seo: Math.round((lhr.categories.seo?.score || 0) * 100),

    console.log(`  Best Practices: ${bestPractices}/100 ${bestPractices >= 90 ? '✅' : '⚠️'}`);

    console.log(`  SEO:            ${seo}/100 ${seo >= 90 ? '✅' : '⚠️'}`);    fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,    throttling: device === 'mobile'   '/en/trending',

    console.log(`  Metrics:`);

    console.log(`    FCP: ${Math.round(metrics.fcp)}ms`);    lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,

    console.log(`    LCP: ${Math.round(metrics.lcp)}ms`);

    console.log(`    TBT: ${Math.round(metrics.tbt)}ms`);    cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,      ? {  '/en/analytics',

    console.log(`    CLS: ${metrics.cls.toFixed(3)}`);

    console.log(`    SI:  ${Math.round(metrics.si)}ms`);    tti: lhr.audits['interactive']?.numericValue || 0,

  }

    tbt: lhr.audits['total-blocking-time']?.numericValue || 0          rttMs: 150,];

  console.log('\n' + '='.repeat(80));

  console.log(`\n✅ Report saved to: ${reportPath}\n`);  };



  // Check if targets are met}          throughputKbps: 1638.4,

  const failedAudits = results.filter(r => 

    (r.device === 'mobile' && r.performance < 90) ||

    (r.device === 'desktop' && r.performance < 95)

  );async function main() {          requestLatencyMs: 562.5,const BASE_URL = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';



  if (failedAudits.length > 0) {  console.log('🚀 Starting Lighthouse Performance Audit...\n');

    console.log('⚠️  Some pages did not meet performance targets:');

    failedAudits.forEach(r => {  console.log(`Base URL: ${BASE_URL}\n`);          downloadThroughputKbps: 1638.4,

      console.log(`  - ${r.url} (${r.device}): ${r.performance}/100`);

    });

    process.exit(1);

  } else {  const results = [];          uploadThroughputKbps: 675,async function runAudit(url: string, device: 'mobile' | 'desktop'): Promise<AuditResult> {

    console.log('✅ All pages meet performance targets!');

  }

}

  for (const page of PAGES_TO_AUDIT) {          cpuSlowdownMultiplier: 4  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

main().catch(err => {

  console.error('Fatal error:', err);    const fullUrl = `${BASE_URL}${page}`;

  process.exit(1);

});        }  


    console.log(`📱 Auditing ${fullUrl} (mobile)...`);

    const mobileResult = await runAudit(fullUrl, 'mobile');      : {  const options: lighthouse.Flags = {

    results.push(mobileResult);

          rttMs: 40,    logLevel: 'error',

    console.log(`💻 Auditing ${fullUrl} (desktop)...`);

    const desktopResult = await runAudit(fullUrl, 'desktop');          throughputKbps: 10240,    output: 'json',

    results.push(desktopResult);

          requestLatencyMs: 0,    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],

    console.log('');

  }          downloadThroughputKbps: 0,    port: chrome.port,



  const mobileResults = results.filter((r) => r.device === 'mobile');          uploadThroughputKbps: 0,    emulatedFormFactor: device,

  const desktopResults = results.filter((r) => r.device === 'desktop');

          cpuSlowdownMultiplier: 1    throttling: device === 'mobile' 

  const avgMobilePerf = mobileResults.reduce((sum, r) => sum + r.performance, 0) / mobileResults.length;

  const avgDesktopPerf = desktopResults.reduce((sum, r) => sum + r.performance, 0) / desktopResults.length;        },      ? {



  const reportPath = path.join(process.cwd(), 'lighthouse-report.json');    screenEmulation: {          rttMs: 150,

  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));

      mobile: device === 'mobile',          throughputKbps: 1638.4,

  console.log('\n📈 SUMMARY');

  console.log('='.repeat(80));      width: device === 'mobile' ? 375 : 1350,          requestLatencyMs: 562.5,

  console.log(`Average Mobile Performance: ${avgMobilePerf.toFixed(1)}/100`);

  console.log(`Average Desktop Performance: ${avgDesktopPerf.toFixed(1)}/100`);      height: device === 'mobile' ? 667 : 940,          downloadThroughputKbps: 1638.4,

  console.log(`\nReport saved to ${reportPath}`);

      deviceScaleFactor: device === 'mobile' ? 2 : 1,          uploadThroughputKbps: 675,

  if (avgMobilePerf < 90 || avgDesktopPerf < 95) {

    console.log('\n❌ Performance targets not met!');      disabled: false,          cpuSlowdownMultiplier: 4

    process.exit(1);

  }    },        }



  console.log('\n✅ All performance targets met!');  };      : {

}

          rttMs: 40,

main().catch((error) => {

  console.error('Error running Lighthouse audit:', error);  const runnerResult = await lighthouse(url, options);          throughputKbps: 10240,

  process.exit(1);

});            requestLatencyMs: 0,


  await chrome.kill();          downloadThroughputKbps: 0,

            uploadThroughputKbps: 0,

  if (!runnerResult || !runnerResult.lhr) {          cpuSlowdownMultiplier: 1

    throw new Error('Lighthouse failed to generate report');        },

  }  };



  const { lhr } = runnerResult;  const runnerResult = await lighthouse(url, options);

  

  return {  await chrome.kill();

    url,  

    device,  if (!runnerResult?.lhr) {

    performance: Math.round((lhr.categories.performance?.score || 0) * 100),    throw new Error('Lighthouse failed to generate report');

    accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),  }

    bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),

    seo: Math.round((lhr.categories.seo?.score || 0) * 100),  const { lhr } = runnerResult;

    fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,

    lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,  return {

    cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,    url,

    tti: lhr.audits['interactive']?.numericValue || 0,    device,

    tbt: lhr.audits['total-blocking-time']?.numericValue || 0,    performance: Math.round((lhr.categories.performance?.score || 0) * 100),

  };    accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),

}    bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),

    seo: Math.round((lhr.categories.seo?.score || 0) * 100),

async function main() {    fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,

  console.log('🚀 Starting Lighthouse Performance Audit...\n');    lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,

  console.log(`Base URL: ${BASE_URL}\n`);    cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,

    tti: lhr.audits['interactive']?.numericValue || 0,

  const results = [];    tbt: lhr.audits['total-blocking-time']?.numericValue || 0,

    };

  for (const page of PAGES_TO_AUDIT) {}

    const fullUrl = `${BASE_URL}${page}`;

    async function main() {

    // Mobile audit  console.log('🚀 Starting Lighthouse Performance Audit...\n');

    console.log(`📱 Auditing ${page} (Mobile)...`);  console.log(`Base URL: ${BASE_URL}\n`);

    try {

      const mobileResult = await runAudit(fullUrl, 'mobile');  const results: AuditResult[] = [];

      results.push(mobileResult);  

      console.log(`   Performance: ${mobileResult.performance}/100`);  for (const page of PAGES_TO_AUDIT) {

      console.log(`   Accessibility: ${mobileResult.accessibility}/100`);    const fullUrl = `${BASE_URL}${page}`;

      console.log(`   LCP: ${(mobileResult.lcp / 1000).toFixed(2)}s\n`);    

    } catch (error) {    console.log(`📱 Auditing: ${fullUrl} (mobile)...`);

      console.error(`   ❌ Failed: ${error.message}\n`);    const mobileResult = await runAudit(fullUrl, 'mobile');

    }    results.push(mobileResult);

        

    // Desktop audit    console.log(`💻 Auditing: ${fullUrl} (desktop)...`);

    console.log(`🖥️  Auditing ${page} (Desktop)...`);    const desktopResult = await runAudit(fullUrl, 'desktop');

    try {    results.push(desktopResult);

      const desktopResult = await runAudit(fullUrl, 'desktop');    

      results.push(desktopResult);    console.log('');

      console.log(`   Performance: ${desktopResult.performance}/100`);  }

      console.log(`   Accessibility: ${desktopResult.accessibility}/100`);

      console.log(`   LCP: ${(desktopResult.lcp / 1000).toFixed(2)}s\n`);  // Generate Report

    } catch (error) {  console.log('📊 LIGHTHOUSE AUDIT REPORT');

      console.error(`   ❌ Failed: ${error.message}\n`);  console.log('='.repeat(100));

    }  console.log('');

  }

  for (const result of results) {

  // Generate summary    const perfStatus = result.performance >= (result.device === 'mobile' ? 90 : 95) ? '✅' : '❌';

  console.log('\n📊 Summary Report:\n');    const a11yStatus = result.accessibility >= 90 ? '✅' : '❌';

  console.log('═══════════════════════════════════════════════════════════\n');    

    console.log(`${result.url} [${result.device}]`);

  const mobilePerfScores = results.filter(r => r.device === 'mobile').map(r => r.performance);    console.log(`  ${perfStatus} Performance: ${result.performance}/100`);

  const desktopPerfScores = results.filter(r => r.device === 'desktop').map(r => r.performance);    console.log(`  ${a11yStatus} Accessibility: ${result.accessibility}/100`);

      console.log(`  Best Practices: ${result.bestPractices}/100`);

  const avgMobilePerf = Math.round(mobilePerfScores.reduce((a, b) => a + b, 0) / mobilePerfScores.length);    console.log(`  SEO: ${result.seo}/100`);

  const avgDesktopPerf = Math.round(desktopPerfScores.reduce((a, b) => a + b, 0) / desktopPerfScores.length);    console.log(`  Core Web Vitals:`);

    console.log(`    - FCP: ${(result.fcp / 1000).toFixed(2)}s`);

  console.log(`Average Mobile Performance:  ${avgMobilePerf}/100 ${avgMobilePerf >= 90 ? '✅' : '⚠️'}`);    console.log(`    - LCP: ${(result.lcp / 1000).toFixed(2)}s`);

  console.log(`Average Desktop Performance: ${avgDesktopPerf}/100 ${avgDesktopPerf >= 95 ? '✅' : '⚠️'}\n`);    console.log(`    - CLS: ${result.cls.toFixed(3)}`);

    console.log(`    - TTI: ${(result.tti / 1000).toFixed(2)}s`);

  // Pages below threshold    console.log(`    - TBT: ${result.tbt.toFixed(0)}ms`);

  const failingPages = results.filter(r =>     console.log('');

    (r.device === 'mobile' && r.performance < 90) ||  }

    (r.device === 'desktop' && r.performance < 95)

  );  // Calculate Averages

  const mobileResults = results.filter(r => r.device === 'mobile');

  if (failingPages.length > 0) {  const desktopResults = results.filter(r => r.device === 'desktop');

    console.log('⚠️  Pages Below Threshold:\n');

    failingPages.forEach(page => {  const avgMobilePerf = mobileResults.reduce((sum, r) => sum + r.performance, 0) / mobileResults.length;

      console.log(`   ${page.url} (${page.device}): ${page.performance}/100`);  const avgDesktopPerf = desktopResults.reduce((sum, r) => sum + r.performance, 0) / desktopResults.length;

    });

    console.log('');  console.log('📈 SUMMARY');

  }  console.log('='.repeat(100));

  console.log(`Average Mobile Performance: ${avgMobilePerf.toFixed(1)}/100 ${avgMobilePerf >= 90 ? '✅' : '❌'}`);

  // Best performing pages  console.log(`Average Desktop Performance: ${avgDesktopPerf.toFixed(1)}/100 ${avgDesktopPerf >= 95 ? '✅' : '❌'}`);

  const bestPages = results

    .sort((a, b) => b.performance - a.performance)  // Save to file

    .slice(0, 3);  const reportPath = path.join(process.cwd(), 'lighthouse-report.json');

  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));

  console.log('🏆 Best Performing Pages:\n');  console.log(`\n💾 Full report saved to: ${reportPath}`);

  bestPages.forEach((page, idx) => {

    console.log(`   ${idx + 1}. ${page.url} (${page.device}): ${page.performance}/100`);  // Exit with error if targets not met

  });  if (avgMobilePerf < 90 || avgDesktopPerf < 95) {

  console.log('');    console.log('\n❌ Performance targets not met!');

    process.exit(1);

  // Save to file  } else {

  const reportPath = path.join(process.cwd(), 'lighthouse-report.json');    console.log('\n✅ All performance targets met!');

  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));  }

  console.log(`📄 Full report saved to: ${reportPath}\n`);}



  console.log('✅ Lighthouse audit complete!\n');main().catch((error) => {

  console.error('Error running Lighthouse audit:', error);

  // Exit with error code if targets not met  process.exit(1);

  if (avgMobilePerf < 90 || avgDesktopPerf < 95) {});

    console.log('❌ Performance targets not met. Please optimize.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
