'use client';

const GRADIENT_MAP: Record<string, string> = {
  'Romance': 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)',
  'Horror': 'linear-gradient(135deg, #2d1b69 0%, #11001c 100%)',
  'Mystery': 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)',
  'Sci-Fi': 'linear-gradient(135deg, #0099f7 0%, #005999 100%)',
  'Fantasy': 'linear-gradient(135deg, #7f53ac 0%, #647dee 100%)',
  'Drama': 'linear-gradient(135deg, #e96443 0%, #904e95 100%)',
  'Humor': 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'Adventure': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'Thriller': 'linear-gradient(135deg, #c31432 0%, #240b36 100%)',
  'Slice of Life': 'linear-gradient(135deg, #76b852 0%, #8dc26f 100%)',
  'Historical': 'linear-gradient(135deg, #8e7c54 0%, #5c4a1e 100%)',
  'Inspirational': 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
};

interface StoryCoverProps {
  coverUrl?: string | null;
  category?: string;
  title: string;
  className?: string;
}

export function StoryCover({ coverUrl, category, title, className = '' }: StoryCoverProps) {
  if (coverUrl && !coverUrl.startsWith('gradient:')) {
    // If it's a Supabase storage URL, we can append transform parameters 
    // to reduce file size and bandwidth
    const isSupabase = coverUrl.includes('.supabase.co/storage/v1/object/public/');
    const optimizedUrl = isSupabase && !coverUrl.includes('?') 
      ? `${coverUrl}?width=400&quality=80` 
      : coverUrl;
      
    return <img src={optimizedUrl} alt={title} className={`w-full h-full object-cover ${className}`} loading="lazy" />;
  }

  const genre = coverUrl?.replace('gradient:', '') || category || '';
  const gradient = GRADIENT_MAP[genre] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  return (
    <div className={`w-full h-full flex items-end p-3 ${className}`} style={{ background: gradient }}>
      <span className="text-white/80 text-[10px] font-medium uppercase tracking-wider">{genre}</span>
    </div>
  );
}
