'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { createStory, uploadCover, moderateText, getCategories } from '@/lib/supabase';
import { Bold, Italic, List, AlignLeft, Save, Send, ArrowLeft } from 'lucide-react';
import { CoverUpload } from '@/components/CoverUpload';
import { translations } from '@/lib/i18n';
import { countWords, determineTier } from '@/lib/tier-utils';

// Lazy load TipTap editor - hanya dimuat saat halaman /write dibuka (~200KB savings)
const RichEditor = dynamic(
  () => import('@/components/RichEditor').then(m => ({ default: m.RichEditor })),
  {
    loading: () => (
      <div className="min-h-[400px] bg-bg-input rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-sm text-tx-muted">Loading editor...</span>
      </div>
    ),
    ssr: false, // TipTap tidak perlu SSR
  }
);

export default function WritePage() {
  const router = useRouter();
  const { user, role, _hasHydrated, lang } = useStore();
  const t = translations[lang].write;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('Chapter 1');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<any[]>([]);

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for store hydration
    if (role === 'guest') router.push('/login');
    getCategories().then(cats => setCategoryOptions(cats));
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
    
    // Scan content before save
    const combinedContent = `${title}\n${description}\n${content}`;
    try {
      const moderationResult = await moderateText(combinedContent, 'id');
      
      if (!moderationResult.is_safe && publish) {
        const shouldContinue = confirm(
          `⚠️ KONTEN DIPERHATIKAN!\n\n` +
          `Safety Score: ${Math.round(moderationResult.confidence_score * 100)}%\n` +
          `Flagged: ${moderationResult.flagged_categories.join(', ')}\n\n` +
          `Are you sure you want to publish this? If yes, it will be marked for manual review.\n\n` +
          'Click Cancel to edit your content first.'
        );
        
        if (!shouldContinue) return;
      }
    } catch (error) {
      console.log('Moderation scan skipped:', error);
      // Continue with save even if moderation fails (fallback behavior)
    }
    
    setSaving(true);
    try {
      // Import functions upfront to avoid timing issues
      const supabaseModule = await import('@/lib/supabase');
      const { createStory, uploadCover, updateStory } = supabaseModule;
      
      // Prepare tags array and add tier if exists
      let tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      
      let finalTier = selectedTier || null;
      if (!finalTier) {
        // Calculate tier from content if not manually selected
        const wordCount = countWords(content);
        finalTier = determineTier(wordCount);
      }
      
      if (finalTier) {
        // Remove old tier tags (if any)
        tagsArray = tagsArray.filter(t => !['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Pendek', 'Sedang', 'Panjang'].includes(t));
        // Add new tier
        tagsArray.push(finalTier);
      }
      
      // Create story first
      const story = await createStory(user!.id, title, description, category, tagsArray);
      console.log('Story created:', story.id);

      // Upload NEW cover if available
      if (coverFile) {
        console.log(`📁 Uploading cover: ${coverFile.name} (${(coverFile.size / 1024).toFixed(2)} KB)`);
        const newCoverUrl = await uploadCover(coverFile, story.id);
        console.log(`✅ Cover uploaded: ${newCoverUrl}`);
        
        // Update story with new cover URL
        await updateStory(story.id, { 
          cover_url: newCoverUrl 
        });
        console.log('✓ Database updated with new cover URL');
      } else {
        console.log('⚠️ No cover file - keeping existing one');
      }

      if (content.trim()) {
        const { createChapter } = await import('@/lib/supabase');
        await createChapter(story.id, chapterTitle, content, 1);
        await updateStory(story.id, { 
          status: publish ? 'published' : 'draft' 
        });
      } else {
        await updateStory(story.id, { 
          status: publish ? 'published' : 'draft' 
        });
      }

      alert(publish ? 'Cerita berhasil diterbitkan!' : 'Draf berhasil disimpan!');
      
      router.push(`/story/${story.id}`);
    } catch (error: any) {
      console.error('❌ Save error:', error);
      alert(`Error: ${error.message || 'Failed to save story'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/my-stories')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> {translations[lang].myStories.title}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-border hover:bg-bg-soft transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? t.saving : t.saveDraft}
          </button>
          <button
            onClick={() => handleSave(true)}
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
          <textarea
            placeholder={t.descPlaceholder}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm bg-white text-gray-900 rounded-lg p-3 border border-gray-300 focus:outline-none focus:border-accent resize-none dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <input
            type="text"
            placeholder={t.chapterTitle}
            value={chapterTitle}
            onChange={e => setChapterTitle(e.target.value)}
            className="w-full text-lg font-medium bg-transparent border-none outline-none text-tx placeholder:text-tx-muted"
          />

          <Suspense fallback={
            <div className="min-h-[400px] bg-bg-input rounded-xl animate-pulse flex items-center justify-center">
              <span className="text-sm text-tx-muted">Loading editor...</span>
            </div>
          }>
            <RichEditor
              value={content}
              onChange={setContent}
              placeholder={t.startWriting}
              minHeight={400}
              showWordCount={true}
              mode="full"
            />
          </Suspense>
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
        </div>
      </div>
    </div>
  );
}
