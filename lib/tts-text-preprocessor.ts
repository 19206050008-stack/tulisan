/**
 * Preprocess text untuk TTS
 * - Skip special characters (*, #, etc.)
 * - Normalize chapter titles
 * - Split into sentences
 */

// Number to Indonesian words
const ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
const TEENS = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
const TENS = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];

function convH(n: number): string {
  if (n === 0) return '';
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) { const t = Math.floor(n / 10), o = n % 10; return TENS[t] + (o ? ' ' + ONES[o] : ''); }
  if (n < 200) return 'seratus' + (n > 100 ? ' ' + convH(n - 100) : '');
  const h = Math.floor(n / 100), r = n % 100;
  return ONES[h] + ' ratus' + (r ? ' ' + convH(r) : '');
}

function convT(n: number): string {
  if (n < 1000) return convH(n);
  if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + convT(n - 1000) : '');
  const t = Math.floor(n / 1000), r = n % 1000;
  return convH(t) + ' ribu' + (r ? ' ' + convT(r) : '');
}

export function numberToWords(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(n)) return String(num);
  if (n === 0) return 'nol';
  if (n < 1000000) return convT(n);
  const m = Math.floor(n / 1000000), r = n % 1000000;
  return convH(m) + ' juta' + (r ? ' ' + convT(r) : '');
}

const ABBREVIATIONS: Record<string, string> = {
  dll: 'dan lain-lain', dsb: 'dan sebagainya', dst: 'dan seterusnya',
  yth: 'yang terhormat', sdr: 'saudara', no: 'nomor', thn: 'tahun',
  bln: 'bulan', dgn: 'dengan', utk: 'untuk', pd: 'pada', dlm: 'dalam',
  krn: 'karena', sbg: 'sebagai', tsb: 'tersebut', yg: 'yang',
};

export function normalizeAbbreviations(text: string): string {
  let r = text;
  for (const [a, f] of Object.entries(ABBREVIATIONS)) {
    r = r.replace(new RegExp(`\\b${a}\\.?\\b`, 'gi'), f);
  }
  return r;
}

export function normalizeNumbers(text: string): string {
  return text.replace(/\b(\d{1,7})\b/g, (m) => {
    const n = parseInt(m, 10);
    if (n > 9999999) return m;
    if (m.length === 4 && (m.startsWith('19') || m.startsWith('20'))) return m; // years
    return numberToWords(n);
  });
}

export function getIntonationForSentence(sentence: string): { pitch: number; rate: number } {
  const t = sentence.trim();
  if (t.endsWith('?')) return { pitch: 1.15, rate: 1.0 };
  if (t.endsWith('!')) return { pitch: 1.1, rate: 1.05 };
  if (t.endsWith('...') || t.endsWith('…')) return { pitch: 0.95, rate: 0.9 };
  if ((t.match(/,/g) || []).length > 3) return { pitch: 1.0, rate: 0.95 };
  return { pitch: 1.0, rate: 1.0 };
}

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

