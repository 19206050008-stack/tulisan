'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getMyStories, deleteStory } from '@/lib/supabase';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StoryCover } from '@/components/StoryCover';
import { Pagination } from '@/components/Pagination';
import { translations } from '@/lib/i18n';

export default function MyStoriesPage() {
  const { user, role, _hasHydrated, lang } = useStore();
  const t = translations[lang].myStories;
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for store hydration
    if (role === 'guest') { router.push('/login'); return; }
    if (user?.id) loadStories();
  }, [user, role, _hasHydrated]);

  const loadStories = async () => {
    setLoading(true);
    const data = await getMyStories(user.id);
    setStories(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    try {
      await deleteStory(id);
      setStories(stories.filter(s => s.id !== id));
    } catch {}
  };

  const totalPages = Math.ceil(stories.length / perPage);
  const paginated = stories.slice((currentPage - 1) * perPage, currentPage * perPage);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold font-serif">{t.title}</h1>
        <Link href="/write" className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> {translations[lang].write.newStory}
        </Link>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-gray-500 text-lg">{lang === 'id' ? "Anda belum menulis cerita apa pun." : "You haven't written any stories yet."}</p>
          <Link href="/write" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> {translations[lang].write.newStory}
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{stories.length} {lang === 'id' ? 'cerita' : 'stories'}</p>
          <div className="space-y-3">
            {paginated.map(story => (
              <div key={story.id} className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-14 md:w-12 md:h-16 rounded overflow-hidden shrink-0">
                    <StoryCover coverUrl={story.cover_url} category={story.category} title={story.title} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm md:text-base truncate">{story.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs md:text-sm text-gray-500">
                      <span className={`flex items-center gap-1 ${story.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {story.status === 'published' ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {story.status === 'published' ? t.published : t.draft}
                      </span>
                      <span className="hidden sm:inline">{story.category || (lang === 'id' ? 'Tanpa kategori' : 'No category')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  <Link href={`/write/${story.id}`} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title={t.edit}>
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button onClick={() => handleDelete(story.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors" title={t.delete}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </>
      )}
    </div>
  );
}
