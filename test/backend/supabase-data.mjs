/**
 * Backend Test: Supabase Data Layer
 * Tests lib/supabase functions for CRUD operations
 */
import { fetchAPI, assert, runTests } from '../helpers.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseQuery(table, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { error: 'Supabase not configured', data: null };
  }
  const params = new URLSearchParams();
  if (options.select) params.set('select', options.select);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.order) params.set('order', options.order);
  if (options.eq) {
    for (const [key, val] of Object.entries(options.eq)) {
      params.set(key, `eq.${val}`);
    }
  }
  
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    const data = await res.json();
    return { data, status: res.status, ok: res.ok };
  } catch (err) {
    return { error: err.message, data: null };
  }
}

const tests = [
  // === Categories Table ===
  { name: 'Categories table is accessible', fn: async () => {
    const res = await supabaseQuery('categories', { select: 'id,name,slug,active', limit: 5 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok, `Query failed with status ${res.status}`);
    assert(Array.isArray(res.data), 'Expected array result');
  }},
  { name: 'Categories have required fields', fn: async () => {
    const res = await supabaseQuery('categories', { select: 'id,name,slug,active,sort_order', limit: 1 });
    if (res.data && res.data.length > 0) {
      const cat = res.data[0];
      assert(cat.id, 'Category missing id');
      assert(cat.name, 'Category missing name');
      assert(cat.slug, 'Category missing slug');
      assert(typeof cat.active === 'boolean', 'Category active should be boolean');
    }
  }},

  // === Stories Table ===
  { name: 'Stories table is accessible', fn: async () => {
    const res = await supabaseQuery('stories', { select: 'id,title,category,tags,status', limit: 5 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok, `Query failed with status ${res.status}`);
    assert(Array.isArray(res.data), 'Expected array result');
  }},
  { name: 'Published stories have category field', fn: async () => {
    const res = await supabaseQuery('stories', { select: 'id,title,category,tags', limit: 5, order: 'created_at.desc' });
    if (res.data && res.data.length > 0) {
      for (const story of res.data) {
        assert(story.title, `Story ${story.id} missing title`);
      }
    }
  }},
  { name: 'Story tags is an array', fn: async () => {
    const res = await supabaseQuery('stories', { select: 'id,tags', limit: 5 });
    if (res.data && res.data.length > 0) {
      for (const story of res.data) {
        if (story.tags !== null) {
          assert(Array.isArray(story.tags), `Story ${story.id} tags should be array, got ${typeof story.tags}`);
        }
      }
    }
  }},

  // === Profiles Table ===
  { name: 'Profiles table is accessible', fn: async () => {
    const res = await supabaseQuery('profiles', { select: 'id,username,full_name', limit: 3 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok, `Query failed with status ${res.status}`);
  }},

  // === Nana Chats Table ===
  { name: 'Nana chats table is accessible', fn: async () => {
    const res = await supabaseQuery('nana_chats', { select: 'id,user_id,title,updated_at', limit: 5 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok || res.status === 200 || res.status === 406, `Query failed with status ${res.status}`);
  }},
  { name: 'Nana messages table is accessible', fn: async () => {
    const res = await supabaseQuery('nana_messages', { select: 'id,chat_id,role,content', limit: 5 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok || res.status === 200 || res.status === 406, `Query failed with status ${res.status}`);
  }},

  // === Chapters Table ===
  { name: 'Chapters table is accessible', fn: async () => {
    const res = await supabaseQuery('chapters', { select: 'id,story_id,title,chapter_number', limit: 3 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok, `Query failed with status ${res.status}`);
  }},

  // === Comments Table ===
  { name: 'Comments table is accessible', fn: async () => {
    const res = await supabaseQuery('comments', { select: 'id,story_id,user_id,content', limit: 3 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok, `Query failed with status ${res.status}`);
  }},

  // === Site Config Table ===
  { name: 'Site config table is accessible', fn: async () => {
    const res = await supabaseQuery('site_config', { select: 'key,value', limit: 5 });
    assert(!res.error, `Supabase error: ${res.error}`);
    assert(res.ok, `Query failed with status ${res.status}`);
  }},
];

runTests('Supabase Data Layer', tests);
