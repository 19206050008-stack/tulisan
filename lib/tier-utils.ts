/**
 * Helper functions untuk Tier Tagging System
 * Menghitung jumlah kata dan menentukan tier cerita
 * 
 * Klasifikasi berdasarkan standar sastra Indonesia:
 * - Pendek: Cerpen & Flash Fiction (< 7,500 kata)
 * - Sedang: Novelet & Novela (7,500 - 40,000 kata)
 * - Panjang: Novel (> 40,000 kata)
 */

/**
 * Count words from HTML content or plain text
 */
export function countWords(content: string): number {
  if (!content) return 0;
  
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, ' ');
  
  // Remove extra whitespace and count words
  const words = text
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0);
  
  return words.length;
}

/**
 * Determine tier based on total word count across all chapters
 * 
 * Tier Categories (standar sastra Indonesia):
 * - Pendek (Short): < 7,500 kata — Cerpen & Fiksi Kilat
 * - Sedang (Medium): 7,500 - 40,000 kata — Novelet & Novela
 * - Panjang (Long): > 40,000 kata — Novel
 */
export function determineTier(totalWords: number): 'Cerita Pendek' | 'Cerita Sedang' | 'Cerita Panjang' | 'Novel' | null {
  if (totalWords <= 0) return null;
  if (totalWords < 7500) {
    return 'Cerita Pendek';
  } else if (totalWords <= 40000) {
    return 'Cerita Sedang';
  } else if (totalWords <= 100000) {
    return 'Cerita Panjang';
  } else {
    return 'Novel';
  }
}

/**
 * Determine story type based on word count (more granular)
 */
export function determineStoryType(totalWords: number): string {
  if (totalWords <= 0) return '';
  if (totalWords < 1000) return 'Fiksi Kilat';
  if (totalWords < 7500) return 'Cerpen';
  if (totalWords < 17500) return 'Novelet';
  if (totalWords < 40000) return 'Novela';
  return 'Novel';
}

/**
 * Calculate tier for a story based on its chapters
 */
export function calculateStoryTier(chapters: { content: string }[]): {
  tier: 'Cerita Pendek' | 'Cerita Sedang' | 'Cerita Panjang' | 'Novel' | null;
  storyType: string;
  totalWords: number;
  chaptersWordCount: number[];
} {
  const chaptersWordCount = chapters.map(ch => countWords(ch.content || ''));
  const totalWords = chaptersWordCount.reduce((sum, count) => sum + count, 0);
  const tier = determineTier(totalWords);
  const storyType = determineStoryType(totalWords);
  
  return {
    tier,
    storyType,
    totalWords,
    chaptersWordCount
  };
}

/**
 * Format tier display name
 */
export function formatTier(tier: string | null): string {
  if (!tier) return '';
  return tier;
}

/**
 * Map old/new tier tag values to proper display name
 */
export function getTierDisplayName(tier: string | null): string {
  switch (tier) {
    case 'Pendek': return 'Cerita Pendek';
    case 'Sedang': return 'Cerita Sedang';
    case 'Panjang': return 'Cerita Panjang';
    case 'Cerita Pendek': case 'Cerita Sedang': case 'Cerita Panjang': case 'Novel': return tier;
    default: return tier || '';
  }
}

/**
 * Get tier badge color
 */
export function getTierBadgeColor(tier: string | null): string {
  switch (tier) {
    case 'Cerita Pendek':
    case 'Pendek':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'Cerita Sedang':
    case 'Sedang':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Cerita Panjang':
    case 'Panjang':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'Novel':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

/**
 * Get tier description
 */
export function getTierDescription(tier: string | null, lang: 'id' | 'en' = 'id'): string {
  if (lang === 'en') {
    switch (tier) {
      case 'Cerita Pendek': case 'Pendek': return 'Short (< 7,500 words) — Short Story & Flash Fiction';
      case 'Cerita Sedang': case 'Sedang': return 'Medium (7,500 - 40,000 words) — Novelette & Novella';
      case 'Cerita Panjang': case 'Panjang': return 'Long (40,000 - 100,000 words) — Long Fiction';
      case 'Novel': return 'Novel (> 100,000 words)';
      default: return '';
    }
  }
  switch (tier) {
    case 'Cerita Pendek': case 'Pendek': return 'Pendek (< 7.500 kata) — Cerpen & Fiksi Kilat';
    case 'Cerita Sedang': case 'Sedang': return 'Sedang (7.500 - 40.000 kata) — Novelet & Novela';
    case 'Cerita Panjang': case 'Panjang': return 'Panjang (40.000 - 100.000 kata) — Cerita Panjang';
    case 'Novel': return 'Novel (> 100.000 kata)';
    default: return '';
  }
}

/**
 * Calculate reading time (assuming 200 words per minute for Indonesian)
 */
export function calculateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Format reading time to human-readable string
 */
export function formatReadingTime(minutes: number, lang: 'id' | 'en' = 'id'): string {
  if (minutes < 60) return `${minutes} ${lang === 'en' ? 'min read' : 'menit baca'}`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} ${lang === 'en' ? 'hour read' : 'jam baca'}`;
  return `${hours} ${lang === 'en' ? 'h' : 'j'} ${mins} ${lang === 'en' ? 'min read' : 'menit baca'}`;
}
