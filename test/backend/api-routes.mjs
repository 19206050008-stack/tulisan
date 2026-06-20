/**
 * Backend Test: API Routes & Supabase Functions
 * Tests API endpoints and data layer
 */
import { fetchAPI, assert, runTests } from '../helpers.mjs';

const tests = [
  // === Seed Categories API ===
  { name: 'Seed categories requires secret', fn: async () => {
    const res = await fetchAPI('/api/seed-categories');
    assert(res.status === 401, `Expected 401 unauthorized, got ${res.status}`);
  }},
  { name: 'Seed categories with wrong secret fails', fn: async () => {
    const res = await fetchAPI('/api/seed-categories?secret=wrong');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  }},
  { name: 'Seed categories with correct secret works', fn: async () => {
    const res = await fetchAPI('/api/seed-categories?secret=seed-categories-2026');
    assert(res.ok, `Expected success, got status ${res.status}: ${res.text}`);
    assert(res.json && res.json.total === 18, `Expected 18 categories, got ${res.json?.total}`);
  }},

  // === Page Data Endpoints (Server Components fetch) ===
  { name: 'Homepage returns stories data', fn: async () => {
    const res = await fetchAPI('/');
    // Server component - returns HTML, check it loads
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Browse page returns data', fn: async () => {
    const res = await fetchAPI('/browse');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
];

runTests('Backend API', tests);
