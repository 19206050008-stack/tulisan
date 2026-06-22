/**
 * Preprocess text untuk TTS
 * - Skip special characters (*, #, etc.)
 * - Normalize chapter titles
 * - Split into sentences
 */

/**
 * Filter out text that should be skipped in TTS (special chars only)
 */
export function shouldSkipSegment(text: string): boolean {
  const trimmed = text.trim();
  
  // Check if it's ONLY special characters without meaningful words
  const hasWords = /[a-züöäßäéèêëàáâäïîìíõóòôùúûüçñ0-9]+/i.test(trimmed);
  const onlySpecial = !hasWords && /[^a-zA-Z\u00C0-\u00FF\s]/.test(trimmed);
  
  return onlySpecial;
}

/**
 * Detect if text is a chapter title (e.g., "Bab 1", "Chapter 1")
 */
export function isChapterTitle(text: string): boolean {
  return /\b(bab|chapter)\s+\d+/i.test(text);
}

/**
 * Format chapter title for natural TTS reading
 * "Bab 1" -> "bab satu"
 */
export function formatChapterTitleForTTS(title: string): string {
  if (!isChapterTitle(title)) return title;
  
  // Convert number digits to Indonesian words in chapter context
  return title.replace(/\b(\d+)\b/g, (match) => {
    const num = parseInt(match, 10);
    const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
    const teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
    const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];
    
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const tensDigit = Math.floor(num / 10);
      const onesDigit = num % 10;
      return tens[tensDigit] + (onesDigit > 0 ? ' ' + ones[onesDigit] : '');
    }
    return match; // Keep as digit for large numbers
  });
}

/**
 * Clean text for TTS by removing special formatting markers
 */
export function cleanTextForTTS(text: string): string {
  // Remove markdown-style formatting that shouldn't be spoken
  let cleaned = text;
  
  // Remove triple asterisks, hashes, etc.
  cleaned = cleaned.replace(/(\*{3,}|#{3,})/g, ' ');
  // Replace multiple spaces/newlines with single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Remove URLs but keep them readable (read as "link" or full URL)
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, ' situs web ');
  // Remove email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, ' alamat email ');
  
  return cleaned;
}

/**
 * Preprocess text untuk TTS
 * 1. Skip invalid segments
 * 2. Normalize chapter titles
 * 3. Clean special chars
 * 4. Split into sentences
 */
export function preprocessTextForTTS(text: string): string[] {
  let processed = text;
  
  // Step 1: Clean text first
  processed = cleanTextForTTS(processed);
  
  // Step 2: Normalize abbreviations
  processed = normalizeAbbreviations(processed);
  
  // Step 3: Normalize numbers
  processed = normalizeNumbers(processed);
  
  // Step 4: Split into sentences
  const sentences = processed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [processed];
  
  // Step 5: Filter out segments that should be skipped
  const filtered = sentences
    .map(s => s.trim())
    .filter(s => {
      // Skip if only special chars
      if (shouldSkipSegment(s)) return false;
      // Skip empty strings
      if (s.length === 0) return false;
      return true;
    })
    .filter(s => s.length > 2);
  
  return filtered;
}

