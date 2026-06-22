import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// Bulk-approve audio for ALL existing published stories.
// One-time use: visit /api/approve-all-audio?secret=approve-audio-2026
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'approve-audio-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Get all published stories
  const { data: stories, error: storyErr } = await supabase
    .from('stories')
    .select('id')
    .eq('status', 'published');

  if (storyErr) {
    return NextResponse.json({ error: storyErr.message }, { status: 500 });
  }

  if (!stories || stories.length === 0) {
    return NextResponse.json({ message: 'No published stories found', approved: 0 });
  }

  // Insert audio_contents records (whole-story audio, status ready)
  const rows = stories.map((s: any) => ({
    story_id: s.id,
    chapter_id: null,
    status: 'ready',
    voice_style: 'narrative',
  }));

  const { error: insertErr } = await supabase
    .from('audio_contents')
    .upsert(rows, { onConflict: 'story_id,chapter_id' });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Flag stories as having audio
  await supabase
    .from('stories')
    .update({ has_audio: true })
    .eq('status', 'published');

  return NextResponse.json({
    message: 'All published stories approved for audio',
    approved: stories.length,
  });
}
