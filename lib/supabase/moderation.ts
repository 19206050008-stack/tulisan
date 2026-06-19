import { supabase } from './client';

// Content Moderation
const MODERATION_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const PERSPECTIVE_API_KEY = process.env.NEXT_PUBLIC_PERSPECTIVE_API_KEY;

export interface ModerationResult {
  toxicity: number;
  severe_toxicity: number;
  obscene: number;
  identity_attack: number;
  insult: number;
  threat: number;
  is_safe: boolean;
  confidence_score: number;
  flagged_categories: string[];
}

export async function moderateText(text: string, language: string = 'id'): Promise<ModerationResult> {
  if (!PERSPECTIVE_API_KEY) {
    // Fallback: basic keyword filtering when no API key
    return {
      toxicity: 0,
      severe_toxicity: 0,
      obscene: 0,
      identity_attack: 0,
      insult: 0,
      threat: 0,
      is_safe: true,
      confidence_score: 1.0,
      flagged_categories: [],
    };
  }

  try {
    const response = await fetch(`${MODERATION_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: { text, language },
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          OBSCENE: {},
          IDENTITY_ATTACK: {},
          INSULT: {},
          THREAT: {},
        },
      }),
    });

    const data = await response.json();
    
    if (!data.attributeScores) {
      return {
        toxicity: 0,
        severe_toxicity: 0,
        obscene: 0,
        identity_attack: 0,
        insult: 0,
        threat: 0,
        is_safe: true,
        confidence_score: 1.0,
        flagged_categories: [],
      };
    }

    const scores = data.attributeScores;
    const toxicity = scores.TOXICITY.summaryScore.value || 0;
    const severeToxicity = scores.SEVERE_TOXICITY.summaryScore.value || 0;
    const obscene = scores.OBSCENE.summaryScore.value || 0;
    const identityAttack = scores.IDENTITY_ATTACK.summaryScore.value || 0;
    const insult = scores.INSULT.summaryScore.value || 0;
    const threat = scores.THREAT.summaryScore.value || 0;

    // Calculate overall safety score (lower is worse)
    const avgScore = (toxicity + severeToxicity + obscene + identityAttack + insult + threat) / 6;
    const isSafe = avgScore < 0.5; // Threshold for safe content
    
    const flaggedCategories = [];
    if (toxicity > 0.7) flaggedCategories.push('toxic');
    if (severeToxicity > 0.5) flaggedCategories.push('severe-toxic');
    if (obscene > 0.6) flaggedCategories.push('obscene');
    if (identityAttack > 0.5) flaggedCategories.push('identity-attack');
    if (insult > 0.6) flaggedCategories.push('insult');
    if (threat > 0.5) flaggedCategories.push('threat');

    return {
      toxicity,
      severe_toxicity: severeToxicity,
      obscene,
      identity_attack: identityAttack,
      insult,
      threat,
      is_safe: isSafe,
      confidence_score: 1 - avgScore,
      flagged_categories: flaggedCategories,
    };
  } catch (error) {
    console.error('Moderation API error:', error);
    // Return safe on error to avoid blocking legitimate content
    return {
      toxicity: 0,
      severe_toxicity: 0,
      obscene: 0,
      identity_attack: 0,
      insult: 0,
      threat: 0,
      is_safe: true,
      confidence_score: 1.0,
      flagged_categories: [],
    };
  }
}

export async function getModerationStats() {
  if (!supabase) return { total: 0, flagged: 0, pendingReview: 0, approvedToday: 0 };
  
  const [total, flagged, pending, approved] = await Promise.all([
    supabase.from('stories').select('*', { count: 'exact', head: true }),
    supabase.from('stories').select('*', { count: 'exact' }).in('moderation_status', ['flagged', 'rejected']),
    supabase.from('stories').select('*', { count: 'exact' }).eq('moderation_status', 'pending'),
    supabase.from('stories')
      .select('*', { count: 'exact' })
      .eq('moderation_status', 'approved')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    total: total.count || 0,
    flagged: flagged.count || 0,
    pendingReview: pending.count || 0,
    approvedToday: approved.count || 0,
  };
}

export async function updateStoryModeration(storyId: string, status: string, flags?: string[], score?: number) {
  if (!supabase) throw new Error('Supabase not configured');
  const updates: any = {
    moderation_status: status,
    last_moderated_at: new Date().toISOString(),
  };
  
  if (flags && flags.length > 0) {
    updates.moderation_flags = flags;
  }
  if (score !== undefined) {
    updates.moderation_score = score;
  }
  
  await supabase.from('stories').update(updates).eq('id', storyId);
}
