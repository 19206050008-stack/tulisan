// Server Component — pre-fetch published stories for audio library
import { getStories } from '@/lib/supabase';
import AudioLibraryClient from '@/components/AudioLibraryClient';

export const dynamic = 'force-dynamic';

export default async function AudioPage() {
  const stories = await getStories('published');

  // All published stories are available as audio (TTS is client-side)
  const audioStories = (stories || []).filter((s: any) => s.title);

  return <AudioLibraryClient stories={audioStories} />;
}
