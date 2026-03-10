import { supabase } from '@/integrations/supabase/client';

export type InsightContext =
  | 'home_summary'
  | 'exercise_analysis'
  | 'routine_review'
  | 'session_feedback'
  | 'fatigue_advice'
  | 'measurement_insight'
  | 'program_review'
  | 'calendar_patterns'
  | 'monthly_report_narrative'
  | 'profile_recommendations'
  | 'new_session_suggestion';

export interface AIPreferences {
  ai_enabled: boolean;
  ai_tone: 'technical' | 'casual';
  ai_mood: 'motivator' | 'focused';
  ai_features: Record<string, boolean>;
  font_size: 'normal' | 'large';
  theme: string;
}

export const DEFAULT_AI_PREFERENCES: AIPreferences = {
  ai_enabled: true,
  ai_tone: 'technical',
  ai_mood: 'focused',
  ai_features: {
    home_summary: true,
    exercise_analysis: true,
    routine_review: true,
    session_feedback: true,
    fatigue_advice: true,
    measurement_insight: true,
    program_review: true,
    calendar_patterns: true,
    monthly_report_narrative: true,
    profile_recommendations: true,
    new_session_suggestion: true,
  },
  font_size: 'normal',
  theme: 'dark-orange',
};

export function getAIPreferences(profilePreferences: any): AIPreferences {
  if (!profilePreferences) return { ...DEFAULT_AI_PREFERENCES };
  return {
    ai_enabled: profilePreferences.ai_enabled ?? DEFAULT_AI_PREFERENCES.ai_enabled,
    ai_tone: profilePreferences.ai_tone ?? DEFAULT_AI_PREFERENCES.ai_tone,
    ai_mood: profilePreferences.ai_mood ?? DEFAULT_AI_PREFERENCES.ai_mood,
    ai_features: { ...DEFAULT_AI_PREFERENCES.ai_features, ...(profilePreferences.ai_features ?? {}) },
    font_size: profilePreferences.font_size ?? DEFAULT_AI_PREFERENCES.font_size,
    theme: profilePreferences.theme ?? DEFAULT_AI_PREFERENCES.theme,
  };
}

export async function fetchInsight(context: InsightContext, data: Record<string, unknown>, tone?: string, mood?: string): Promise<string> {
  const { data: result, error } = await supabase.functions.invoke('ai-insights', {
    body: { context, data, tone, mood },
  });

  if (error) {
    console.error('AI insight error:', error);
    throw new Error('Error al obtener análisis de IA');
  }

  if (result?.error) {
    throw new Error(result.error);
  }

  return result?.insight ?? '';
}
