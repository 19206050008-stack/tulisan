export const GENRE_GRADIENTS: Record<string, string> = {
  'Romansa': 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
  'Romance': 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
  'Horor': 'linear-gradient(135deg, #2d1b69 0%, #11001c 100%)',
  'Horror': 'linear-gradient(135deg, #2d1b69 0%, #11001c 100%)',
  'Misteri': 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)',
  'Mystery': 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)',
  'Fiksi Ilmiah': 'linear-gradient(135deg, #0099f7 0%, #005999 100%)',
  'Sci-Fi': 'linear-gradient(135deg, #0099f7 0%, #005999 100%)',
  'Fantasi': 'linear-gradient(135deg, #7f53ac 0%, #647dee 100%)',
  'Fantasy': 'linear-gradient(135deg, #7f53ac 0%, #647dee 100%)',
  'Drama': 'linear-gradient(135deg, #e96443 0%, #904e95 100%)',
  'Komedi': 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'Humor': 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'Comedy': 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'Aksi': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'Adventure': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'Thriller': 'linear-gradient(135deg, #c31432 0%, #240b36 100%)',
  'Slice of Life': 'linear-gradient(135deg, #76b852 0%, #8dc26f 100%)',
  'Sejarah': 'linear-gradient(135deg, #8e7c54 0%, #5c4a1e 100%)',
  'Historical': 'linear-gradient(135deg, #8e7c54 0%, #5c4a1e 100%)',
  'Religi': 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
  'Inspirational': 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
  'Teenlit': 'linear-gradient(135deg, #f794a4 0%, #fdd6bd 100%)',
  'Teen Fiction': 'linear-gradient(135deg, #f794a4 0%, #fdd6bd 100%)',
  'Chicklit': 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
  'Fan Fiction': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'Fanfiction': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'Werewolf': 'linear-gradient(135deg, #434343 0%, #000000 100%)',
  'Non-Fiksi': 'linear-gradient(135deg, #3a7bd5 0%, #3a6073 100%)',
  'Puisi': 'linear-gradient(135deg, #e8cbc0 0%, #636fa4 100%)',
};

export const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
];

export function getGenreGradient(category?: string | null): string {
  if (category && GENRE_GRADIENTS[category]) {
    return GENRE_GRADIENTS[category];
  }
  const hash = (category || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

export function getGenreColors(category?: string | null): { primary: string; secondary: string } {
  const colorMap: Record<string, { primary: string; secondary: string }> = {
    'Romansa': { primary: '#ff6b9d', secondary: '#c44569' },
    'Romance': { primary: '#ff6b9d', secondary: '#c44569' },
    'Fantasi': { primary: '#7f53ac', secondary: '#647dee' },
    'Fantasy': { primary: '#7f53ac', secondary: '#647dee' },
    'Fiksi Ilmiah': { primary: '#0099f7', secondary: '#005999' },
    'Sci-Fi': { primary: '#0099f7', secondary: '#005999' },
    'Misteri': { primary: '#4a5568', secondary: '#1a202c' },
    'Mystery': { primary: '#4a5568', secondary: '#1a202c' },
    'Horor': { primary: '#2d1b69', secondary: '#11001c' },
    'Horror': { primary: '#2d1b69', secondary: '#11001c' },
    'Aksi': { primary: '#11998e', secondary: '#38ef7d' },
    'Adventure': { primary: '#11998e', secondary: '#38ef7d' },
    'Drama': { primary: '#e96443', secondary: '#904e95' },
    'Komedi': { primary: '#f7971e', secondary: '#ffd200' },
    'Humor': { primary: '#f7971e', secondary: '#ffd200' },
    'Comedy': { primary: '#f7971e', secondary: '#ffd200' },
    'Sejarah': { primary: '#8e7c54', secondary: '#5c4a1e' },
    'Historical': { primary: '#8e7c54', secondary: '#5c4a1e' },
    'Religi': { primary: '#ffc107', secondary: '#ff9800' },
    'Inspirational': { primary: '#ffc107', secondary: '#ff9800' },
    'Thriller': { primary: '#c31432', secondary: '#240b36' },
    'Teenlit': { primary: '#f794a4', secondary: '#fdd6bd' },
    'Teen Fiction': { primary: '#f794a4', secondary: '#fdd6bd' },
    'Chicklit': { primary: '#ee9ca7', secondary: '#ffdde1' },
    'Fan Fiction': { primary: '#a18cd1', secondary: '#fbc2eb' },
    'Fanfiction': { primary: '#a18cd1', secondary: '#fbc2eb' },
    'Werewolf': { primary: '#434343', secondary: '#000000' },
    'Non-Fiksi': { primary: '#3a7bd5', secondary: '#3a6073' },
    'Puisi': { primary: '#e8cbc0', secondary: '#636fa4' },
    'Slice of Life': { primary: '#76b852', secondary: '#8dc26f' },
  };
  if (category && colorMap[category]) return colorMap[category];
  return { primary: '#667eea', secondary: '#764ba2' };
}
