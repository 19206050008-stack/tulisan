import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Convert Markdown to HTML ─────────────────────────────────────
function mdToHtml(md) {
  // Remove the title line and === separator
  const lines = md.split('\n');
  const contentLines = [];
  let skipHeader = true;
  for (const line of lines) {
    if (skipHeader) {
      if (line.startsWith('Bab ') || line.match(/^=+$/)) continue;
      if (line.trim() === '') { skipHeader = false; continue; }
      skipHeader = false;
    }
    contentLines.push(line);
  }

  // Remove CATATAN EDITOR section
  const editorNoteIdx = contentLines.findIndex(l => l.includes('CATATAN EDITOR'));
  if (editorNoteIdx > 0) {
    // Also remove the --- line before it
    let cutIdx = editorNoteIdx;
    while (cutIdx > 0 && contentLines[cutIdx - 1].trim() === '---') cutIdx--;
    // Remove the separator line before that too
    while (cutIdx > 0 && contentLines[cutIdx - 1].trim() === '') cutIdx--;
    contentLines.splice(cutIdx);
  }

  // Also remove trailing dashes line at very end
  while (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '---') {
    contentLines.pop();
  }
  while (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '') {
    contentLines.pop();
  }

  // Also remove the dashes line just before CATATAN EDITOR was removed
  while (contentLines.length > 0 && contentLines[contentLines.length - 1].match(/^-{3,}$/)) {
    contentLines.pop();
  }
  while (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '') {
    contentLines.pop();
  }

  // Build HTML
  const paragraphs = [];
  let currentPara = [];

  for (const line of contentLines) {
    const trimmed = line.trim();

    // Scene separator
    if (trimmed === '---' || trimmed === '***') {
      if (currentPara.length > 0) {
        paragraphs.push(formatInline(currentPara.join(' ')));
        currentPara = [];
      }
      paragraphs.push('<hr>');
      continue;
    }

    // Dashes separator line (long)
    if (trimmed.match(/^-{10,}$/)) {
      if (currentPara.length > 0) {
        paragraphs.push(formatInline(currentPara.join(' ')));
        currentPara = [];
      }
      paragraphs.push('<hr>');
      continue;
    }

    if (trimmed === '') {
      if (currentPara.length > 0) {
        paragraphs.push(formatInline(currentPara.join(' ')));
        currentPara = [];
      }
      continue;
    }

    currentPara.push(trimmed);
  }

  if (currentPara.length > 0) {
    paragraphs.push(formatInline(currentPara.join(' ')));
  }

  // Wrap in <p> tags (hr already self-contained)
  const html = paragraphs.map(p => {
    if (p === '<hr>') return '<hr>';
    return `<p>${p}</p>`;
  }).join('');

  return html;
}

function formatInline(text) {
  // Bold+italic: ***text***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Underline: __text__
  text = text.replace(/__(.+?)__/g, '<u>$1</u>');
  // Fix smart quotes
  text = text.replace(/"/g, '\u201C').replace(/"/g, '\u201D');
  return text;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('=== Insert Curator Story ===\n');

  // 1. Find or create author
  console.log('1. Looking for author...');
  let { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, role')
    .order('created_at', { ascending: true })
    .limit(1);

  if (!profiles || profiles.length === 0) {
    console.error('No users found in database. Please register first.');
    process.exit(1);
  }

  const author = profiles[0];
  console.log(`   Author: ${author.full_name} (@${author.username}) - ${author.id}\n`);

  // 2. Read all chapter files
  console.log('2. Reading chapter files...');
  const storyDir = resolve(__dirname, '../story/Curator');
  const files = fs.readdirSync(storyDir)
    .filter(f => f.startsWith('Bab_') && f.endsWith('.md'))
    .sort();

  console.log(`   Found ${files.length} chapters\n`);

  // 3. Parse chapters
  const chapters = [];
  for (const file of files) {
    const md = fs.readFileSync(join(storyDir, file), 'utf-8');
    const firstLine = md.split('\n')[0]; // "Bab 1: Bakat Pertama"
    const match = firstLine.match(/Bab\s+(\d+)\s*:\s*(.+)/);
    if (!match) {
      console.warn(`   WARNING: Could not parse title from ${file}`);
      continue;
    }

    const num = parseInt(match[1]);
    const title = match[2].trim();
    const html = mdToHtml(md);

    chapters.push({
      number: num,
      title: `Bab ${num}: ${title}`,
      content: html,
      file: file,
    });

    console.log(`   ✓ Bab ${num}: ${title} (${html.length} chars)`);
  }

  chapters.sort((a, b) => a.number - b.number);
  console.log(`\n   Total: ${chapters.length} chapters ready\n`);

  // 4. Create story
  console.log('3. Creating story "Curator"...');
  const { data: story, error: storyErr } = await supabase
    .from('stories')
    .insert({
      author_id: author.id,
      title: 'Curator',
      description: 'Seorang anak yang bisa mendengar suara orang mati tumbuh menjadi kurator museum — penjaga benda tua dan cerita yang menempel padanya. Ketika lembah gelap mulai mengumpulkan jiwa-jiwa yang terlupakan, ia harus memilih: menutup pintunya selamanya, atau melangkah masuk dan membebaskan mereka yang tak bisa membebaskan diri.',
      category: 'Misteri',
      tags: ['horor', 'supranatural', 'psikometri', 'keluarga', 'petualangan', 'indonesia'],
      status: 'published',
    })
    .select()
    .single();

  if (storyErr) {
    console.error('   ERROR creating story:', storyErr.message);
    process.exit(1);
  }

  console.log(`   ✓ Story created: ${story.id}\n`);

  // 5. Insert chapters
  console.log('4. Inserting chapters...');
  for (const ch of chapters) {
    const { data: chapter, error: chErr } = await supabase
      .from('chapters')
      .insert({
        story_id: story.id,
        title: ch.title,
        content: ch.content,
        chapter_number: ch.number,
        status: 'published',
      })
      .select()
      .single();

    if (chErr) {
      console.error(`   ERROR chapter ${ch.number}:`, chErr.message);
    } else {
      console.log(`   ✓ Chapter ${ch.number}: ${ch.title}`);
    }
  }

  console.log(`\n=== Done! Story ID: ${story.id} ===`);
  console.log(`URL: /story/${story.id}`);
}

main().catch(console.error);
