// Server Component — data di-fetch di server, dikirim sebagai props ke client
import { getHomepageStories, getCategories, getEditorialPicks, getTopMonthly, getCompletedStories } from '@/lib/supabase';
import HomePageClient from '@/components/HomePageClient';

export default async function Home() {
  // Semua query dijalankan di SERVER — tidak masuk ke bundle client
  const [storiesData, catsData, editorial, monthly, completed] = await Promise.all([
    getHomepageStories(30),
    getCategories(),
    getEditorialPicks(6),
    getTopMonthly(10),
    getCompletedStories(10),
  ]);

  const catNames = catsData.map((c: any) => c.name);
  const categoryNames = ['All', ...catNames];

  // Pilih genre random yang punya stories
  const genresWithStories = catNames.filter((g: string) => storiesData.some((s: any) => s.category === g));
  const dayIndex = new Date().getDate() % Math.max(genresWithStories.length, 1);
  const randomGenres = genresWithStories.length > 0 ? [genresWithStories[dayIndex]] : [];

  return (
    <HomePageClient
      stories={storiesData}
      categoryNames={categoryNames}
      editorialPicks={editorial}
      topMonthly={monthly}
      completedStories={completed}
      randomGenres={randomGenres}
    />
  );
}
