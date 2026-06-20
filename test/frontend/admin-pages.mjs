/**
 * Frontend Test: Admin Pages
 * Tests all admin page routes and basic functionality
 */
import { fetchPage, fetchAPI, assert, runTests } from '../helpers.mjs';

const tests = [
  // === Admin Layout & Access ===
  { name: 'Admin dashboard loads', fn: async () => {
    const res = await fetchPage('/admin');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin categories page loads', fn: async () => {
    const res = await fetchPage('/admin/categories');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin stories page loads', fn: async () => {
    const res = await fetchPage('/admin/stories');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin users page loads', fn: async () => {
    const res = await fetchPage('/admin/users');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin moderation page loads', fn: async () => {
    const res = await fetchPage('/admin/moderation');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin nana page loads', fn: async () => {
    const res = await fetchPage('/admin/nana');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin reports page loads', fn: async () => {
    const res = await fetchPage('/admin/reports');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin settings page loads', fn: async () => {
    const res = await fetchPage('/admin/settings');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin slider page loads', fn: async () => {
    const res = await fetchPage('/admin/slider');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin press page loads', fn: async () => {
    const res = await fetchPage('/admin/press');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin ads page loads', fn: async () => {
    const res = await fetchPage('/admin/ads');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin pages page loads', fn: async () => {
    const res = await fetchPage('/admin/pages');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin comments page loads', fn: async () => {
    const res = await fetchPage('/admin/comments');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
  { name: 'Admin API page loads', fn: async () => {
    const res = await fetchPage('/admin/api');
    assert(res.status === 200 || res.status === 307, `Expected 200 or redirect, got ${res.status}`);
  }},
];

runTests('Admin Pages', tests);
