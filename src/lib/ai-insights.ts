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
  | 'new_session_suggestion'
  | 'warmup_suggestion'
  | 'set_coaching';

export interface AppFeaturePreferences {
  // Home
  home_weekly_activity: boolean;
  home_quick_stats: boolean;
  home_streak: boolean;
  home_today_routine: boolean;
  home_recent_sessions: boolean;
  home_quick_actions: boolean;
  // Analysis tabs
  analysis_exercise: boolean;
  analysis_muscle: boolean;
  analysis_volume: boolean;
  analysis_1rm: boolean;
  analysis_prs: boolean;
  analysis_body: boolean;
  analysis_relative: boolean;
  analysis_summary: boolean;
  // Fatigue
  fatigue_heatmap: boolean;
  fatigue_history: boolean;
  fatigue_critical: boolean;
  fatigue_overview: boolean;
  // Nav sections
  nav_coach: boolean;
  nav_fatigue: boolean;
  nav_measurements: boolean;
  nav_programs: boolean;
  nav_calendar: boolean;
  nav_report: boolean;
}

export const DEFAULT_APP_FEATURES: AppFeaturePreferences = {
  home_weekly_activity: true,
  home_quick_stats: true,
  home_streak: true,
  home_today_routine: true,
  home_recent_sessions: true,
  home_quick_actions: true,
  analysis_exercise: true,
  analysis_muscle: true,
  analysis_volume: true,
  analysis_1rm: true,
  analysis_prs: true,
  analysis_body: true,
  analysis_relative: true,
  analysis_summary: true,
  fatigue_heatmap: true,
  fatigue_history: true,
  fatigue_critical: true,
  fatigue_overview: true,
  nav_coach: true,
  nav_fatigue: true,
  nav_measurements: true,
  nav_programs: true,
  nav_calendar: true,
  nav_report: true,
};

export function getAppFeatures(profilePreferences: any): AppFeaturePreferences {
  if (!profilePreferences?.app_features) return { ...DEFAULT_APP_FEATURES };
  return { ...DEFAULT_APP_FEATURES, ...profilePreferences.app_features };
}

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
    warmup_suggestion: true,
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
