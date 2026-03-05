import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

/** Epley 1RM */
function calc1RM(w: number, r: number): number {
  if (w <= 0 || r <= 0) return 0;
  return r === 1 ? w : w * (1 + r / 30);
}

export interface ExerciseTrend {
  exerciseId: string;
  exerciseName: string;
  /** 1RM per session, newest first */
  sessionRMs: { date: string; rm: number }[];
  /** true if last 3 sessions show no improvement */
  plateau: boolean;
}

export interface CoachData {
  exercises: ExerciseTrend[];
  weeklyAvgRPE: number | null;
  bodyWeight: { date: string; kg: number }[];
  bodyFat: { date: string; pct: number }[];
}

export async function getCoachData(): Promise<CoachData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Get all weight_reps exercises (personal + predefined)
  const [{ data: personal }, { data: predefined }] = await Promise.all([
    supabase.from('exercises').select('id, name, tracking_type'),
    supabase.from('predefined_exercises').select('id, name, tracking_type'),
  ]);

  const allExercises = [
    ...(personal ?? []),
    ...(predefined ?? []).filter(p => !(personal ?? []).find(e => e.id === p.id)),
  ].filter(e => e.tracking_type === 'weight_reps');

  // 2. Get recent sessions (last 60 days)
  const since = format(subDays(new Date(), 60), 'yyyy-MM-dd');
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date')
    .eq('user_id', user.id)
    .gte('date', since)
    .order('date', { ascending: false });

  if (!sessions?.length) {
    return { exercises: [], weeklyAvgRPE: null, bodyWeight: [], bodyFat: [] };
  }

  const sessionIds = sessions.map(s => s.id);
  const sessionDateMap = new Map(sessions.map(s => [s.id, s.date]));

  // 3. Get all session_exercises + sets in bulk
  const { data: sesExs } = await supabase
    .from('session_exercises')
    .select('id, session_id, exercise_id')
    .in('session_id', sessionIds);

  const seIds = (sesExs ?? []).map(se => se.id);
  const { data: allSets } = await supabase
    .from('sets')
    .select('session_exercise_id, weight, reps, rpe, set_type')
    .in('session_exercise_id', seIds);

  // Group sets by session_exercise_id
  const setsBySE = new Map<string, typeof allSets>();
  for (const s of (allSets ?? [])) {
    const arr = setsBySE.get(s.session_exercise_id) ?? [];
    arr.push(s);
    setsBySE.set(s.session_exercise_id, arr);
  }

  // 4. Build exercise trends
  const exercises: ExerciseTrend[] = [];

  for (const ex of allExercises) {
    const relevantSEs = (sesExs ?? []).filter(se => se.exercise_id === ex.id);
    if (!relevantSEs.length) continue;

    // Group by session, get best 1RM per session
    const sessionRMMap = new Map<string, number>();
    for (const se of relevantSEs) {
      const sets = (setsBySE.get(se.id) ?? []).filter(s => s.set_type === 'work');
      let bestRM = 0;
      for (const s of sets) {
        const rm = calc1RM(s.weight ?? 0, s.reps ?? 0);
        if (rm > bestRM) bestRM = rm;
      }
      if (bestRM > 0) {
        const date = sessionDateMap.get(se.session_id) ?? '';
        const existing = sessionRMMap.get(date) ?? 0;
        if (bestRM > existing) sessionRMMap.set(date, bestRM);
      }
    }

    const sessionRMs = Array.from(sessionRMMap.entries())
      .map(([date, rm]) => ({ date, rm: Math.round(rm * 10) / 10 }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    if (sessionRMs.length < 2) continue;

    // Detect plateau: last 3 sessions have no improvement
    let plateau = false;
    if (sessionRMs.length >= 3) {
      const last3 = sessionRMs.slice(0, 3).map(s => s.rm);
      const maxLast3 = Math.max(...last3);
      const older = sessionRMs.slice(3).map(s => s.rm);
      const maxOlder = older.length ? Math.max(...older) : 0;
      // If max of last 3 <= max of older OR all last 3 are the same
      plateau = maxLast3 <= maxOlder || (last3[0] <= last3[2] && last3[1] <= last3[2]);
    }

    exercises.push({ exerciseId: ex.id, exerciseName: ex.name, sessionRMs, plateau });
  }

  // 5. Weekly average RPE (last 7 days)
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const recentSessionIds = sessions.filter(s => s.date >= weekAgo).map(s => s.id);
  let rpeSum = 0, rpeCount = 0;
  if (recentSessionIds.length) {
    const recentSEs = (sesExs ?? []).filter(se => recentSessionIds.includes(se.session_id));
    for (const se of recentSEs) {
      for (const s of (setsBySE.get(se.id) ?? [])) {
        if (s.set_type === 'work' && s.rpe != null) {
          rpeSum += Number(s.rpe);
          rpeCount++;
        }
      }
    }
  }

  // 6. Body measurements (last 2)
  const { data: measurements } = await supabase
    .from('body_measurements')
    .select('date, weight_kg, body_fat_pct')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(2);

  const bodyWeight = (measurements ?? [])
    .filter(m => m.weight_kg != null)
    .map(m => ({ date: m.date, kg: m.weight_kg! }));
  const bodyFat = (measurements ?? [])
    .filter(m => m.body_fat_pct != null)
    .map(m => ({ date: m.date, pct: m.body_fat_pct! }));

  return {
    exercises,
    weeklyAvgRPE: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    bodyWeight,
    bodyFat,
  };
}
