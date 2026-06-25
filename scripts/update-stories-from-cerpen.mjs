/**
 * Script: Update semua cerita di database Supabase dari folder cerpen/
 *
 * Fungsi:
 * 1. Baca semua file .md dari cerpen/
 * 2. Cocokkan dengan cerita di DB berdasarkan judul (case-insensitive)
 * 3. Format ulang konten:
 *    - Tanda kutip: " " → gaya Indonesia yang rapi
 *    - Em-dash: -- → —
 *    - Separator: *** → <hr class="separator" />
 *    - Paragraf: setiap paragraf dibungkus <p> (text-align justify)
 *    - Bersihkan spasi ganda, whitespace berlebih
 *    - Referensi gaya Wattpad: paragraf pendek, dialog jelas, separator rapi
 * 4. Update chapter content di DB
 *
 * Jalankan: node scripts/update-stories-from-cerpen.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// --- Supabase config ---
const SUPABASE_URL = 'https://qtbtvuhkqgqkrrsapeog.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0YnR2dWhrcWdxa3Jyc2FwZW9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMwOTQyOSwiZXhwIjoyMDk2ODg1NDI5fQ.5oPXX0Cjai2q_nCdY5qIkBp6EWQuD4A7M87OTXlJ3DU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Formatting functions (Wattpad-style) ---

function formatContent(rawMd) {
  // Remove YAML front-matter
  let text = rawMd.replace(/^---[\s\S]*?---\s*/m, '');

  // Remove the title heading (# TITLE)
  text = text.replace(/^#\s+.+\n*/m, '');

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');

  // Fix common punctuation issues:
  // 1. Smart quotes: replace straight quotes around dialog with proper Indonesian quotes
  text = text.replace(/(?<=[.!?\s\n]|^)"([^"]+)"/g, '\u201C$1\u201D');
  // Also handle remaining straight quotes
  text = text.replace(/"([^"]+)"/g, '\u201C$1\u201D');

  // 2. Em-dash: -- or --- → —
  text = text.replace(/---/g, '\u2014');
  text = text.replace(/--/g, '\u2014');

  // 3. Ellipsis: ... → …
  text = text.replace(/\.\.\./g, '\u2026');

  // 4. Fix spacing around punctuation
  text = text.replace(/\s+([,.:;!?])/g, '$1'); // no space before punctuation
  text = text.replace(/([,.:;!?])(?=[A-Za-z\u00C0-\u024F])/g, '$1 '); // space after if missing

  // 5. Fix multiple spaces
  text = text.replace(/[ \t]+/g, ' ');

  // 6. Fix dash spacing: space before em-dash, space after
  text = text.replace(/\s*\u2014\s*/g, '\u2014');

  // Split into paragraphs by blank lines
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  const htmlParts = [];

  for (const block of blocks) {
    // Separator: *** or --- alone
    if (/^\*{3,}$/.test(block) || /^-{3,}$/.test(block)) {
      htmlParts.push('<div style="text-align:center;margin:1.5em 0;"><span style="letter-spacing:0.5em;color:#666;">\u2022 \u2022 \u2022</span></div>');
      continue;
    }

    // Handle lines within a block (single newlines = same paragraph in markdown)
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const merged = lines.join(' ');

    // Wrap in <p> with justify
    htmlParts.push(`<p style="text-align:justify;text-indent:2em;margin-bottom:0.8em;line-height:1.8;">${merged}</p>`);
  }

  return htmlParts.join('\n');
}

// --- File reading ---

async function getAllMdFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllMdFiles(full));
    } else if (entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function extractTitle(content) {
  // Get title from # heading
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  // Fallback: from front-matter or filename
  return null;
}

function extractGenre(content) {
  const match = content.match(/^Genre:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// --- Main ---

async function main() {
  console.log('📖 Membaca file cerpen...');
  const cerpenDir = join(ROOT, 'cerpen');
  const mdFiles = await getAllMdFiles(cerpenDir);
  console.log(`   Ditemukan ${mdFiles.length} file .md\n`);

  // Read and parse all files
  const stories = [];
  for (const f of mdFiles) {
    const raw = await readFile(f, 'utf-8');
    const title = extractTitle(raw);
    if (!title) {
      console.log(`   ⚠️  Skip (no title): ${relative(ROOT, f)}`);
      continue;
    }
    stories.push({
      file: relative(ROOT, f),
      title,
      genre: extractGenre(raw),
      html: formatContent(raw),
      raw,
    });
  }
  console.log(`   Parsed ${stories.length} cerita dari file\n`);

  // Fetch all stories from DB
  console.log('🔍 Mengambil daftar cerita dari database...');
  const { data: dbStories, error: dbErr } = await supabase
    .from('stories')
    .select('id, title, category, status');

  if (dbErr) {
    console.error('   ❌ Gagal ambil stories:', dbErr.message);
    process.exit(1);
  }
  console.log(`   ${dbStories.length} cerita di DB\n`);

  // Build title lookup (lowercase)
  const dbMap = new Map();
  for (const s of dbStories) {
    const key = s.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    dbMap.set(key, s);
  }

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const story of stories) {
    const key = story.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dbStory = dbMap.get(key);

    if (!dbStory) {
      // Try partial match
      let found = null;
      for (const [k, v] of dbMap) {
        if (k.includes(key) || key.includes(k)) {
          found = v;
          break;
        }
      }
      if (!found) {
        notFound++;
        if (notFound <= 20) console.log(`   ❓ Tidak ditemukan di DB: "${story.title}"`);
        continue;
      }
      // Use partial match
      await updateStoryChapter(found, story);
      updated++;
      continue;
    }

    await updateStoryChapter(dbStory, story);
    updated++;
  }

  console.log(`\n✅ Selesai!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found in DB: ${notFound}`);
  console.log(`   Skipped: ${skipped}`);
}

async function updateStoryChapter(dbStory, fileStory) {
  // Get existing chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, chapter_number, title')
    .eq('story_id', dbStory.id)
    .order('chapter_number', { ascending: true });

  if (!chapters || chapters.length === 0) {
    // No chapters yet - create one
    const { error } = await supabase.from('chapters').insert({
      story_id: dbStory.id,
      title: `Bagian 1`,
      content: fileStory.html,
      chapter_number: 1,
      status: dbStory.status || 'published',
    });
    if (error) {
      console.log(`   ❌ Gagal insert chapter "${dbStory.title}": ${error.message}`);
    } else {
      console.log(`   ✅ Created chapter: "${dbStory.title}"`);
    }
    return;
  }

  // Update first chapter (single-chapter cerpen)
  const ch = chapters[0];
  const { error } = await supabase.from('chapters').update({
    content: fileStory.html,
    updated_at: new Date().toISOString(),
  }).eq('id', ch.id);

  if (error) {
    console.log(`   ❌ Gagal update "${dbStory.title}": ${error.message}`);
  } else {
    console.log(`   ✅ Updated: "${dbStory.title}"`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
