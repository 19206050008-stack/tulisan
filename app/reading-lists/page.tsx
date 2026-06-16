'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { getReadingLists, createReadingList, deleteReadingList } from '@/lib/supabase';
import { Plus, Trash2, BookOpen, X } from 'lucide-react';

export default function ReadingListsPage() {
  const { user, role, _hasHydrated } = useStore();
  const router = useRouter();
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for store hydration
    if (role === 'guest') {
      router.push('/login');
      return;
    }
    if (user?.id) loadLists();
  }, [user, role, _hasHydrated]);

  const loadLists = async () => {
    setLoading(true);
    const data = await getReadingLists(user.id);
    setLists(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const list = await createReadingList(user.id, newName, newDesc);
      setLists([{ ...list, reading_list_items: [] }, ...lists]);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
    } catch {}
  };

  const handleDelete = async (listId: string) => {
    if (!confirm('Delete this reading list?')) return;
    await deleteReadingList(listId);
    setLists(lists.filter(l => l.id !== listId));
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif flex items-center gap-2"><BookOpen className="h-7 w-7" /> Reading Lists</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> New List
        </button>
      </div>

      {showCreate && (
        <div className="p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Create Reading List</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="h-4 w-4" /></button>
          </div>
          <input
            type="text"
            placeholder="List name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent text-sm"
          />
          <button onClick={handleCreate} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Create
          </button>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-gray-500 text-lg">No reading lists yet.</p>
          <p className="text-sm text-gray-400">Create lists to organize stories by theme or mood.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lists.map(list => (
            <div key={list.id} className="p-5 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{list.name}</h3>
                  {list.description && <p className="text-sm text-gray-500 mt-1">{list.description}</p>}
                </div>
                <button onClick={() => handleDelete(list.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500">{list.reading_list_items?.length || 0} stories</p>
              {list.reading_list_items?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {list.reading_list_items.slice(0, 5).map((item: any) => (
                    <Link href={`/story/${item.story_id}`} key={item.story_id} className="shrink-0">
                      <div className="w-10 h-14 rounded overflow-hidden">
                        {item.stories?.cover_url && !item.stories.cover_url.startsWith('gradient:') ? (
                          <img src={item.stories.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
