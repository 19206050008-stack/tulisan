/**
 * Text preprocessing untuk TTS yang lebih natural
 * - Normalisasi angka ke kata
 * - Normalisasi singkatan
 * - Intonation hints berdasarkan tanda baca
 */

// Konversi angka ke kata (Indonesian)
const ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
const TEENS = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
const TENS = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];

function convertHundreds(num: number): string {
  if (num === 0) return '';
  if (num < 10) return ONES[num];
  if (num < 20) return TEENS[num - 10];
  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return TENS[tens] + (ones > 0 ? ' ' + ONES[ones] : '');
  }
  if (num < 200) return 'seratus' + (num > 100 ? ' ' + convertHundreds(num - 100) : '');
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  return ONES[hundreds] + ' ratus' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
}

function convertThousands(num: number): string {
  if (num === 0) return '';
  if (num < 1000) return convertHundreds(num);
  if (num < 2000) return 'seribu' + (num > 1000 ? ' ' + convertThousands(num - 1000) : '');
  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;
  return convertHundreds(thousands) + ' ribu' + (remainder > 0 ? ' ' + convertThousands(remainder) : '');
}

function convertMillions(num: number): string {
  if (num === 0) return '';
  if (num < 1000000) return convertThousands(num);
  const millions = Math.floor(num / 1000000);
  const remainder = num % 1000000;
  return convertHundreds(millions) + ' juta' + (remainder > 0 ? ' ' + convertMillions(remainder) : '');
}

/**
 * Konversi angka ke kata (Indonesian)
 * Support hingga jutaan
 */
export function numberToWords(num: number | string): string {
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(n)) return String(num);
  if (n === 0) return 'nol';
  if (n < 0) return 'minus ' + convertMillions(Math.abs(n));
  return convertMillions(n);
}

// Singkatan umum Indonesian
const ABBREVIATIONS: Record<string, string> = {
  'dll': 'dan lain-lain',
  'dsb': 'dan sebagainya',
  'dst': 'dan seterusnya',
  'yth': 'yang terhormat',
  'sdr': 'saudara',
  'sdri': 'saudari',
  'bapak': 'bapak',
  'ibu': 'ibu',
  'jl': 'jalan',
  'jln': 'jalan',
  'no': 'nomor',
  'thn': 'tahun',
  'bln': 'bulan',
  'hr': 'hari',
  'jam': 'jam',
  'menit': 'menit',
  'dgn': 'dengan',
  'utk': 'untuk',
  'dari': 'dari',
  'ke': 'ke',
  'di': 'di',
  'pd': 'pada',
  'dlm': 'dalam',
  'krn': 'karena',
  'sbg': 'sebagai',
  'tsb': 'tersebut',
  'yg': 'yang',
};

/**
 * Normalisasi singkatan
 */
export function normalizeAbbreviations(text: string): string {
  let result = text;
  for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}\\.?\\b`, 'gi');
    result = result.replace(regex, full);
  }
  return result;
}

/**
 * Normalisasi angka ke kata
 * Hanya konversi angka yang berdiri sendiri (bukan bagian dari kata)
 */
export function normalizeNumbers(text: string): string {
  // Match standalone numbers (1-9999999)
  return text.replace(/\b(\d{1,7})\b/g, (match) => {
    const num = parseInt(match, 10);
    // Skip very large numbers (keep as-is)
    if (num > 9999999) return match;
    // Skip years (4 digits starting with 19 or 20)
    if (match.length === 4 && (match.startsWith('19') || match.startsWith('20'))) return match;
    return numberToWords(num);
  });
}

/**
 * Intonation hints berdasarkan tanda baca
 * Returns pitch adjustment (0.5-2.0) based on sentence type
 */
export function getIntonationForSentence(sentence: string): { pitch: number; rate: number } {
  const trimmed = sentence.trim();
  
  // Question - raise pitch slightly
  if (trimmed.endsWith('?')) {
    return { pitch: 1.15, rate: 1.0 };
  }
  
  // Exclamation - faster, slightly higher
  if (trimmed.endsWith('!')) {
    return { pitch: 1.1, rate: 1.05 };
  }
  
  // Ellipsis - slower, contemplative
  if (trimmed.endsWith('...') || trimmed.endsWith('…')) {
    return { pitch: 0.95, rate: 0.9 };
  }
  
  // Comma-heavy sentence - slightly slower for clarity
  if ((trimmed.match(/,/g) || []).length > 3) {
    return { pitch: 1.0, rate: 0.95 };
  }
  
  // Statement - neutral
  return { pitch: 1.0, rate: 1.0 };
}

/**
 * Preprocess text untuk TTS
 * 1. Normalisasi singkatan
 * 2. Normalisasi angka
 * 3. Split ke kalimat
 */
export function preprocessTextForTTS(text: string): string[] {
  let processed = text;
  
  // Step 1: Normalize abbreviations
  processed = normalizeAbbreviations(processed);
  
  // Step 2: Normalize numbers
  processed = normalizeNumbers(processed);
  
  // Step 3: Split into sentences (preserve punctuation)
  const sentences = processed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [processed];
  
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
