import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { startOfMonth, subDays, subMonths, endOfMonth, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

type TrackingType = 'weight_reps' | 'reps_only' | 'time_only' | 'distance_time';
type WorkoutSet = Tables<'sets'>;

// Unified exercise shape for calculations
interface CalcExercise {
  id: string;
  name: string;
  tracking_type: TrackingType;
  primary_muscle_ids: number[] | null;
  secondary_muscle_ids: number[] | null;
}

/** Fetch and merge both personal + predefined exercises */
async function getAllExercisesForCalc(): Promise<CalcExercise[]> {
  const [{ data: personal }, { data: predefined }] = await Promise.all([
    supabase.from('exercises').select('*'),
    supabase.from('predefined_exercises').select('*'),
  ]);
  const result: CalcExercise[] = [];
  for (const e of (personal ?? [])) {
    result.push({ id: e.id, name: e.name, tracking_type: e.tracking_type as TrackingType, primary_muscle_ids: e.primary_muscle_ids, secondary_muscle_ids: e.secondary_muscle_ids });
  }
  for (const e of (predefined ?? [])) {
    // Avoid duplicates by id (shouldn't happen but safety)
    if (!result.find(r => r.id === e.id)) {
      result.push({ id: e.id, name: e.name, tracking_type: e.tracking_type as TrackingType, primary_muscle_ids: e.primary_muscle_ids, secondary_muscle_ids: e.secondary_muscle_ids });
    }
  }
  return result;
}

/** Look up a single exercise in both tables */
async function findExercise(exerciseId: string): Promise<CalcExercise | null> {
  const { data: personal } = await supabase.from('exercises').select('*').eq('id', exerciseId).maybeSingle();
  if (personal) return { id: personal.id, name: personal.name, tracking_type: personal.tracking_type as TrackingType, primary_muscle_ids: personal.primary_muscle_ids, secondary_muscle_ids: personal.secondary_muscle_ids };
  const { data: predefined } = await supabase.from('predefined_exercises').select('*').eq('id', exerciseId).maybeSingle();
  if (predefined) return { id: predefined.id, name: predefined.name, tracking_type: predefined.tracking_type as TrackingType, primary_muscle_ids: predefined.primary_muscle_ids, secondary_muscle_ids: predefined.secondary_muscle_ids };
  return null;
}

export function setWorkMetric(set: WorkoutSet, trackingType: TrackingType): number {
  if (set.set_type !== 'work') return 0;
  switch (trackingType) {
    case 'weight_reps': return (set.weight ?? 0) * (set.reps ?? 0);
    case 'reps_only': return set.reps ?? 0;
    case 'time_only': return set.duration_seconds ?? 0;
    case 'distance_time': return set.duration_seconds ?? 0;
  }
}

export function setsWorkMetric(sets: WorkoutSet[], trackingType: TrackingType): number {
  return sets.reduce((sum, s) => sum + setWorkMetric(s, trackingType), 0);
}

export interface Comparison {
  current: number;
  previous: number;
  diff: number;
  arrow: '↑' | '↓' | '=';
}

export function makeComparison(current: number, previous: number): Comparison {
  const diff = current - previous;
  return { current, previous, diff, arrow: diff > 0 ? '↑' : diff < 0 ? '↓' : '=' };
}

async function exerciseMetricInRange(exerciseId: string, from: string, to: string, trackingType: TrackingType): Promise<number> {
  const { data: sessions } = await supabase.from('sessions').select('id').gte('date', from).lte('date', to);
  if (!sessions?.length) return 0;
  const sessionIds = sessions.map(s => s.id);
  const { data: ses } = await supabase.from('session_exercises').select('id').in('session_id', sessionIds).eq('exercise_id', exerciseId);
  if (!ses?.length) return 0;
  const seIds = ses.map(se => se.id);
  const { data: sets } = await supabase.from('sets').select('*').in('session_exercise_id', seIds);
  if (!sets) return 0;
  return sets.reduce((sum, s) => sum + setWorkMetric(s, trackingType), 0);
}

export async function getExerciseComparisons(exerciseId: string, trackingType: TrackingType) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const d7from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const d7prevFrom = format(subDays(new Date(), 13), 'yyyy-MM-dd');
  const d7prevTo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const curr7 = await exerciseMetricInRange(exerciseId, d7from, today, trackingType);
  const prev7 = await exerciseMetricInRange(exerciseId, d7prevFrom, d7prevTo, trackingType);
  const week = makeComparison(curr7, prev7);

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const prevMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const currMonth = await exerciseMetricInRange(exerciseId, monthStart, today, trackingType);
  const prevMonth = await exerciseMetricInRange(exerciseId, prevMonthStart, prevMonthEnd, trackingType);
  const month = makeComparison(currMonth, prevMonth);

  return { lastSession: null as Comparison | null, week, month };
}

export interface MuscleVolume {
  muscleId: number;
  muscleName: string;
  strength: Comparison;
  isometric: Comparison;
}

export async function getMuscleComparisons(period: '7d' | 'month'): Promise<MuscleVolume[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  let currFrom: string, prevFrom: string, prevTo: string;

  if (period === '7d') {
    currFrom = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    prevFrom = format(subDays(new Date(), 13), 'yyyy-MM-dd');
    prevTo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  } else {
    currFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    prevFrom = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    prevTo = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  }

  const { data: muscles } = await supabase.from('muscles').select('*').order('id');
  const exercises = await getAllExercisesForCalc();
  if (!muscles || !exercises.length) return [];

  const result: MuscleVolume[] = [];

  for (const muscle of muscles) {
    let currStrength = 0, prevStrength = 0, currIso = 0, prevIso = 0;

    for (const ex of exercises) {
      if (ex.tracking_type === 'distance_time') continue;
      const isPrimary = (ex.primary_muscle_ids ?? []).includes(muscle.id);
      const isSecondary = (ex.secondary_muscle_ids ?? []).includes(muscle.id);
      if (!isPrimary && !isSecondary) continue;

      const factor = isPrimary ? 1 : 0.5;
      const currVal = await exerciseMetricInRange(ex.id, currFrom, today, ex.tracking_type);
      const prevVal = await exerciseMetricInRange(ex.id, prevFrom, prevTo, ex.tracking_type);

      if (ex.tracking_type === 'time_only') {
        currIso += currVal * factor;
        prevIso += prevVal * factor;
      } else {
        currStrength += currVal * factor;
        prevStrength += prevVal * factor;
      }
    }

    if (currStrength > 0 || prevStrength > 0 || currIso > 0 || prevIso > 0) {
      result.push({
        muscleId: muscle.id,
        muscleName: muscle.name,
        strength: makeComparison(currStrength, prevStrength),
        isometric: makeComparison(currIso, prevIso),
      });
    }
  }

  return result;
}

export interface SessionSummary {
  sessionId: string;
  date: string;
  strengthTotal: number;
  isometricTotal: number;
  cardioTime: number;
  cardioDistance: number;
  exerciseCount: number;
  totalWorkSets: number;
  avgRPE: number | null;
}

export async function getSessionSummary(sessionId: string): Promise<SessionSummary> {
  const { data: session } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
  const { data: sesExercises } = await supabase.from('session_exercises').select('*').eq('session_id', sessionId);
  
  let strengthTotal = 0, isometricTotal = 0, cardioTime = 0, cardioDistance = 0;
  let totalWorkSets = 0;
  let rpeSum = 0, rpeCount = 0;

  if (sesExercises) {
    for (const se of sesExercises) {
      const exercise = await findExercise(se.exercise_id);
      if (!exercise) continue;
      const { data: sets } = await supabase.from('sets').select('*').eq('session_exercise_id', se.id);
      const workSets = (sets ?? []).filter(s => s.set_type === 'work');
      totalWorkSets += workSets.length;

      for (const s of workSets) {
        if (s.rpe != null) { rpeSum += Number(s.rpe); rpeCount++; }
      }

      switch (exercise.tracking_type) {
        case 'weight_reps':
          strengthTotal += workSets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
          break;
        case 'reps_only':
          strengthTotal += workSets.reduce((s, set) => s + (set.reps ?? 0), 0);
          break;
        case 'time_only':
          isometricTotal += workSets.reduce((s, set) => s + (set.duration_seconds ?? 0), 0);
          break;
        case 'distance_time':
          cardioTime += workSets.reduce((s, set) => s + (set.duration_seconds ?? 0), 0);
          cardioDistance += workSets.reduce((s, set) => s + (set.distance_meters ?? 0), 0);
          break;
      }
    }
  }

  return {
    sessionId,
    date: session?.date ?? '',
    strengthTotal,
    isometricTotal,
    cardioTime,
    cardioDistance,
    exerciseCount: sesExercises?.length ?? 0,
    totalWorkSets,
    avgRPE: rpeCount > 0 ? Math.round(rpeSum / rpeCount * 10) / 10 : null,
  };
}

export async function getAllSessionSummaries(): Promise<SessionSummary[]> {
  const { data: sessions } = await supabase.from('sessions').select('*').order('date', { ascending: false });
  if (!sessions) return [];
  return Promise.all(sessions.map(s => getSessionSummary(s.id)));
}

export interface ExerciseHistoryEntry {
  date: string;
  sessionId: string;
  sets: WorkoutSet[];
  totalMetric: number;
}

export async function getExerciseHistory(exerciseId: string, trackingType: TrackingType): Promise<ExerciseHistoryEntry[]> {
  const { data: sessions } = await supabase.from('sessions').select('*').order('date', { ascending: false });
  if (!sessions) return [];
  const results: ExerciseHistoryEntry[] = [];

  for (const session of sessions) {
    const { data: ses } = await supabase.from('session_exercises').select('id').eq('session_id', session.id).eq('exercise_id', exerciseId);
    if (!ses?.length) continue;
    const seIds = ses.map(se => se.id);
    const { data: sets } = await supabase.from('sets').select('*').in('session_exercise_id', seIds);
    const workSets = (sets ?? []).filter(s => s.set_type === 'work');
    if (!workSets.length) continue;
    const totalMetric = workSets.reduce((sum, s) => sum + setWorkMetric(s, trackingType), 0);
    results.push({ date: session.date, sessionId: session.id, sets: workSets, totalMetric });
  }

  return results;
}

export function formatSetSummary(sets: WorkoutSet[], trackingType: TrackingType): string {
  const workSets = sets.filter(s => s.set_type === 'work');
  if (!workSets.length) return '-';

  switch (trackingType) {
    case 'weight_reps': {
      const groups = new Map<string, number>();
      workSets.forEach(s => {
        const key = `${s.weight ?? 0}kg×${s.reps ?? 0}`;
        groups.set(key, (groups.get(key) ?? 0) + 1);
      });
      return Array.from(groups.entries()).map(([k, count]) => count > 1 ? `${count}×${k}` : k).join(', ');
    }
    case 'reps_only': return workSets.map(s => s.reps ?? 0).join(', ') + ' reps';
    case 'time_only': return workSets.map(s => `${s.duration_seconds ?? 0}s`).join(', ');
    case 'distance_time': return workSets.map(s => `${s.distance_meters ?? 0}m/${s.duration_seconds ?? 0}s`).join(', ');
  }
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  trackingType: TrackingType;
  records: { label: string; value: number; unit: string; date: string }[];
}

export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const exercises = await getAllExercisesForCalc();
  const { data: allSessions } = await supabase.from('sessions').select('*');
  if (!exercises.length || !allSessions) return [];
  const sessionDateMap = new Map(allSessions.map(s => [s.id, s.date]));
  const results: PersonalRecord[] = [];

  for (const ex of exercises) {
    const { data: sesExs } = await supabase.from('session_exercises').select('*').eq('exercise_id', ex.id);
    if (!sesExs?.length) continue;

    const allSets: { set: WorkoutSet; date: string }[] = [];
    for (const se of sesExs) {
      const date = sessionDateMap.get(se.session_id) ?? '';
      const { data: sets } = await supabase.from('sets').select('*').eq('session_exercise_id', se.id);
      (sets ?? []).filter(s => s.set_type === 'work').forEach(s => allSets.push({ set: s, date }));
    }
    if (!allSets.length) continue;

    const records: { label: string; value: number; unit: string; date: string }[] = [];

    switch (ex.tracking_type) {
      case 'weight_reps': {
        let maxWeight = { value: 0, date: '' };
        let maxVolume = { value: 0, date: '' };
        let max1RM = { value: 0, date: '' };
        for (const { set, date } of allSets) {
          const w = set.weight ?? 0;
          const r = set.reps ?? 0;
          const vol = w * r;
          const rm = calculate1RM(w, r);
          if (w > maxWeight.value) maxWeight = { value: w, date };
          if (vol > maxVolume.value) maxVolume = { value: vol, date };
          if (rm > max1RM.value) max1RM = { value: rm, date };
        }
        if (maxWeight.value > 0) records.push({ label: 'Peso máx', value: maxWeight.value, unit: 'kg', date: maxWeight.date });
        if (maxVolume.value > 0) records.push({ label: 'Vol. máx serie', value: maxVolume.value, unit: 'kg', date: maxVolume.date });
        if (max1RM.value > 0) records.push({ label: '1RM estimado', value: max1RM.value, unit: 'kg', date: max1RM.date });
        break;
      }
      case 'reps_only': {
        let maxReps = { value: 0, date: '' };
        for (const { set, date } of allSets) {
          const r = set.reps ?? 0;
          if (r > maxReps.value) maxReps = { value: r, date };
        }
        if (maxReps.value > 0) records.push({ label: 'Máx reps', value: maxReps.value, unit: 'reps', date: maxReps.date });
        break;
      }
      case 'time_only': {
        let maxTime = { value: 0, date: '' };
        for (const { set, date } of allSets) {
          const t = set.duration_seconds ?? 0;
          if (t > maxTime.value) maxTime = { value: t, date };
        }
        if (maxTime.value > 0) records.push({ label: 'Máx tiempo', value: maxTime.value, unit: 's', date: maxTime.date });
        break;
      }
      case 'distance_time': {
        let maxDist = { value: 0, date: '' };
        let maxTime = { value: 0, date: '' };
        for (const { set, date } of allSets) {
          const d = set.distance_meters ?? 0;
          const t = set.duration_seconds ?? 0;
          if (d > maxDist.value) maxDist = { value: d, date };
          if (t > maxTime.value) maxTime = { value: t, date };
        }
        if (maxDist.value > 0) records.push({ label: 'Máx distancia', value: maxDist.value, unit: 'm', date: maxDist.date });
        if (maxTime.value > 0) records.push({ label: 'Máx tiempo', value: maxTime.value, unit: 's', date: maxTime.date });
        break;
      }
    }

    if (records.length > 0) {
      results.push({ exerciseId: ex.id, exerciseName: ex.name, trackingType: ex.tracking_type, records });
    }
  }

  return results;
}

export interface PeriodSummary {
  label: string;
  from: string;
  to: string;
  sessionCount: number;
  strengthTotal: number;
  isometricTotal: number;
  cardioTime: number;
  exerciseCount: number;
  totalWorkSets: number;
  avgRPE: number | null;
}

export async function getPeriodSummaries(granularity: 'week' | 'month'): Promise<PeriodSummary[]> {
  const now = new Date();
  const periods: { label: string; from: string; to: string }[] = [];

  if (granularity === 'week') {
    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(subWeeks(now, i), { locale: es, weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { locale: es, weekStartsOn: 1 });
      periods.push({
        label: i === 0 ? 'Esta semana' : i === 1 ? 'Semana pasada' : format(weekStart, 'dd MMM', { locale: es }),
        from: format(weekStart, 'yyyy-MM-dd'),
        to: format(weekEnd, 'yyyy-MM-dd'),
      });
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(now, i);
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      periods.push({
        label: i === 0 ? 'Este mes' : format(mStart, 'MMM yyyy', { locale: es }),
        from: format(mStart, 'yyyy-MM-dd'),
        to: format(mEnd, 'yyyy-MM-dd'),
      });
    }
  }

  const results: PeriodSummary[] = [];

  for (const period of periods) {
    const { data: sessions } = await supabase.from('sessions').select('*').gte('date', period.from).lte('date', period.to);
    let strengthTotal = 0, isometricTotal = 0, cardioTime = 0;
    let exerciseCount = 0, totalWorkSets = 0;
    let rpeSum = 0, rpeCount = 0;

    if (sessions) {
      for (const session of sessions) {
        const summary = await getSessionSummary(session.id);
        strengthTotal += summary.strengthTotal;
        isometricTotal += summary.isometricTotal;
        cardioTime += summary.cardioTime;
        exerciseCount += summary.exerciseCount;
        totalWorkSets += summary.totalWorkSets;
        if (summary.avgRPE != null) { rpeSum += summary.avgRPE; rpeCount++; }
      }
    }

    results.push({
      label: period.label,
      from: period.from,
      to: period.to,
      sessionCount: sessions?.length ?? 0,
      strengthTotal,
      isometricTotal,
      cardioTime,
      exerciseCount,
      totalWorkSets,
      avgRPE: rpeCount > 0 ? Math.round(rpeSum / rpeCount * 10) / 10 : null,
    });
  }

  return results;
}

// ============ Weekly Sets per Muscle ============
export interface WeeklyMuscleSets {
  muscleId: number;
  muscleName: string;
  workingSets: number;
}

export async function getWeeklyMuscleSets(weeksBack: number = 0): Promise<WeeklyMuscleSets[]> {
  const now = new Date();
  const targetWeek = subWeeks(now, weeksBack);
  const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
  const weekEnd = weeksBack === 0 ? now : endOfWeek(targetWeek, { weekStartsOn: 1 });
  const from = format(weekStart, 'yyyy-MM-dd');
  const to = format(weekEnd, 'yyyy-MM-dd');

  const { data: muscles } = await supabase.from('muscles').select('*').order('id');
  const exercises = await getAllExercisesForCalc();
  const { data: sessions } = await supabase.from('sessions').select('id').gte('date', from).lte('date', to);
  if (!muscles || !sessions?.length) return [];

  const sessionIds = sessions.map(s => s.id);
  const { data: sesExs } = await supabase.from('session_exercises').select('*').in('session_id', sessionIds);
  if (!sesExs?.length) return [];

  const seIds = sesExs.map(se => se.id);
  const { data: allSets } = await supabase.from('sets').select('*').in('session_exercise_id', seIds);
  if (!allSets) return [];

  const setsPerExercise = new Map<string, number>();
  for (const se of sesExs) {
    const workCount = allSets.filter(s => s.session_exercise_id === se.id && s.set_type === 'work').length;
    setsPerExercise.set(se.exercise_id, (setsPerExercise.get(se.exercise_id) ?? 0) + workCount);
  }

  const result: WeeklyMuscleSets[] = [];
  for (const muscle of muscles) {
    let totalSets = 0;
    for (const [exId, setCount] of setsPerExercise) {
      const ex = exercises.find(e => e.id === exId);
      if (!ex) continue;
      const isPrimary = (ex.primary_muscle_ids ?? []).includes(muscle.id);
      const isSecondary = (ex.secondary_muscle_ids ?? []).includes(muscle.id);
      if (isPrimary) totalSets += setCount;
      else if (isSecondary) totalSets += setCount * 0.5;
    }
    if (totalSets > 0) {
      result.push({ muscleId: muscle.id, muscleName: muscle.name, workingSets: Math.round(totalSets * 10) / 10 });
    }
  }
  return result.sort((a, b) => b.workingSets - a.workingSets);
}

// ============ 1RM Estimation (Epley) ============
export interface ExerciseRM {
  exerciseId: string;
  exerciseName: string;
  estimated1RM: number;
  weight: number;
  reps: number;
  date: string;
}

export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export async function getAll1RMs(): Promise<ExerciseRM[]> {
  const exercises = await getAllExercisesForCalc();
  const { data: allSessions } = await supabase.from('sessions').select('*');
  if (!exercises.length || !allSessions) return [];
  const sessionDateMap = new Map(allSessions.map(s => [s.id, s.date]));
  const results: ExerciseRM[] = [];

  for (const ex of exercises) {
    if (ex.tracking_type !== 'weight_reps') continue;
    const { data: sesExs } = await supabase.from('session_exercises').select('*').eq('exercise_id', ex.id);
    if (!sesExs?.length) continue;

    let best1RM = 0;
    let bestWeight = 0, bestReps = 0, bestDate = '';

    for (const se of sesExs) {
      const date = sessionDateMap.get(se.session_id) ?? '';
      const { data: sets } = await supabase.from('sets').select('*').eq('session_exercise_id', se.id);
      for (const s of (sets ?? []).filter(s => s.set_type === 'work')) {
        const rm = calculate1RM(s.weight ?? 0, s.reps ?? 0);
        if (rm > best1RM) {
          best1RM = rm;
          bestWeight = s.weight ?? 0;
          bestReps = s.reps ?? 0;
          bestDate = date;
        }
      }
    }

    if (best1RM > 0) {
      results.push({ exerciseId: ex.id, exerciseName: ex.name, estimated1RM: best1RM, weight: bestWeight, reps: bestReps, date: bestDate });
    }
  }
  return results.sort((a, b) => b.estimated1RM - a.estimated1RM);
}

export interface RM1History {
  date: string;
  estimated1RM: number;
}

export async function get1RMHistory(exerciseId: string): Promise<RM1History[]> {
  const { data: allSessions } = await supabase.from('sessions').select('*').order('date', { ascending: true });
  if (!allSessions) return [];

  const results: RM1History[] = [];
  for (const session of allSessions) {
    const { data: ses } = await supabase.from('session_exercises').select('id').eq('session_id', session.id).eq('exercise_id', exerciseId);
    if (!ses?.length) continue;
    const { data: sets } = await supabase.from('sets').select('*').in('session_exercise_id', ses.map(s => s.id));
    let best = 0;
    for (const s of (sets ?? []).filter(s => s.set_type === 'work')) {
      const rm = calculate1RM(s.weight ?? 0, s.reps ?? 0);
      if (rm > best) best = rm;
    }
    if (best > 0) results.push({ date: session.date, estimated1RM: best });
  }
  return results;
}

// ============ Streak & Consistency ============
export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  sessionsThisMonth: number;
  weeklyAverage: number;
  daysSinceLastSession: number;
  activityMap: Map<string, number>;
}

export async function getStreakData(): Promise<StreakData> {
  const { data: sessions } = await supabase.from('sessions').select('date').order('date', { ascending: false });
  if (!sessions?.length) {
    return { currentStreak: 0, bestStreak: 0, sessionsThisMonth: 0, weeklyAverage: 0, daysSinceLastSession: -1, activityMap: new Map() };
  }

  const now = new Date();

  const activityMap = new Map<string, number>();
  const cutoff = format(subDays(now, 90), 'yyyy-MM-dd');
  for (const s of sessions) {
    if (s.date >= cutoff) {
      activityMap.set(s.date, (activityMap.get(s.date) ?? 0) + 1);
    }
  }

  const lastDate = sessions[0].date;
  const daysSinceLastSession = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));

  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const sessionsThisMonth = sessions.filter(s => s.date >= monthStart).length;

  const eightWeeksAgo = format(subWeeks(now, 8), 'yyyy-MM-dd');
  const last8Weeks = sessions.filter(s => s.date >= eightWeeksAgo).length;
  const weeklyAverage = Math.round((last8Weeks / 8) * 10) / 10;

  const sessionDates = new Set(sessions.map(s => s.date));
  let currentStreak = 0;
  let bestStreak = 0;
  let streak = 0;

  for (let i = 0; i < 52; i++) {
    const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const we = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    let hasSession = false;
    for (let d = new Date(ws); d <= we; d.setDate(d.getDate() + 1)) {
      if (sessionDates.has(format(d, 'yyyy-MM-dd'))) { hasSession = true; break; }
    }
    if (hasSession) {
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      if (i === 0) { /* current week empty is OK */ }
      else { if (currentStreak === 0) currentStreak = streak; streak = 0; }
    }
  }
  if (currentStreak === 0) currentStreak = streak;

  return { currentStreak, bestStreak, sessionsThisMonth, weeklyAverage, daysSinceLastSession, activityMap };
}

// ============ PR Check (for live notification) ============
export interface PRCheckResult {
  isPR: boolean;
  prType: 'weight' | 'volume' | 'reps' | 'time' | 'distance' | '1rm' | null;
  previousBest: number;
  newValue: number;
}

export async function checkForPR(exerciseId: string, trackingType: TrackingType, currentSet: WorkoutSet): Promise<PRCheckResult> {
  const { data: sesExs } = await supabase.from('session_exercises').select('id, session_id').eq('exercise_id', exerciseId);
  if (!sesExs?.length) return { isPR: false, prType: null, previousBest: 0, newValue: 0 };

  const seIds = sesExs.map(se => se.id);
  const { data: allSets } = await supabase.from('sets').select('*').in('session_exercise_id', seIds);
  const historicalSets = (allSets ?? []).filter(s => s.set_type === 'work' && s.id !== currentSet.id);

  if (currentSet.set_type !== 'work') return { isPR: false, prType: null, previousBest: 0, newValue: 0 };

  switch (trackingType) {
    case 'weight_reps': {
      const currentWeight = currentSet.weight ?? 0;
      const current1RM = calculate1RM(currentWeight, currentSet.reps ?? 0);
      const maxWeight = Math.max(0, ...historicalSets.map(s => s.weight ?? 0));
      const max1RM = Math.max(0, ...historicalSets.map(s => calculate1RM(s.weight ?? 0, s.reps ?? 0)));
      if (currentWeight > maxWeight && currentWeight > 0) return { isPR: true, prType: 'weight', previousBest: maxWeight, newValue: currentWeight };
      if (current1RM > max1RM && current1RM > 0) return { isPR: true, prType: '1rm', previousBest: max1RM, newValue: current1RM };
      break;
    }
    case 'reps_only': {
      const currentReps = currentSet.reps ?? 0;
      const maxReps = Math.max(0, ...historicalSets.map(s => s.reps ?? 0));
      if (currentReps > maxReps && currentReps > 0) return { isPR: true, prType: 'reps', previousBest: maxReps, newValue: currentReps };
      break;
    }
    case 'time_only': {
      const currentTime = currentSet.duration_seconds ?? 0;
      const maxTime = Math.max(0, ...historicalSets.map(s => s.duration_seconds ?? 0));
      if (currentTime > maxTime && currentTime > 0) return { isPR: true, prType: 'time', previousBest: maxTime, newValue: currentTime };
      break;
    }
    case 'distance_time': {
      const currentDist = currentSet.distance_meters ?? 0;
      const maxDist = Math.max(0, ...historicalSets.map(s => s.distance_meters ?? 0));
      if (currentDist > maxDist && currentDist > 0) return { isPR: true, prType: 'distance', previousBest: maxDist, newValue: currentDist };
      break;
    }
  }
  return { isPR: false, prType: null, previousBest: 0, newValue: 0 };
}
