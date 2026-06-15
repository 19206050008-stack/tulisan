import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
// import axios from 'axios';        // [HIDDEN] dipakai untuk HuggingFace
// import * as dns from 'dns';       // [HIDDEN] dipakai untuk HuggingFace

// Set DNS to Google DNS
// dns.setServers(['8.8.8.8', '8.8.4.4']); // [HIDDEN]

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

interface StoryPrompt {
  id: string;
  title: string;
  category: string;
  prompt: string;
  current_cover: string;
}

// ── [HIDDEN] Generate image via Hugging Face Inference API ─────────────────
// Dinonaktifkan — sekarang menggunakan gen.pollinations.ai (Flux)
//
// async function generateImage(prompt: string, retries = 3): Promise<Buffer> {
//   console.log('  Calling Hugging Face Flux (FREE)...');
//   const token = process.env.HUGGINGFACE_TOKEN || '';
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const response = await axios.post(
//         "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
//         {
//           inputs: prompt,
//           parameters: { width: 800, height: 1200 }
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//           responseType: 'arraybuffer',
//           timeout: 60000,
//         }
//       );
//       return Buffer.from(response.data);
//     } catch (error: any) {
//       const errorMsg = error.response?.data
//         ? Buffer.from(error.response.data).toString()
//         : error.message;
//       console.log(`  Attempt ${attempt}/${retries} failed: ${errorMsg}`);
//       if (error.response?.status === 503 && errorMsg.includes('loading')) {
//         console.log('  Model is loading, waiting 20 seconds...');
//         if (attempt < retries) {
//           await new Promise(resolve => setTimeout(resolve, 20000));
//           continue;
//         }
//       }
//       if (attempt < retries) {
//         console.log('  Retrying in 10 seconds...');
//         await new Promise(resolve => setTimeout(resolve, 10000));
//       } else {
//         throw new Error(`Failed after ${retries} attempts: ${errorMsg}`);
//       }
//     }
//   }
//   throw new Error('All retry attempts failed');
// }
// ── [/HIDDEN] ──────────────────────────────────────────────────────────────

// Generate image via gen.pollinations.ai (aktif)
async function generateImage(prompt: string): Promise<Buffer> {
  console.log('  Calling gen.pollinations.ai (Flux)...');
  const seed = Math.floor(Math.random() * 999999);
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=600&height=900&seed=${seed}&nologo=true`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_POLLINATIONS_KEY}` },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Save buffer to file
async function saveBuffer(buffer: Buffer, filepath: string): Promise<void> {
  fs.writeFileSync(filepath, buffer);
  console.log(`  Saved ${(buffer.length / 1024).toFixed(2)} KB`);
}

// Backup existing cover
function backupExistingCover(storyId: string): void {
  const coverPath = path.join(process.cwd(), 'public', 'covers', `${storyId}.png`);
  const backupPath = path.join(process.cwd(), 'public', 'covers', `${storyId}.png.backup`);
  if (fs.existsSync(coverPath)) {
    fs.copyFileSync(coverPath, backupPath);
    console.log('  ✓ Backed up existing cover');
  }
}

// Process a single story
async function processStory(story: StoryPrompt, index: number, total: number): Promise<boolean> {
  console.log(`\n[${index}/${total}] Processing: ${story.title}`);
  console.log(`  ID: ${story.id}`);
  console.log(`  Prompt: ${story.prompt}`);

  try {
    backupExistingCover(story.id);
    const imageBuffer = await generateImage(story.prompt);
    console.log(`  ✓ Image generated`);
    const coverPath = path.join(process.cwd(), 'public', 'covers', `${story.id}.png`);
    await saveBuffer(imageBuffer, coverPath);
    console.log(`  ✓ Saved to: ${coverPath}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('\n=== AI Cover Image Generation (gen.pollinations.ai - Flux) ===\n');

  // ── [HIDDEN] HuggingFace token check ──────────────────────────────────
  // if (!process.env.HUGGINGFACE_TOKEN) {
  //   console.error('Error: HUGGINGFACE_TOKEN not found in .env.local');
  //   console.log('\nTo get started (100% FREE):');
  //   console.log('1. Sign up at https://huggingface.co (free forever)');
  //   console.log('2. Get token from https://huggingface.co/settings/tokens');
  //   console.log('3. Create "Read" token and add to .env.local: HUGGINGFACE_TOKEN="hf_..."');
  //   console.log('\nThis is completely FREE with no limits!');
  //   process.exit(1);
  // }
  // console.log('Using Hugging Face FREE Inference API - no payment required!\n');
  // ── [/HIDDEN] ──────────────────────────────────────────────────────────

  // Read prompts file
  const promptsPath = path.join(process.cwd(), 'scripts', 'cover-prompts.json');
  if (!fs.existsSync(promptsPath)) {
    console.error('Error: cover-prompts.json not found');
    console.log('Run: npm run generate-prompts [number] first');
    process.exit(1);
  }

  const stories: StoryPrompt[] = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
  console.log(`Found ${stories.length} stories to process\n`);

  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : stories.length;
  const storiesToProcess = stories.slice(0, limit);

  console.log(`Processing ${storiesToProcess.length} stories...\n`);
  console.log('═'.repeat(60));

  let success = 0;
  let failed = 0;

  for (let i = 0; i < storiesToProcess.length; i++) {
    const result = await processStory(storiesToProcess[i], i + 1, storiesToProcess.length);
    if (result) success++; else failed++;

    if (i < storiesToProcess.length - 1) {
      console.log('  Waiting 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n=== Summary ===');
  console.log(`✓ Success: ${success}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`\nGenerated covers saved to: public/covers/`);
  console.log(`Original covers backed up as: *.png.backup`);
}

main().catch(console.error);
