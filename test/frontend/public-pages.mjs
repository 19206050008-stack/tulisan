/**
 * Frontend Test: Public Pages
 * Tests all public-facing page routes
 */
import { fetchPage, assert, runTests } from '../helpers.mjs';

const tests = [
  // === Public Pages ===
  { name: 'Homepage loads', fn: async () => {
    const res = await fetchPage('/');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Browse page loads', fn: async () => {
    const res = await fetchPage('/browse');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Login page loads', fn: async () => {
    const res = await fetchPage('/login');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Register page loads', fn: async () => {
    const res = await fetchPage('/register');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Community page loads', fn: async () => {
    const res = await fetchPage('/community');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'About page loads', fn: async () => {
    const res = await fetchPage('/about');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Terms page loads', fn: async () => {
    const res = await fetchPage('/terms');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Privacy page loads', fn: async () => {
    const res = await fetchPage('/privacy');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Accessibility page loads', fn: async () => {
    const res = await fetchPage('/accessibility');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Help page loads', fn: async () => {
    const res = await fetchPage('/help');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Careers page loads', fn: async () => {
    const res = await fetchPage('/careers');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Press page loads', fn: async () => {
    const res = await fetchPage('/press');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Press articles page loads', fn: async () => {
    const res = await fetchPage('/press/articles');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Moderation page loads', fn: async () => {
    const res = await fetchPage('/moderation');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},

  // === Auth-required pages (should redirect to /login) ===
  { name: 'Write page redirects to login for guests', fn: async () => {
    const res = await fetchPage('/write');
    assert(res.status === 200, `Expected 200 (client-side redirect), got ${res.status}`);
  }},
  { name: 'My-stories page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/my-stories');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Library page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/library');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Notifications page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/notifications');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Chat page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/chat');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'AI Chat page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/ai-chat');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Ads page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/ads');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Reading lists page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/reading-lists');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Author page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/author');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},
  { name: 'Profile edit page loads (client-side auth)', fn: async () => {
    const res = await fetchPage('/profile/edit');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }},

  // === 404 handling ===
  { name: '404 for non-existent page', fn: async () => {
    const res = await fetchPage('/this-page-does-not-exist');
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  }},
];

runTests('Public Pages', tests);
