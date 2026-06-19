import { supabase } from './client';

// Upload cover image
export async function uploadCover(file: File, storyId: string) {
  if (!supabase) throw new Error('Supabase not configured');
  const ext = file.name.split('.').pop() || 'png';
  // Add timestamp to path to ensure unique upload and prevent caching
  const timestamp = Date.now();
  const path = `${storyId}-${timestamp}.${ext}`;
  const { data, error } = await supabase.storage.from('covers').upload(path, file, { upsert: true });
  if (error) throw error;
  
  // Get public URL with cache-busting parameter
  const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path);
  // Add query parameter to force reload
  return `${urlData.publicUrl}?t=${timestamp}`;
}

// Generate ad banner from title + description using Pollinations AI
export async function generateBanner(title: string, description?: string, category?: string): Promise<string> {
  // Use Pollinations AI API for image generation
  const prompt = `${title}${description ? ' - ' + description : ''} banner ad style, ${category || 'modern'} design, professional, high quality`;
  const encodedPrompt = encodeURIComponent(prompt);
  
  // Banner dimensions: 728x90 (leaderboard) or 300x250 (medium rectangle)
  const width = 728;
  const height = 90;
  
  // Add seed for consistency with same prompt
  const seed = Math.floor(Math.random() * 1000000);
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
  
  return imageUrl;
}
