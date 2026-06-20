/**
 * Test Runner Utility
 * Shared helpers for all test files
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

export async function fetchPage(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return { status: res.status, ok: res.ok, url: res.url, headers: Object.fromEntries(res.headers) };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

export async function fetchAPI(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, ok: res.ok, json, text };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

export function runTests(suiteName, tests) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TEST SUITE: ${suiteName}`);
  console.log(`${'='.repeat(60)}\n`);
  
  let passed = 0;
  let failed = 0;
  const failures = [];

  return (async () => {
    for (const test of tests) {
      try {
        await test.fn();
        console.log(`  ✓ ${test.name}`);
        passed++;
      } catch (err) {
        console.log(`  ✗ ${test.name}`);
        console.log(`    → ${err.message}`);
        failed++;
        failures.push({ name: test.name, error: err.message });
      }
    }

    console.log(`\n${'-'.repeat(60)}`);
    console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    if (failures.length > 0) {
      console.log(`\n  FAILURES:`);
      failures.forEach(f => console.log(`    - ${f.name}: ${f.error}`));
    }
    console.log(`${'='.repeat(60)}\n`);
    
    return { passed, failed, failures };
  })();
}
