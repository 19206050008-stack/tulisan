'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { createStory, updateStory, getStoryById, uploadCover, createChapter, getChapters, updateChapter, deleteChapter, getCategories } from '@/lib/supabase';
import { Save, Send, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { CoverUpload } from '@/components/CoverUpload';
import { translations } from '@/lib/i18n';
import { countWords, determineTier } from '@/lib/tier-utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Lazy load TipTap editor - hanya dimuat saat halaman /write/[id] dibuka (~200KB savings)
const RichEditor = dynamic(
  () => import('@/components/RichEditor').then(m => ({ default: m.RichEditor })),
  {
    loading: () => (
      <div className="min-h-[400px] bg-bg-input rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-sm text-tx-muted">Loading editor...</span>
      </div>
    ),
    ssr: false,
  }
);

export default function WriteEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, role, _hasHydrated, lang } = useStore();
  const t = translations[lang].write;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; index: number } | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);

  const normalizeContent = (raw: string): string => {
    if (!raw) return '';

    // Sudah HTML dari TipTap baru — langsung pakai
    if (raw.trimStart().startsWith('<')) return raw;

    let text = raw;

    // Kasus 1: JSON string double-encoded — "\"teks...\""
    // Supabase kadang simpan sebagai JSON string sehingga perlu di-parse dua kali
    if (text.startsWith('"') && text.endsWith('"')) {
      try {
        const parsed = JSON.parse(text); // hasil: string biasa
        if (typeof parsed === 'string') text = parsed;
      } catch {}
    }

    // Kasus 2: escaped newlines \\n -> \n (handle multiple escape levels)
    // Handle \\n, \n sebagai string literal (bukan actual newline)
    text = text.replace(/\\\\n/g, '\n'); // \\n -> \n
    text = text.replace(/\\n/g, '\n');   // \n -> actual newline
    text = text.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

    // Kalau setelah decode ternyata sudah HTML
    if (text.trimStart().startsWith('<')) return text;

    // Konversi plain text paragraf ke HTML
    // Split by double newlines untuk paragraf
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    if (paragraphs.length > 0) {
      // Map setiap paragraf ke <p>, dan single \n dalam paragraf jadi <br>
      return paragraphs.map(p => {
        // Escape HTML entities untuk keamanan
        const escaped = p
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        // Replace single newlines dengan <br>
        return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
      }).join('');
    }
    
    // Fallback: single newline per baris
    return text.split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        const escaped = trimmed
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<p>${escaped}</p>`;
      })
      .filter(Boolean)
      .join('');
  };

  const loadStory = async () => {
    setLoading(true);
    const story = await getStoryById(id as string);
    if (story) {
      setTitle(story.title);
      setDescription(story.description || '');
      setCategory(story.category || '');
      
      const tierTags = ['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang'];
      const oldTierTags = ['Pendek', 'Sedang', 'Panjang'];
      const foundTier = story.tags?.find((t: string) => tierTags.includes(t));
      const foundOldTier = story.tags?.find((t: string) => oldTierTags.includes(t));
      if (foundTier) {
        setSelectedTier(foundTier);
      } else if (foundOldTier) {
        setSelectedTier('Cerita ' + foundOldTier);
      }
      
      const restTags = story.tags?.filter((t: string) => !tierTags.includes(t)) || [];
      setTags(restTags.join(', '));
      
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

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for store hydration
    if (role === 'guest') {
      router.push('/login');
      return;
    }
    if (id) {
      loadStory();
    }
    getCategories().then(cats => setCategoryOptions(cats));
  }, [id, role, _hasHydrated]);

  const handleCoverReady = (file: File) => {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const saveStory = async (publishStatus?: string) => {
    setSaving(true);
    try {
      let currentStoryId = storyId;
      let finalCoverUrl = coverUrl;

      // Save chapter first (if there's content)
      if (currentStoryId && (chapterTitle || chapterContent)) {
        if (chapters[activeChapter]) {
          await updateChapter(chapters[activeChapter].id, {
            title: chapterTitle,
            content: chapterContent,
            status: publishStatus === 'published' ? 'published' : 'draft'
          });
        } else {
          const ch = await createChapter(currentStoryId, chapterTitle || 'Untitled Chapter', chapterContent, chapters.length + 1);
          setChapters([...chapters, ch]);
        }
      }

      // Use selected tier, or calculate tier from all chapters if not selected
      let finalTier = selectedTier || null;
      if (!finalTier && currentStoryId) {
        const allChapters = await getChapters(currentStoryId);
        const totalWords = allChapters.reduce((sum, ch) => sum + countWords(ch.content || ''), 0);
        finalTier = determineTier(totalWords);
      }
      
      // Prepare tags array and add tier if exists
      let tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (finalTier) {
        // Remove old tier tags
        tagsArray = tagsArray.filter(t => !['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Pendek', 'Sedang', 'Panjang'].includes(t));
        // Add new tier
        tagsArray.push(finalTier);
      }

      // Auto-generate description from chapter content
      const plainText = chapterContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const autoDescription = plainText.slice(0, 200) + (plainText.length > 200 ? '...' : '');

      if (!currentStoryId) {
        const story = await createStory(user!.id, title, autoDescription, category, tagsArray);
        currentStoryId = story.id;
        setStoryId(story.id);
      } else {
        await updateStory(currentStoryId, {
          title,
          description: autoDescription,
          category,
          tags: tagsArray,
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

  const handleDeleteChapter = async () => {
    if (!chapterToDelete) return;
    
    try {
      // Delete the chapter from database
      await deleteChapter(chapterToDelete.id);
      
      // Remove from local array
      const updated = chapters.filter((_, i) => i !== chapterToDelete.index);
      
      // 🔧 FIX: Re-number all chapters sequentially to avoid gaps
      for (let i = 0; i < updated.length; i++) {
        const expectedChapterNumber = i + 1;
        if (updated[i].chapter_number !== expectedChapterNumber) {
          await updateChapter(updated[i].id, { chapter_number: expectedChapterNumber });
          updated[i].chapter_number = expectedChapterNumber;
        }
      }
      
      setChapters(updated);
      
      if (updated.length > 0) {
        selectChapter(0);
      } else {
        setChapterTitle('');
        setChapterContent('');
        setActiveChapter(0);
      }
      
      setChapterToDelete(null);
      setDeleteDialogOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete chapter');
    }
  };

  const initiateDeleteChapter = (chapterId: string, index: number) => {
    setChapterToDelete({ id: chapterId, index });
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/my-stories')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> {translations[lang].myStories.title}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveStory('draft')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-border hover:bg-bg-soft transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? t.saving : t.saveDraft}
          </button>
          <button
            onClick={() => saveStory('published')}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {t.publish}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <input
            type="text"
            placeholder={t.titlePlaceholder}
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-2xl font-serif font-bold bg-transparent border-none outline-none text-tx placeholder:text-tx-muted"
          />

          {!loading && (
            <Suspense fallback={
              <div className="min-h-[400px] bg-bg-input rounded-xl animate-pulse flex items-center justify-center">
                <span className="text-sm text-tx-muted">Loading editor...</span>
              </div>
            }>
              <RichEditor
                key={editorKey}
                value={chapterContent}
                onChange={setChapterContent}
                placeholder={t.startWriting}
                minHeight={400}
                showWordCount={true}
                mode="full"
              />
            </Suspense>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <CoverUpload preview={coverPreview} onFileReady={handleCoverReady} title={title} category={category} description={description} tags={tags.split(',').map(t => t.trim()).filter(Boolean)} />
          </div>

          <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <h3 className="font-semibold text-sm">Details</h3>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300"
            >
              <option value="">{t.selectCategory}</option>
              {categoryOptions.map(cat => (
                <option key={cat.id || cat.slug} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <select
              value={selectedTier}
              onChange={e => setSelectedTier(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300"
            >
              <option value="">Auto (Berdasarkan jumlah kata)</option>
              <option value="Cerita Pendek">Cerita Pendek (&lt; 7.500 kata)</option>
              <option value="Cerita Sedang">Cerita Sedang (7.500 - 40.000 kata)</option>
              <option value="Cerita Panjang">Cerita Panjang (&gt; 40.000 kata)</option>
            </select>
            <input
              type="text"
              placeholder={t.tagsPlaceholder}
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{t.chapters}</h3>
              <button onClick={addNewChapter} className="p-1 rounded hover:bg-bg-soft transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {chapters.map((ch, i) => (
                <div key={ch.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${i === activeChapter ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <span onClick={() => selectChapter(i)} className="flex-1 truncate">{ch.title || `Chapter ${ch.chapter_number || i + 1}`}</span>
                  <button onClick={() => initiateDeleteChapter(ch.id, i)} className="p-1 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
              <div
                onClick={() => setActiveChapter(chapters.length)}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${activeChapter === chapters.length ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                {t.newChapter}
              </div>
            </div>
            <input
              type="text"
              placeholder={t.chapterTitle}
              value={chapterTitle}
              onChange={e => setChapterTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Delete Chapter Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteChapter}
        title={t.deleteChapterConfirm || 'Delete Chapter'}
        message="Are you sure you want to delete this chapter? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
}
