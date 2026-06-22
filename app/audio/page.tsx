// Server Component — pre-fetch stories with approved audio for audio library
import { getStories } from '@/lib/supabase';
import { getApprovedAudioStoryIds } from '@/lib/supabase/admin';
import AudioLibraryClient from '@/components/AudioLibraryClient';

export const dynamic = 'force-dynamic';

export default async function AudioPage() {
  const [stories, approvedIds] = await Promise.all([
    getStories('published'),
    getApprovedAudioStoryIds(),
  ]);

  // Only stories with admin-approved audio
  const audioStories = (stories || []).filter((s: any) => s.title && approvedIds.has(s.id));

  return <AudioLibraryClient stories={audioStories} />;
}
