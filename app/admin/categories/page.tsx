'use client';

import { useEffect, useState } from 'react';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/supabase';
import { Plus, Trash2, Eye, EyeOff, Tag } from 'lucide-react';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    const data = await getAllCategories();
    setCategories(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      const cat = await createCategory(newName, slug, newDesc || undefined);
      setCategories([...categories, cat]);
      setNewName('');
      setNewDesc('');
      setShowAdd(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await updateCategory(id, { active: !current });
    setCategories(categories.map(c => c.id === id ? { ...c, active: !current } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await deleteCategory(id);
    setCategories(categories.filter(c => c.id !== id));
  };

  if (loading) return <div className="text-center py-16 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold font-serif">Categories</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {showAdd && (
        <div className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
          <h3 className="font-semibold">New Category</h3>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Category name" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
          <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900 border border-border focus:outline-none focus:border-accent" />
          <div className="flex gap-3">
            <button onClick={handleAdd} className="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90">Save</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-full border border-border text-sm hover:bg-bg-soft">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {categories.map(c => (
          <div key={c.id} className={`flex items-center justify-between p-4 rounded-xl border ${c.active ? 'border-border bg-bg-card' : 'border-dashed border-gray-300 dark:border-gray-700 opacity-60'}`}>
            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-accent" />
              <div>
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{c.slug} {c.description && `- ${c.description}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(c.id, c.active)} className="p-2 rounded-lg hover:bg-bg-soft transition-colors">
                {c.active ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && <p className="text-center text-gray-500 py-8">No categories. Add your first one.</p>}
      </div>
    </div>
  );
}
