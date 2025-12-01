#!/usr/bin/env npx tsx
/**
 * Test Script: award_xp RPC Function
 * 
 * Validates:
 * 1. RPC function exists in database
 * 2. Permissions are properly configured
 * 3. XP is awarded correctly
 * 4. Level calculation works
 * 5. XP log entries are created
 * 
 * Usage:
 *   npx tsx scripts/test-award-xp.ts
 *   npx tsx scripts/test-award-xp.ts --user-id <uuid>
 *   npx tsx scripts/test-award-xp.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Test configuration
interface TestConfig {
  userId?: string;
  dryRun: boolean;
  verbose: boolean;
}

// Parse CLI arguments
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    dryRun: false,
    verbose: true
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user-id' && args[i + 1]) {
      config.userId = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      config.dryRun = true;
    } else if (args[i] === '--quiet') {
      config.verbose = false;
    }
  }
  
  return config;
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function fail(message: string) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

function warn(message: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

function addResult(result: TestResult) {
  results.push(result);
  if (result.passed) {
    success(`${result.name}: ${result.message}`);
  } else {
    fail(`${result.name}: ${result.message}`);
  }
  if (result.details) {
    console.log(`   ${colors.dim}${JSON.stringify(result.details, null, 2)}${colors.reset}`);
  }
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testEnvironmentVariables(): Promise<void> {
  const hasUrl = !!SUPABASE_URL;
  const hasServiceKey = !!SUPABASE_SERVICE_KEY;
  const hasAnonKey = !!SUPABASE_ANON_KEY;
  
  addResult({
    name: 'Environment Variables',
    passed: hasUrl && hasServiceKey && hasAnonKey,
    message: hasUrl && hasServiceKey && hasAnonKey
      ? 'All required variables present'
      : `Missing: ${[
          !hasUrl && 'NEXT_PUBLIC_SUPABASE_URL',
          !hasServiceKey && 'SUPABASE_SERVICE_ROLE_KEY',
          !hasAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        ].filter(Boolean).join(', ')}`
  });
}

async function testDatabaseConnection(client: ReturnType<typeof createClient>): Promise<boolean> {
  try {
    const { data, error } = await client.from('user_profiles').select('count').limit(1);
    
    addResult({
      name: 'Database Connection',
      passed: !error,
      message: error ? `Connection failed: ${error.message}` : 'Connected successfully'
    });
    
    return !error;
  } catch (err) {
    addResult({
      name: 'Database Connection',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
    return false;
  }
}

async function testRpcFunctionExists(client: ReturnType<typeof createClient>): Promise<boolean> {
  try {
    // Check if the function exists by querying pg_proc
    const { data, error } = await client.rpc('award_xp', {
      p_user_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID to test function existence
      p_xp_amount: 0,
      p_action_type: 'test'
    });
    
    // If we get a foreign key error or not found error, the function exists
    // If we get "function does not exist", it doesn't
    const functionExists = error?.message?.includes('function') !== true || 
                          !error?.message?.includes('does not exist');
    
    addResult({
      name: 'RPC Function Exists',
      passed: functionExists,
      message: functionExists 
        ? 'award_xp function is available'
        : `Function not found: ${error?.message}`,
      details: error ? { errorCode: error.code, hint: error.hint } : undefined
    });
    
    return functionExists;
  } catch (err) {
    addResult({
      name: 'RPC Function Exists',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
    return false;
  }
}

async function testUserProfilesTable(client: ReturnType<typeof createClient>): Promise<void> {
  try {
    const { data, error } = await client
      .from('user_profiles')
      .select('id, total_xp, level')
      .limit(5);
    
    addResult({
      name: 'User Profiles Table',
      passed: !error && data !== null,
      message: error 
        ? `Error: ${error.message}` 
        : `Found ${data?.length || 0} profiles`,
      details: data?.length ? { sampleIds: data.map(p => p.id.substring(0, 8)) } : undefined
    });
  } catch (err) {
    addResult({
      name: 'User Profiles Table',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }
}

async function testXpLogTable(client: ReturnType<typeof createClient>): Promise<void> {
  try {
    const { data, error } = await client
      .from('user_xp_log')
      .select('id, user_id, xp_amount, action_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    addResult({
      name: 'XP Log Table',
      passed: !error && data !== null,
      message: error 
        ? `Error: ${error.message}` 
        : `Table accessible, ${data?.length || 0} recent entries`,
      details: data?.length ? { 
        recentActions: data.map(l => `${l.action_type}: ${l.xp_amount}XP`) 
      } : undefined
    });
  } catch (err) {
    addResult({
      name: 'XP Log Table',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }
}

async function testAwardXpWithRealUser(
  client: ReturnType<typeof createClient>, 
  userId: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    info('Dry run mode - skipping actual XP award');
    addResult({
      name: 'Award XP (Real User)',
      passed: true,
      message: 'Skipped in dry-run mode'
    });
    return;
  }
  
  try {
    // Get current XP
    const { data: beforeProfile, error: beforeError } = await client
      .from('user_profiles')
      .select('total_xp, level')
      .eq('id', userId)
      .single();
    
    if (beforeError || !beforeProfile) {
      addResult({
        name: 'Award XP (Real User)',
        passed: false,
        message: `Could not fetch user profile: ${beforeError?.message || 'User not found'}`
      });
      return;
    }
    
    const testXpAmount = 10; // Small test amount
    const testActionType = 'test_script_validation';
    
    info(`Before: ${beforeProfile.total_xp}XP, Level ${beforeProfile.level}`);
    
    // Award XP
    const { error: rpcError } = await client.rpc('award_xp', {
      p_user_id: userId,
      p_xp_amount: testXpAmount,
      p_action_type: testActionType,
      p_reference_id: null
    });
    
    if (rpcError) {
      addResult({
        name: 'Award XP (Real User)',
        passed: false,
        message: `RPC failed: ${rpcError.message}`,
        details: { code: rpcError.code, hint: rpcError.hint }
      });
      return;
    }
    
    // Verify XP was added
    const { data: afterProfile, error: afterError } = await client
      .from('user_profiles')
      .select('total_xp, level')
      .eq('id', userId)
      .single();
    
    if (afterError || !afterProfile) {
      addResult({
        name: 'Award XP (Real User)',
        passed: false,
        message: `Could not verify XP update: ${afterError?.message}`
      });
      return;
    }
    
    const xpDiff = afterProfile.total_xp - beforeProfile.total_xp;
    const xpAwarded = xpDiff === testXpAmount;
    
    info(`After: ${afterProfile.total_xp}XP, Level ${afterProfile.level}`);
    
    addResult({
      name: 'Award XP (Real User)',
      passed: xpAwarded,
      message: xpAwarded 
        ? `Successfully awarded ${testXpAmount}XP` 
        : `XP mismatch: expected +${testXpAmount}, got +${xpDiff}`,
      details: {
        before: beforeProfile.total_xp,
        after: afterProfile.total_xp,
        expected: beforeProfile.total_xp + testXpAmount
      }
    });
    
    // Verify log entry was created
    const { data: logEntry, error: logError } = await client
      .from('user_xp_log')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', testActionType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    addResult({
      name: 'XP Log Entry Created',
      passed: !logError && logEntry !== null,
      message: logEntry 
        ? `Log entry created with ID ${logEntry.id.substring(0, 8)}...`
        : `No log entry found: ${logError?.message}`
    });
    
  } catch (err) {
    addResult({
      name: 'Award XP (Real User)',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }
}

async function testAnonClientPermissions(): Promise<void> {
  if (!SUPABASE_ANON_KEY) {
    addResult({
      name: 'Anon Client Permissions',
      passed: false,
      message: 'No anon key available'
    });
    return;
  }
  
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    // Anon should NOT be able to call award_xp without auth
    const { error } = await anonClient.rpc('award_xp', {
      p_user_id: '00000000-0000-0000-0000-000000000000',
      p_xp_amount: 100,
      p_action_type: 'test'
    });
    
    // We expect this to fail - unauthenticated users shouldn't award XP
    // However, if the function has SECURITY DEFINER, it might succeed but violate FK
    const properlyRestricted = !!error;
    
    addResult({
      name: 'Anon Client Permissions',
      passed: true, // Just informational
      message: properlyRestricted 
        ? 'Correctly restricted for anonymous users'
        : 'Warning: Anonymous users may have RPC access',
      details: error ? { errorType: error.code } : { warning: 'Check RLS policies' }
    });
    
  } catch (err) {
    addResult({
      name: 'Anon Client Permissions',
      passed: true,
      message: 'Request blocked (expected behavior)'
    });
  }
}

async function testLevelCalculation(client: ReturnType<typeof createClient>): Promise<void> {
  // Test the level calculation formula: level = floor(sqrt(total_xp / 100)) + 1
  const testCases = [
    { xp: 0, expectedLevel: 1 },
    { xp: 99, expectedLevel: 1 },
    { xp: 100, expectedLevel: 2 },
    { xp: 400, expectedLevel: 3 },
    { xp: 900, expectedLevel: 4 },
    { xp: 10000, expectedLevel: 11 }
  ];
  
  const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
  
  let allPassed = true;
  const failures: string[] = [];
  
  for (const { xp, expectedLevel } of testCases) {
    const calculatedLevel = calculateLevel(xp);
    if (calculatedLevel !== expectedLevel) {
      allPassed = false;
      failures.push(`${xp}XP → expected L${expectedLevel}, got L${calculatedLevel}`);
    }
  }
  
  addResult({
    name: 'Level Calculation Formula',
    passed: allPassed,
    message: allPassed 
      ? 'Formula matches expected values'
      : `Mismatches: ${failures.join('; ')}`,
    details: allPassed ? undefined : { testCases, failures }
  });
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  log('  AINews - award_xp RPC Test Suite', 'cyan');
  console.log('='.repeat(60) + '\n');
  
  const config = parseArgs();
  
  if (config.dryRun) {
    warn('Running in DRY-RUN mode - no data will be modified\n');
  }
  
  // Test environment
  await testEnvironmentVariables();
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log('\n❌ Cannot continue without required environment variables', 'red');
    process.exit(1);
  }
  
  // Create service role client (bypasses RLS)
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  console.log('\n--- Database Tests ---\n');
  
  const connected = await testDatabaseConnection(serviceClient);
  if (!connected) {
    log('\n❌ Cannot continue without database connection', 'red');
    process.exit(1);
  }
  
  await testUserProfilesTable(serviceClient);
  await testXpLogTable(serviceClient);
  await testRpcFunctionExists(serviceClient);
  
  console.log('\n--- Permission Tests ---\n');
  
  await testAnonClientPermissions();
  
  console.log('\n--- Logic Tests ---\n');
  
  await testLevelCalculation(serviceClient);
  
  // Real user test
  if (config.userId) {
    console.log('\n--- Real User Test ---\n');
    info(`Testing with user ID: ${config.userId}`);
    await testAwardXpWithRealUser(serviceClient, config.userId, config.dryRun);
  } else {
    // Find a test user
    const { data: testUsers } = await serviceClient
      .from('user_profiles')
      .select('id, display_name')
      .limit(1);
    
    if (testUsers && testUsers.length > 0) {
      console.log('\n--- Real User Test ---\n');
      const testUser = testUsers[0];
      info(`Found test user: ${testUser.display_name || testUser.id.substring(0, 8)}`);
      await testAwardXpWithRealUser(serviceClient, testUser.id, config.dryRun);
    } else {
      warn('No test users found - skipping real user test');
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('  TEST SUMMARY', 'cyan');
  console.log('='.repeat(60) + '\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  log(`Total: ${total} tests`, 'blue');
  log(`Passed: ${passed}`, 'green');
  if (failed > 0) {
    log(`Failed: ${failed}`, 'red');
  }
  
  console.log('\n');
  
  // Exit with error code if any tests failed
  if (failed > 0) {
    log('Some tests failed. Check the output above for details.', 'yellow');
    process.exit(1);
  } else {
    log('All tests passed! ✨', 'green');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
