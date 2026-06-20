import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const CATEGORIES = [
  { name: 'Romansa', slug: 'romansa', description: 'Cerita yang berfokus pada hubungan percintaan antar tokoh utama', sort_order: 1 },
  { name: 'Fantasi', slug: 'fantasi', description: 'Cerita dengan unsur magis, dunia alternatif, atau makhluk supernatural', sort_order: 2 },
  { name: 'Horor', slug: 'horor', description: 'Cerita yang bertujuan menimbulkan rasa takut, tegang, dan ngeri', sort_order: 3 },
  { name: 'Misteri', slug: 'misteri', description: 'Cerita yang melibatkan teka-teki atau kejadian misterius yang harus dipecahkan', sort_order: 4 },
  { name: 'Fiksi Ilmiah', slug: 'fiksi-ilmiah', description: 'Cerita yang mengeksplorasi konsep ilmiah, teknologi masa depan, atau spekulasi ilmiah', sort_order: 5 },
  { name: 'Aksi', slug: 'aksi', description: 'Cerita dengan adegan pertarungan, petualangan berbahaya, dan ketegangan fisik', sort_order: 6 },
  { name: 'Drama', slug: 'drama', description: 'Cerita yang mengangkat konflik emosional dan hubungan antar manusia secara realistis', sort_order: 7 },
  { name: 'Komedi', slug: 'komedi', description: 'Cerita yang bertujuan menghibur dengan humor dan situasi lucu', sort_order: 8 },
  { name: 'Thriller', slug: 'thriller', description: 'Cerita dengan ketegangan tinggi dan plot twist yang memacu adrenalin', sort_order: 9 },
  { name: 'Sejarah', slug: 'sejarah', description: 'Cerita berlatar belakang peristiwa atau era sejarah tertentu', sort_order: 10 },
  { name: 'Teenlit', slug: 'teenlit', description: 'Cerita untuk pembaca remaja dengan tema kehidupan sekolah dan pencarian jati diri', sort_order: 11 },
  { name: 'Chicklit', slug: 'chicklit', description: 'Cerita ringan tentang kehidupan wanita modern, karier, dan percintaan', sort_order: 12 },
  { name: 'Religi', slug: 'religi', description: 'Cerita yang mengangkat nilai-nilai keagamaan dan spiritualitas', sort_order: 13 },
  { name: 'Fan Fiction', slug: 'fan-fiction', description: 'Cerita yang ditulis berdasarkan karakter atau dunia dari karya yang sudah ada', sort_order: 14 },
  { name: 'Werewolf', slug: 'werewolf', description: 'Cerita bertema manusia serigala, mate bond, dan dunia supernatural', sort_order: 15 },
  { name: 'Non-Fiksi', slug: 'non-fiksi', description: 'Karya tulis berdasarkan fakta, pengalaman nyata, atau pengetahuan', sort_order: 16 },
  { name: 'Puisi', slug: 'puisi', description: 'Karya sastra yang mengutamakan keindahan bahasa, irama, dan makna mendalam', sort_order: 17 },
  { name: 'Slice of Life', slug: 'slice-of-life', description: 'Cerita tentang kehidupan sehari-hari tanpa konflik besar, fokus pada momen kecil', sort_order: 18 },
  { name: 'Novel', slug: 'novel', description: 'Karya fiksi prosa panjang dengan alur kompleks, penokohan mendalam, dan banyak bab', sort_order: 19 },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'seed-categories-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const results: { added: string[]; skipped: string[]; errors: string[] } = {
    added: [],
    skipped: [],
    errors: [],
  };

  for (const cat of CATEGORIES) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', cat.slug)
      .maybeSingle();

    if (existing) {
      await supabase.from('categories').update({ description: cat.description, sort_order: cat.sort_order }).eq('id', existing.id);
      results.skipped.push(`${cat.name} (updated description & order)`);
      continue;
    }

    const { error } = await supabase
      .from('categories')
      .insert({ ...cat, active: true });

    if (error) {
      results.errors.push(`${cat.name}: ${error.message}`);
    } else {
      results.added.push(cat.name);
    }
  }

  return NextResponse.json({
    message: 'Categories seeded',
    total: CATEGORIES.length,
    ...results,
  });
}
