// Server Component — pre-fetch data di server, pass ke client
import { Suspense } from 'react';
import { getStories, getCategories } from '@/lib/supabase';
import { BrowsePageInner } from '@/components/BrowsePageClient';

export default async function BrowsePage() {
  // Fetch data di SERVER — tidak masuk ke bundle client
  const [storiesData, catsData] = await Promise.all([
    getStories('published'),
    getCategories(),
  ]);

  const categories = catsData.map((c: any) => c.name);

  // Extract all unique tags from stories
  const tagsSet = new Set<string>();
  storiesData.forEach((story: any) => {
    if (story.tags && Array.isArray(story.tags)) {
      story.tags.forEach((tag: string) => {
        if (tag && !['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Pendek', 'Sedang', 'Panjang'].includes(tag)) {
          tagsSet.add(tag);
        }
      });
    }
  });
  const allTags = Array.from(tagsSet).sort();

  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-500">Loading...</div>}>
      <BrowsePageInner
        stories={storiesData}
        categories={categories}
        tags={allTags}
      />
    </Suspense>
  );
}
