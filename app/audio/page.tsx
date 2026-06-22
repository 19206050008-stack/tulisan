// Server Component — pre-fetch stories with chapters for audio library
import { getStories } from '@/lib/supabase';
import AudioLibraryClient from '@/components/AudioLibraryClient';

export const dynamic = 'force-dynamic';

export default async function AudioPage() {
  const stories = await getStories('published');

  // Only stories that have content to read
  const audioStories = (stories || []).filter((s: any) => s.title);

  return <AudioLibraryClient stories={audioStories} />;
}
