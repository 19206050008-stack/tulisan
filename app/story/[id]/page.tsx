// Server Component — pre-fetch story data di server
import { notFound } from 'next/navigation';
import { getStoryById, getChapters, getComments } from '@/lib/supabase';
import StoryReaderClient from '@/components/StoryReaderClient';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch semua data di SERVER — tidak masuk ke bundle client
  const story = await getStoryById(id);

  if (!story) {
    notFound();
  }

  const [chapters, comments] = await Promise.all([
    getChapters(story.id),
    getComments(story.id),
  ]);

  return (
    <StoryReaderClient
      story={story}
      chapters={chapters}
      comments={comments}
    />
  );
}
