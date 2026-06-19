'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getSavedStories, toggleSave } from '@/lib/supabase';
import { Bookmark, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StoryCover } from '@/components/StoryCover';

export default function LibraryPage() {
  const { user, role, _hasHydrated } = useStore();
  const router = useRouter();
  const [saves, setSaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLibrary = async () => {
    setLoading(true);
    const data = await getSavedStories(user!.id);
    setSaves(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for store hydration
    if (role === 'guest') {
      router.push('/login');
      return;
    }
    if (user?.id) {
      loadLibrary();
    }
  }, [user, role, _hasHydrated]);

  const handleRemove = async (storyId: string) => {
    await toggleSave(user!.id, storyId);
    setSaves(saves.filter(s => s.story_id !== storyId));
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bookmark className="h-6 w-6 text-accent" />
        <h1 className="text-3xl font-bold font-serif">My Library</h1>
      </div>

      {saves.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-gray-500 text-lg">Your library is empty.</p>
          <p className="text-sm text-gray-400">Save stories to read them later.</p>
          <Link href="/browse" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition-opacity">
            Browse Stories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {saves.map(save => (
            <div key={save.story_id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-bg-card">
              <Link href={`/story/${save.story_id}`} className="flex-1 flex items-start gap-3">
                <div className="w-12 h-16 rounded overflow-hidden shrink-0 relative">
                  <StoryCover coverUrl={save.stories?.cover_url} category={save.stories?.category} title={save.stories?.title || ''} />
                </div>
                <div>
                  <h3 className="font-semibold hover:text-accent transition-colors">{save.stories?.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">by {save.stories?.profiles?.full_name || save.stories?.profiles?.username}</p>
                </div>
              </Link>
              <button onClick={() => handleRemove(save.story_id)} className="p-1.5 rounded hover:bg-bg-soft text-gray-400 hover:text-red-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
