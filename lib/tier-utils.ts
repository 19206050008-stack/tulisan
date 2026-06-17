/**
 * Helper functions untuk Tier Tagging System
 * Menghitung jumlah kata dan menentukan tier cerita
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
 * Tier Categories:
 * - Pendek (Short): 0-700 words
 * - Sedang (Medium): 700-1,000 words
 * - Panjang (Long): 1,000-5,000 words
 * - null: > 5,000 words (very long)
 */
export function determineTier(totalWords: number): 'Pendek' | 'Sedang' | 'Panjang' | null {
  if (totalWords > 0 && totalWords <= 700) {
    return 'Pendek';
  } else if (totalWords > 700 && totalWords <= 1000) {
    return 'Sedang';
  } else if (totalWords > 1000 && totalWords <= 5000) {
    return 'Panjang';
  }
  return null;
}

/**
 * Calculate tier for a story based on its chapters
 */
export function calculateStoryTier(chapters: { content: string }[]): {
  tier: 'Pendek' | 'Sedang' | 'Panjang' | null;
  totalWords: number;
  chaptersWordCount: number[];
} {
  const chaptersWordCount = chapters.map(ch => countWords(ch.content || ''));
  const totalWords = chaptersWordCount.reduce((sum, count) => sum + count, 0);
  const tier = determineTier(totalWords);
  
  return {
    tier,
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
 * Get tier badge color
 */
export function getTierBadgeColor(tier: string | null): string {
  switch (tier) {
    case 'Pendek':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'Sedang':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'Panjang':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

/**
 * Get tier description
 */
export function getTierDescription(tier: string | null): string {
  switch (tier) {
    case 'Pendek':
      return '0-700 kata';
    case 'Sedang':
      return '700-1,000 kata';
    case 'Panjang':
      return '1,000-5,000 kata';
    default:
      return '';
  }
}

/**
 * Calculate reading time (assuming 200 words per minute)
 */
export function calculateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}
