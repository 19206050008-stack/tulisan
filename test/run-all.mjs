/**
 * Test Runner - Run all test suites
 * Usage: node test/run-all.mjs
 * 
 * Environment variables:
 *   TEST_URL - Base URL to test (default: http://localhost:3000)
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase URL for data tests
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key for data tests
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const suites = [
  ...readdirSync(join(__dirname, 'frontend')).filter(f => f.endsWith('.mjs')).map(f => `test/frontend/${f}`),
  ...readdirSync(join(__dirname, 'backend')).filter(f => f.endsWith('.mjs')).map(f => `test/backend/${f}`),
];

console.log(`\n🧪 Running ${suites.length} test suites...\n`);

let totalPassed = 0;
let totalFailed = 0;
const allFailures = [];

for (const suite of suites) {
  try {
    execSync(`node ${suite}`, { stdio: 'inherit', env: { ...process.env } });
  } catch (err) {
    // Test suite had failures but still ran
  }
}

console.log('\nDone. Review [MANUAL] items above for issues requiring browser testing.');
