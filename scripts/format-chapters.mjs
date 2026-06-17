import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AUTHOR_ID = 'b005f0c0-8dad-4abb-ae98-227022927f71';
const CURATOR_ID = '0b0b52a6-10a6-4000-bfaa-b2b6391b9372';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Text → HTML Converter ───────────────────────────────────────
function decodeContent(raw) {
  if (!raw) return '';
  let text = raw;
  // Handle double-JSON-encoded: "\"text...\""
  if (typeof text === 'string' && text.startsWith('"') && text.endsWith('"')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') text = parsed;
    } catch {}
  }
  return text;
}

function isHtml(s) {
  return s.trimStart().startsWith('<');
}

function plainTextToHtml(text) {
  // Split by double newlines or \n\n
  const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);

  const htmlBlocks = [];
  for (const block of blocks) {
    // Scene separators
    if (/^[-*]{3,}$/.test(block.trim()) || block.trim() === '***' || block.trim() === '* * *') {
      htmlBlocks.push('<hr>');
      continue;
    }

    // Skip if it looks like a title/heading marker
    if (/^=+$/.test(block.trim())) continue;

    // Format inline styles
    let formatted = block
      // Bold+italic ***text***
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      // Bold **text**
      .replace(/\*\*(.+?)\*\*\*/g, '<strong>$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic *text*
      .replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '<em>$1</em>')
      // Underline __text__
      .replace(/__(.+?)__/g, '<u>$1</u>');

    // Fix smart quotes (common issues)
    formatted = formatted
      .replace(/\u2018/g, '\u2018')  // keep proper left single quote
      .replace(/\u2019/g, '\u2019')  // keep proper right single quote
      .replace(/\u201C/g, '\u201C')  // keep proper left double quote
      .replace(/\u201D/g, '\u201D'); // keep proper right double quote

    // Fix common Indonesian punctuation issues
    // Ensure space after period/comma if followed by uppercase
    formatted = formatted.replace(/([.,!?])([A-Z])/g, '$1 $2');
    // Fix double spaces
    formatted = formatted.replace(/  +/g, ' ');

    // Handle single newlines within a paragraph → space (not <br>)
    formatted = formatted.replace(/\n/g, ' ').replace(/  +/g, ' ');

    htmlBlocks.push(`<p>${formatted.trim()}</p>`);
  }

  return htmlBlocks.join('');
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
  console.log('=== Bulk Format Chapters for AAR Nugroho ===\n');

  // 1. Get all story IDs (excluding Curator which is already HTML)
  console.log('1. Fetching story IDs...');
  const { data: stories } = await supabase
    .from('stories')
    .select('id, title')
    .eq('author_id', AUTHOR_ID)
    .neq('id', CURATOR_ID);

  if (!stories || stories.length === 0) {
    console.log('   No stories found.');
    return;
  }

  console.log(`   Found ${stories.length} stories\n`);

  // 2. Fetch all chapters for these stories
  console.log('2. Fetching chapters...');
  const storyIds = stories.map(s => s.id);

  // Supabase has a limit on IN clause, so batch in groups of 50
  let allChapters = [];
  for (let i = 0; i < storyIds.length; i += 50) {
    const batch = storyIds.slice(i, i + 50);
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, story_id, title, chapter_number, content')
      .in('story_id', batch);
    if (chapters) allChapters.push(...chapters);
    process.stdout.write(`   Fetched ${allChapters.length} chapters...\r`);
  }

  console.log(`   Total chapters: ${allChapters.length}\n`);

  // 3. Filter chapters that need conversion (plain text, not HTML)
  const needsConversion = [];
  const alreadyHtml = [];

  for (const ch of allChapters) {
    const raw = typeof ch.content === 'string' ? ch.content : JSON.stringify(ch.content);
    const decoded = decodeContent(raw);

    if (isHtml(decoded)) {
      alreadyHtml.push(ch);
    } else {
      needsConversion.push({ ...ch, decoded });
    }
  }

  console.log(`   Already HTML: ${alreadyHtml.length}`);
  console.log(`   Needs conversion: ${needsConversion.length}\n`);

  if (needsConversion.length === 0) {
    console.log('   All chapters already formatted. Done!');
    return;
  }

  // 4. Convert and update in batches
  console.log('3. Converting and updating chapters...');
  let updated = 0;
  let errors = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < needsConversion.length; i += BATCH_SIZE) {
    const batch = needsConversion.slice(i, i + BATCH_SIZE);

    const updates = batch.map(ch => {
      const html = plainTextToHtml(ch.decoded);
      return { id: ch.id, content: html };
    });

    // Update one by one (Supabase JS client doesn't support bulk update easily)
    for (const upd of updates) {
      const { error } = await supabase
        .from('chapters')
        .update({ content: upd.content })
        .eq('id', upd.id);

      if (error) {
        errors++;
        if (errors <= 5) console.error(`   ERROR ${upd.id}: ${error.message}`);
      } else {
        updated++;
      }
    }

    const progress = Math.min(i + BATCH_SIZE, needsConversion.length);
    const pct = Math.round((progress / needsConversion.length) * 100);
    process.stdout.write(`   Progress: ${progress}/${needsConversion.length} (${pct}%) — updated: ${updated}, errors: ${errors}\r`);
  }

  console.log(`\n\n=== Done! ===`);
  console.log(`   Updated: ${updated} chapters`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Already HTML (skipped): ${alreadyHtml.length}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
