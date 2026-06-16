'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { createStory, uploadCover } from '@/lib/supabase';
import { Bold, Italic, List, AlignLeft, Save, Send, ArrowLeft } from 'lucide-react';
import { CoverUpload } from '@/components/CoverUpload';
import { RichEditor } from '@/components/RichEditor';

export default function WritePage() {
  const router = useRouter();
  const { user, role, _hasHydrated } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('Chapter 1');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for store hydration
    if (role === 'guest') router.push('/login');
  }, [role, _hasHydrated]);

  if (!_hasHydrated) return <div className="text-center py-16 text-gray-500">Loading...</div>;
  if (role === 'guest') return null;

  const handleCoverReady = (file: File) => {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) {
      alert('Please enter a story title');
      return;
    }
    setSaving(true);
    try {
      const story = await createStory(user.id, title, description, category, tags.split(',').map(t => t.trim()).filter(Boolean));

      if (coverFile) {
        const coverUrl = await uploadCover(coverFile, story.id);
        const { updateStory } = await import('@/lib/supabase');
        await updateStory(story.id, { cover_url: coverUrl });
      }

      if (content.trim()) {
        const { createChapter, updateStory } = await import('@/lib/supabase');
        await createChapter(story.id, chapterTitle, content, 1);
        if (publish) {
          await updateStory(story.id, { status: 'published' });
        }
      } else if (publish) {
        const { updateStory } = await import('@/lib/supabase');
        await updateStory(story.id, { status: 'published' });
      }

      router.push(`/write/${story.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = document.getElementById('editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    setContent(content.substring(0, start) + prefix + selected + suffix + content.substring(end));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/my-stories')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> My Stories
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-subtle dark:border-gray-700 hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <input
            type="text"
            placeholder="Story Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-2xl font-serif font-bold bg-transparent border-none outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
          <textarea
            placeholder="Write a short description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm bg-brand-muted dark:bg-gray-800 rounded-lg p-3 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent resize-none"
          />
          <input
            type="text"
            placeholder="Chapter Title"
            value={chapterTitle}
            onChange={e => setChapterTitle(e.target.value)}
            className="w-full text-lg font-medium bg-transparent border-none outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />

          <RichEditor
            value={content}
            onChange={setContent}
            placeholder="Mulai menulis ceritamu di sini..."
            minHeight={400}
            showWordCount={true}
            mode="full"
          />
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
                <CoverUpload preview={coverPreview} onFileReady={handleCoverReady} title={title} category={category} description={description} tags={tags.split(',').map(t => t.trim()).filter(Boolean)} />
              </div>

          <div className="space-y-3 p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
            <h3 className="font-semibold text-sm">Details</h3>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent"
            >
              <option value="">Select Category</option>
              <option value="Romance">Romance</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Mystery">Mystery</option>
              <option value="Horror">Horror</option>
              <option value="Teen Fiction">Teen Fiction</option>
              <option value="Humor">Humor</option>
              <option value="Adventure">Adventure</option>
              <option value="Fanfiction">Fanfiction</option>
            </select>
            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
