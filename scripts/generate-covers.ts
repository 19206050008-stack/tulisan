import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Story {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  cover_url: string | null;
}

// Generate AI prompt from story data
function generatePrompt(story: Story): string {
  const title = story.title || 'Untitled';
  const genre = story.category || 'fiction';
  const description = story.description || '';
  
  // Extract mood and themes from description
  const moodKeywords = extractMood(description);
  const backgroundKeywords = extractBackground(genre, description);
  
  // Construct prompt for AI image generation
  const prompt = `Book cover design for "${title}", ${genre} genre. ${moodKeywords}. ${backgroundKeywords}. Professional book cover art, high quality, detailed illustration, cinematic lighting, trending on artstation.`;
  
  return prompt;
}

// Extract mood from description
function extractMood(description: string): string {
  const desc = description.toLowerCase();
  const moods: string[] = [];
  
  if (desc.includes('dark') || desc.includes('mystery') || desc.includes('thriller')) {
    moods.push('dark and mysterious atmosphere');
  }
  if (desc.includes('romance') || desc.includes('love') || desc.includes('heart')) {
    moods.push('romantic and emotional');
  }
  if (desc.includes('adventure') || desc.includes('journey') || desc.includes('quest')) {
    moods.push('adventurous and epic');
  }
  if (desc.includes('scary') || desc.includes('horror') || desc.includes('fear')) {
    moods.push('suspenseful and eerie');
  }
  if (desc.includes('funny') || desc.includes('comedy') || desc.includes('humor')) {
    moods.push('lighthearted and fun');
  }
  if (desc.includes('sad') || desc.includes('tragic') || desc.includes('melancholy')) {
    moods.push('melancholic and touching');
  }
  
  return moods.length > 0 ? moods.join(', ') : 'dramatic and engaging';
}

// Extract background elements from genre and description
function extractBackground(genre: string, description: string): string {
  const genreLower = genre.toLowerCase();
  const desc = description.toLowerCase();
  
  const backgrounds: string[] = [];
  
  // Genre-based backgrounds
  if (genreLower.includes('fantasy')) {
    backgrounds.push('fantasy landscape with magical elements');
  } else if (genreLower.includes('sci-fi') || genreLower.includes('science fiction')) {
    backgrounds.push('futuristic sci-fi setting with technology');
  } else if (genreLower.includes('horror')) {
    backgrounds.push('ominous dark background');
  } else if (genreLower.includes('romance')) {
    backgrounds.push('elegant romantic setting');
  } else if (genreLower.includes('mystery') || genreLower.includes('thriller')) {
    backgrounds.push('shadowy mysterious environment');
  } else if (genreLower.includes('historical')) {
    backgrounds.push('historical period setting');
  }
  
  // Description-based backgrounds
  if (desc.includes('city') || desc.includes('urban')) {
    backgrounds.push('urban cityscape');
  }
  if (desc.includes('forest') || desc.includes('woods') || desc.includes('nature')) {
    backgrounds.push('natural forest environment');
  }
  if (desc.includes('ocean') || desc.includes('sea') || desc.includes('water')) {
    backgrounds.push('oceanic or coastal setting');
  }
  if (desc.includes('mountain') || desc.includes('peak')) {
    backgrounds.push('mountainous landscape');
  }
  if (desc.includes('castle') || desc.includes('palace')) {
    backgrounds.push('grand architectural structure');
  }
  
  return backgrounds.length > 0 ? backgrounds.join(', ') : 'atmospheric background';
}

// Fetch all stories from Supabase
async function fetchStories(limit?: number): Promise<Story[]> {
  console.log('Fetching stories from Supabase...');
  
  let query = supabase
    .from('stories')
    .select('id, title, description, category, tags, cover_url')
    .order('created_at', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching stories:', error);
    return [];
  }
  
  console.log(`Fetched ${data?.length || 0} stories`);
  return data || [];
}

// Save prompts to file
function savePromptsToFile(stories: Story[], prompts: Map<string, string>) {
  const output = stories.map(story => ({
    id: story.id,
    title: story.title,
    category: story.category,
    prompt: prompts.get(story.id),
    current_cover: story.cover_url
  }));
  
  const outputPath = path.join(process.cwd(), 'scripts', 'cover-prompts.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nPrompts saved to: ${outputPath}`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 10; // Default to first 10 stories
  
  console.log(`\n=== Cover Generation Script ===\n`);
  console.log(`Fetching first ${limit} stories...\n`);
  
  const stories = await fetchStories(limit);
  
  if (stories.length === 0) {
    console.log('No stories found!');
    return;
  }
  
  const prompts = new Map<string, string>();
  
  console.log('\n=== Generated Prompts ===\n');
  stories.forEach((story, index) => {
    const prompt = generatePrompt(story);
    prompts.set(story.id, prompt);
    
    console.log(`${index + 1}. Story: ${story.title}`);
    console.log(`   Genre: ${story.category}`);
    console.log(`   ID: ${story.id}`);
    console.log(`   Prompt: ${prompt}`);
    console.log('');
  });
  
  savePromptsToFile(stories, prompts);
  
  console.log('\n=== Next Steps ===');
  console.log('1. Review the generated prompts in scripts/cover-prompts.json');
  console.log('2. Choose an AI image generation service (OpenAI DALL-E, Replicate, etc.)');
  console.log('3. Run the image generation script to create covers');
  console.log('\nTo fetch more stories, run: npm run generate-covers [number]');
}

main().catch(console.error);
