'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useStore } from '@/lib/store';
import { createStory, uploadCover, moderateText, getCategories } from '@/lib/supabase';
import { Save, Send, ArrowLeft, ChevronRight, X, Plus } from 'lucide-react';
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
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [tags, setTags] = useState('');
  const [rating, setRating] = useState('semua_umur');
  const [storyStatus, setStoryStatus] = useState('berlangsung');
  const [characters, setCharacters] = useState<{ name: string; role: string }[]>([]);
  const [content, setContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('Bab 1');
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
      alert('Judul cerita wajib diisi');
      return;
    }

    if (publish) {
      if (!category) { alert('Pilih kategori/genre untuk menerbitkan'); return; }
      if (!synopsis.trim()) { alert('Sinopsis wajib diisi untuk menerbitkan'); return; }
    }
    
    const finalSynopsis = synopsis.trim() || (() => {
      const plainText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return plainText.slice(0, 200) + (plainText.length > 200 ? '...' : '');
    })();

    const combinedContent = `${title}\n${finalSynopsis}\n${content}`;
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
        tagsArray = tagsArray.filter(t => !['Cerita Pendek', 'Cerita Sedang', 'Cerita Panjang', 'Novel', 'Pendek', 'Sedang', 'Panjang'].includes(t));
        // Add new tier
        tagsArray.push(finalTier);
      }
      
      // Create story first
      const story = await createStory(user!.id, title, finalSynopsis, category, tagsArray);
      console.log('Story created:', story.id);

      // Save additional metadata
      await updateStory(story.id, {
        rating,
        story_status: storyStatus,
        characters: characters.filter(c => c.name.trim()),
      });

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

  const handleNextStep = () => {
    if (!title.trim()) { alert('Judul cerita wajib diisi'); return; }
    if (!category) { alert('Pilih genre cerita'); return; }
    if (!synopsis.trim() || synopsis.trim().length < 30) { alert('Sinopsis minimal 30 karakter'); return; }
    setStep(2);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => step === 2 ? setStep(1) : router.push('/my-stories')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" /> {step === 2 ? 'Kembali ke Detail' : translations[lang].myStories.title}
        </button>
        {step === 2 && (
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
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${step === 1 ? 'bg-accent text-white' : 'bg-bg-soft text-tx-muted'}`}>
          1. Detail Cerita
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${step === 2 ? 'bg-accent text-white' : 'bg-bg-soft text-tx-muted'}`}>
          2. Mulai Menulis
        </div>
      </div>

      {/* STEP 1: Form Detail Cerita */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul Cerita *</label>
              <input
                type="text"
                placeholder="Masukkan judul cerita..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 text-base rounded-xl bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sinopsis *</label>
              <textarea
                placeholder="Ceritakan secara singkat tentang ceritamu... (min 30 karakter)"
                value={synopsis}
                onChange={e => setSynopsis(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 text-sm rounded-xl bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-accent resize-none dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400"
              />
              <div className="text-[10px] text-right text-tx-muted">{synopsis.length}/500</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Genre *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300"
                >
                  <option value="">Pilih Genre</option>
                  {categoryOptions.map(cat => (
                    <option key={cat.id || cat.slug} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <select
                  value={rating}
                  onChange={e => setRating(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300"
                >
                  <option value="semua_umur">Semua Umur</option>
                  <option value="13+">Remaja (13+)</option>
                  <option value="17+">Dewasa Muda (17+)</option>
                  <option value="dewasa">Dewasa (18+)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={storyStatus}
                  onChange={e => setStoryStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300"
                >
                  <option value="berlangsung">Berlangsung</option>
                  <option value="tamat">Tamat</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipe</label>
                <select
                  value={selectedTier}
                  onChange={e => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-white text-gray-700 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300"
                >
                  <option value="">Auto</option>
                  <option value="Cerita Pendek">Cerita Pendek</option>
                  <option value="Cerita Sedang">Cerita Sedang</option>
                  <option value="Cerita Panjang">Cerita Panjang</option>
                  <option value="Novel">Novel</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <input
                type="text"
                placeholder="Pisah dengan koma: cinta, sekolah, petualangan"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Karakter Utama</label>
              {characters.map((ch, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nama karakter"
                    value={ch.name}
                    onChange={e => setCharacters(prev => prev.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-white text-gray-900 border border-gray-300 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 placeholder:text-gray-400"
                  />
                  <select
                    value={ch.role}
                    onChange={e => setCharacters(prev => prev.map((c, idx) => idx === i ? { ...c, role: e.target.value } : c))}
                    className="px-2 py-2 text-xs rounded-lg bg-white text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 [&>option]:bg-white [&>option]:text-gray-700 dark:[&>option]:bg-gray-800 dark:[&>option]:text-gray-300"
                  >
                    <option value="protagonis">Protagonis</option>
                    <option value="antagonis">Antagonis</option>
                    <option value="pendukung">Pendukung</option>
                  </select>
                  <button onClick={() => setCharacters(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-red-400 hover:text-red-600 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {characters.length < 5 && (
                <button
                  onClick={() => setCharacters([...characters, { name: '', role: 'protagonis' }])}
                  className="flex items-center gap-1.5 text-xs text-accent hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Karakter
                </button>
              )}
              <p className="text-[10px] text-tx-muted">Opsional. Maks 5 karakter.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cover Cerita</label>
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <CoverUpload preview={coverPreview} onFileReady={handleCoverReady} title={title} category={category} description={synopsis} tags={tags.split(',').map(t => t.trim()).filter(Boolean)} />
              </div>
            </div>

            <button
              onClick={handleNextStep}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl bg-accent text-white hover:opacity-90 transition-opacity"
            >
              Lanjut Menulis <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Editor */}
      {step === 2 && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Judul Bab"
            value={chapterTitle}
            onChange={e => setChapterTitle(e.target.value)}
            className="w-full px-4 py-3 text-lg font-medium rounded-xl bg-white text-gray-900 border border-gray-200 focus:outline-none focus:border-accent dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 placeholder:text-gray-400"
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
              minHeight={500}
              showWordCount={true}
              mode="full"
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
