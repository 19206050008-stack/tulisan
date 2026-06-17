import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function countWords(content) {
  if (!content) return 0;
  const text = content.replace(/<[^>]*>/g, ' ');
  return text.trim().replace(/\s+/g, ' ').split(' ').filter(w => w.length > 0).length;
}

function determineTier(totalWords) {
  if (totalWords > 0 && totalWords <= 700) {
    return 'Pendek';
  } else if (totalWords > 700 && totalWords <= 1000) {
    return 'Sedang';
  } else if (totalWords > 1000 && totalWords <= 5000) {
    return 'Panjang';
  }
  return null;
}

async function analyzeAndUpdateStoriesFast() {
  console.log('🔍 Fetching all stories...');
  const { data: stories, error: storiesError } = await supabase.from('stories').select('id, title, tags');
  
  if (storiesError) {
    console.error('❌ Error fetching stories:', storiesError);
    return;
  }
  console.log(`📚 Found ${stories.length} stories`);

  console.log('🔍 Fetching all chapters...');
  const { data: chapters, error: chaptersError } = await supabase.from('chapters').select('story_id, content');
  
  if (chaptersError) {
    console.error('❌ Error fetching chapters:', chaptersError);
    return;
  }
  console.log(`📚 Found ${chapters.length} chapters\n`);

  // Group chapters by story
  const chaptersByStory = {};
  for (const ch of chapters) {
    if (!chaptersByStory[ch.story_id]) chaptersByStory[ch.story_id] = [];
    chaptersByStory[ch.story_id].push(ch);
  }

  let updated = 0;
  let promises = [];

  for (const story of stories) {
    const storyChapters = chaptersByStory[story.id] || [];
    const totalWords = storyChapters.reduce((sum, ch) => sum + countWords(ch.content), 0);
    const tier = determineTier(totalWords);

    if (!tier) {
      console.log(`   ⏭️ Skipped: "${story.title}" (${totalWords} words) - Outside range`);
      continue;
    }

    const currentTags = Array.isArray(story.tags) ? story.tags : [];
    const tierTags = ['Pendek', 'Sedang', 'Panjang'];
    const newTags = currentTags.filter(tag => !tierTags.includes(tag));
    newTags.push(tier);

    // Only update if tags actually changed
    const currentTagsSorted = [...currentTags].sort().join(',');
    const newTagsSorted = [...newTags].sort().join(',');

    if (currentTagsSorted !== newTagsSorted) {
      promises.push(
        supabase.from('stories').update({ tags: newTags }).eq('id', story.id).then(({error}) => {
          if (error) console.error(`❌ Failed ${story.title}:`, error.message);
          else console.log(`   ✅ Updated: "${story.title}" -> ${tier} (${totalWords} words)`);
        })
      );
      updated++;
    } else {
      console.log(`   ✨ Already correct: "${story.title}" -> ${tier} (${totalWords} words)`);
    }
  }

  console.log(`\n⏳ Updating ${promises.length} stories in parallel...`);
  await Promise.all(promises);
  console.log(`\n🎉 Script completed successfully! Updated ${updated} stories with correct ranges.`);
}

analyzeAndUpdateStoriesFast().catch(console.error);