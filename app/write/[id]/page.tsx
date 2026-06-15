'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { createStory, updateStory, getStoryById, uploadCover, createChapter, getChapters, updateChapter, deleteChapter } from '@/lib/supabase';
import { Save, Send, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { CoverUpload } from '@/components/CoverUpload';
import { RichEditor } from '@/components/RichEditor';

export default function WriteEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, role } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [status, setStatus] = useState('draft');
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(id as string || null);
  // Key untuk force remount RichEditor saat chapter berganti
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (role === 'guest') {
      router.push('/login');
      return;
    }
    if (id) {
      loadStory();
    }
  }, [id, role]);

  const loadStory = async () => {
    setLoading(true);
    const story = await getStoryById(id as string);
    if (story) {
      setTitle(story.title);
      setDescription(story.description || '');
      setCategory(story.category || '');
      setTags(story.tags?.join(', ') || '');
      setCoverUrl(story.cover_url || '');
      setCoverPreview(story.cover_url || '');
      setStatus(story.status);
      const chs = await getChapters(id as string);
      setChapters(chs);
      if (chs.length > 0) {
        setChapterTitle(chs[0].title);
        const raw = typeof chs[0].content === 'string' ? chs[0].content : JSON.stringify(chs[0].content);
        setChapterContent(normalizeContent(raw));
        setEditorKey(k => k + 1); // force remount dengan konten yang sudah ada
      }
    }
    setLoading(false);
  };

  // Konversi plain text lama ke HTML agar TipTap bisa menampilkannya
  const normalizeContent = (raw: string): string => {
    if (!raw) return '';
    // Sudah HTML — langsung pakai
    if (raw.trimStart().startsWith('<')) return raw;
    // JSON string yang dibungkus tanda kutip
    let text = raw;
    if (text.startsWith('"') && text.endsWith('"')) {
      try { text = JSON.parse(text); } catch {}
    }
    text = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    // Konversi plain text ke paragraf HTML
    return text
      .split('\n')
      .map(line => line.trim() ? `<p>${line.trim()}</p>` : '<p></p>')
      .join('');
  };

  const handleCoverReady = (file: File) => {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const saveStory = async (publishStatus?: string) => {
    setSaving(true);
    try {
      let currentStoryId = storyId;
      let finalCoverUrl = coverUrl;

      if (!currentStoryId) {
        const story = await createStory(user.id, title, description, category, tags.split(',').map(t => t.trim()).filter(Boolean));
        currentStoryId = story.id;
        setStoryId(story.id);
      } else {
        await updateStory(currentStoryId, {
          title,
          description,
          category,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          status: publishStatus || status
        });
      }

      if (coverFile && currentStoryId) {
        finalCoverUrl = await uploadCover(coverFile, currentStoryId);
        setCoverUrl(finalCoverUrl);
        setCoverFile(null);
        await updateStory(currentStoryId, { cover_url: finalCoverUrl });
      }

      if (publishStatus) {
        await updateStory(currentStoryId!, { status: publishStatus });
        setStatus(publishStatus);
      }

      if (chapterTitle || chapterContent) {
        if (chapters[activeChapter]) {
          await updateChapter(chapters[activeChapter].id, {
            title: chapterTitle,
            content: chapterContent,
            status: publishStatus === 'published' ? 'published' : 'draft'
          });
        } else {
          const ch = await createChapter(currentStoryId!, chapterTitle || 'Untitled Chapter', chapterContent, chapters.length + 1);
          setChapters([...chapters, ch]);
        }
      }

      if (!id && currentStoryId) {
        router.replace(`/write/${currentStoryId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addNewChapter = () => {
    setActiveChapter(chapters.length);
    setChapterTitle('');
    setChapterContent('');
    setEditorKey(k => k + 1);
  };

  const selectChapter = (index: number) => {
    setActiveChapter(index);
    setChapterTitle(chapters[index].title);
    const raw = typeof chapters[index].content === 'string' ? chapters[index].content : JSON.stringify(chapters[index].content);
    setChapterContent(normalizeContent(raw));
    setEditorKey(k => k + 1);
  };

  const handleDeleteChapter = async (chapterId: string, index: number) => {
    if (!confirm('Delete this chapter?')) return;
    await deleteChapter(chapterId);
    const updated = chapters.filter((_, i) => i !== index);
    setChapters(updated);
    if (updated.length > 0) {
      selectChapter(0);
    } else {
      setChapterTitle('');
      setChapterContent('');
      setActiveChapter(0);
    }
  };

  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = document.getElementById('chapter-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = chapterContent.substring(start, end);
    const newContent = chapterContent.substring(0, start) + prefix + selected + suffix + chapterContent.substring(end);
    setChapterContent(newContent);
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/my-stories')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to My Stories
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveStory('draft')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-subtle dark:border-gray-700 hover:bg-brand-muted dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => saveStory('published')}
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
            placeholder="Write a description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm bg-brand-muted dark:bg-gray-800 rounded-lg p-3 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent resize-none"
          />

          {!loading && (
            <RichEditor
              key={editorKey}
              value={chapterContent}
              onChange={setChapterContent}
              placeholder="Mulai menulis bab ini..."
              minHeight={400}
              showWordCount={true}
              mode="full"
            />
          )}
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

          <div className="space-y-3 p-4 rounded-xl border border-subtle dark:border-gray-700 bg-brand-bg dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Chapters</h3>
              <button onClick={addNewChapter} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {chapters.map((ch, i) => (
                <div key={ch.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${i === activeChapter ? 'bg-accent/10 text-accent' : 'hover:bg-brand-muted dark:hover:bg-gray-700'}`}>
                  <span onClick={() => selectChapter(i)} className="flex-1 truncate">{ch.title || `Chapter ${i + 1}`}</span>
                  <button onClick={() => handleDeleteChapter(ch.id, i)} className="p-1 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
              <div
                onClick={() => setActiveChapter(chapters.length)}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${activeChapter === chapters.length && chapters.length > 0 ? 'bg-accent/10 text-accent' : activeChapter === chapters.length ? 'bg-accent/10 text-accent' : 'hover:bg-brand-muted dark:hover:bg-gray-700'}`}
              >
                + New Chapter
              </div>
            </div>
            <input
              type="text"
              placeholder="Chapter title"
              value={chapterTitle}
              onChange={e => setChapterTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-brand-muted dark:bg-gray-900 border border-subtle dark:border-gray-700 focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
