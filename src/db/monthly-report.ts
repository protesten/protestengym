import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculate1RM } from './calculations';

export interface MonthlyReport {
  month: string; // "Marzo 2026"
  from: string;
  to: string;
  sessionCount: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  prsBeaten: number;
  topMuscles: { name: string; sets: number }[];
  weakMuscles: { name: string; sets: number }[];
  best1RMs: { exercise: string; value: number }[];
  streakWeeks: number;
  avgSessionsPerWeek: number;
}

export async function generateMonthlyReport(monthOffset: number = 0): Promise<MonthlyReport> {
  const targetDate = subMonths(new Date(), monthOffset);
  const from = format(startOfMonth(targetDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(targetDate), 'yyyy-MM-dd');
  const monthLabel = format(targetDate, 'MMMM yyyy', { locale: es });

  // Sessions in range
  const { data: sessions } = await supabase.from('sessions').select('*').gte('date', from).lte('date', to);
  const sessionCount = sessions?.length ?? 0;

  if (!sessions?.length) {
    return { month: monthLabel, from, to, sessionCount: 0, totalVolume: 0, totalSets: 0, totalReps: 0, prsBeaten: 0, topMuscles: [], weakMuscles: [], best1RMs: [], streakWeeks: 0, avgSessionsPerWeek: 0 };
  }

  const sessionIds = sessions.map(s => s.id);
  const { data: sesExs } = await supabase.from('session_exercises').select('*').in('session_id', sessionIds);
  const seIds = (sesExs ?? []).map(se => se.id);
  const { data: allSets } = await supabase.from('sets').select('*').in('session_exercise_id', seIds);
  const workSets = (allSets ?? []).filter(s => s.set_type === 'work');

  // Total volume, sets, reps
  let totalVolume = 0, totalReps = 0;
  for (const s of workSets) {
    totalVolume += (s.weight ?? 0) * (s.reps ?? 0);
    totalReps += s.reps ?? 0;
  }

  // Exercises and muscles
  const { data: exercises } = await supabase.from('exercises').select('*');
  const { data: predefined } = await supabase.from('predefined_exercises').select('*');
  const { data: muscles } = await supabase.from('muscles').select('*');
  const allExercises = [...(exercises ?? []), ...(predefined ?? [])];

  // Muscle sets count
  const muscleSetsMap = new Map<number, number>();
  for (const se of (sesExs ?? [])) {
    const ex = allExercises.find(e => e.id === se.exercise_id);
    if (!ex) continue;
    const setCount = workSets.filter(s => s.session_exercise_id === se.id).length;
    for (const mid of (ex.primary_muscle_ids ?? [])) {
      muscleSetsMap.set(mid, (muscleSetsMap.get(mid) ?? 0) + setCount);
    }
    for (const mid of (ex.secondary_muscle_ids ?? [])) {
      muscleSetsMap.set(mid, (muscleSetsMap.get(mid) ?? 0) + setCount * 0.5);
    }
  }

  const muscleEntries = Array.from(muscleSetsMap.entries())
    .map(([id, sets]) => ({ name: muscles?.find(m => m.id === id)?.name ?? `#${id}`, sets: Math.round(sets * 10) / 10 }))
    .sort((a, b) => b.sets - a.sets);

  const topMuscles = muscleEntries.slice(0, 3);
  const weakMuscles = muscleEntries.length > 3 ? muscleEntries.slice(-3).reverse() : [];

  // Best 1RMs this month
  const rmMap = new Map<string, { exercise: string; value: number }>();
  for (const se of (sesExs ?? [])) {
    const ex = allExercises.find(e => e.id === se.exercise_id);
    if (!ex || ex.tracking_type !== 'weight_reps') continue;
    const sets = workSets.filter(s => s.session_exercise_id === se.id);
    for (const s of sets) {
      const rm = calculate1RM(s.weight ?? 0, s.reps ?? 0);
      const current = rmMap.get(ex.id);
      if (!current || rm > current.value) {
        rmMap.set(ex.id, { exercise: ex.name, value: rm });
      }
    }
  }
  const best1RMs = Array.from(rmMap.values()).sort((a, b) => b.value - a.value).slice(0, 5);

  // PR count (simplified: count sets that were max weight for their exercise)
  let prsBeaten = 0;
  // Get all historical sets before this month
  const { data: prevSessions } = await supabase.from('sessions').select('id').lt('date', from);
  if (prevSessions?.length) {
    const prevSessionIds = prevSessions.map(s => s.id);
    const { data: prevSesExs } = await supabase.from('session_exercises').select('*').in('session_id', prevSessionIds);
    const prevSeIds = (prevSesExs ?? []).map(se => se.id);
    const { data: prevAllSets } = await supabase.from('sets').select('*').in('session_exercise_id', prevSeIds);
    const prevWorkSets = (prevAllSets ?? []).filter(s => s.set_type === 'work');

    for (const [exId, rm] of rmMap) {
      const prevSetsForEx = prevWorkSets.filter(s => {
        const se = (prevSesExs ?? []).find(se => se.id === s.session_exercise_id);
        return se?.exercise_id === exId;
      });
      const prevMax1RM = Math.max(0, ...prevSetsForEx.map(s => calculate1RM(s.weight ?? 0, s.reps ?? 0)));
      if (rm.value > prevMax1RM && prevMax1RM > 0) prsBeaten++;
    }
  }

  // Weeks with sessions
  const weekSet = new Set<string>();
  for (const s of sessions) {
    const weekNum = format(new Date(s.date), 'yyyy-ww');
    weekSet.add(weekNum);
  }
  const weeksInMonth = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const avgSessionsPerWeek = Math.round((sessionCount / Math.max(weeksInMonth, 1)) * 10) / 10;

  return {
    month: monthLabel,
    from, to,
    sessionCount,
    totalVolume,
    totalSets: workSets.length,
    totalReps,
    prsBeaten,
    topMuscles,
    weakMuscles,
    best1RMs,
    streakWeeks: weekSet.size,
    avgSessionsPerWeek,
  };
}
