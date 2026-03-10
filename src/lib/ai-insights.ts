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

export async function fetchInsight(context: InsightContext, data: Record<string, unknown>): Promise<string> {
  const { data: result, error } = await supabase.functions.invoke('ai-insights', {
    body: { context, data },
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
