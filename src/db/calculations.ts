import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { startOfMonth, subDays, subMonths, endOfMonth, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

type TrackingType = 'weight_reps' | 'reps_only' | 'time_only' | 'distance_time';
type WorkoutSet = Tables<'sets'>;
type SessionRow = Tables<'sessions'>;
type SessionExerciseRow = Tables<'session_exercises'>;

/** Optional date range filter for analysis functions */
export interface DateRange {
  from: string; // yyyy-MM-dd
  to: string;   // yyyy-MM-dd
}

// Unified exercise shape for calculations
interface CalcExercise {
  id: string;
  name: string;
  tracking_type: TrackingType;
  primary_muscle_ids: number[] | null;
  secondary_muscle_ids: number[] | null;
}

// ============ Batch-fetch helpers ============

/** Chunk an array into groups of `size` to avoid Supabase .in() limits */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** Fetch rows with .in() supporting >1000 items by chunking */
async function fetchSessionExercisesIn(column: string, ids: string[]): Promise<SessionExerciseRow[]> {
  if (!ids.length) return [];
  const chunks = chunk(ids, 500);
  const results: SessionExerciseRow[] = [];
  for (const c of chunks) {
    const { data } = await supabase.from('session_exercises').select('*').in(column as 'session_id', c);
    if (data) results.push(...data);
  }
  return results;
}

async function fetchSetsIn(column: string, ids: string[]): Promise<WorkoutSet[]> {
  if (!ids.length) return [];
  const chunks = chunk(ids, 500);
  const results: WorkoutSet[] = [];
  for (const c of chunks) {
    const { data } = await supabase.from('sets').select('*').in(column as 'session_exercise_id', c);
    if (data) results.push(...data);
  }
  return results;
}

interface PrefetchedData {
  sessions: SessionRow[];
  sessionExercises: SessionExerciseRow[];
  sets: WorkoutSet[];
  // Indexed maps for fast lookup
  sessionById: Map<string, SessionRow>;
  seBySessionId: Map<string, SessionExerciseRow[]>;
  setsBySeId: Map<string, WorkoutSet[]>;
  seByExerciseId: Map<string, SessionExerciseRow[]>;
}

/** Batch-fetch all session data for a date range in 3 queries */
async function prefetchSessionData(dateFrom: string, dateTo: string): Promise<PrefetchedData> {
  // Query 1: sessions
  const { data: sessions } = await supabase
    .from('sessions').select('*')
    .gte('date', dateFrom).lte('date', dateTo)
    .order('date', { ascending: false });
  const sessionList = sessions ?? [];

  const sessionIds = sessionList.map(s => s.id);

  // Query 2: session_exercises
  const sessionExercises = await fetchSessionExercisesIn('session_id', sessionIds);

  const seIds = sessionExercises.map(se => se.id);

  // Query 3: sets
  const sets = await fetchSetsIn('session_exercise_id', seIds);

  // Build indexes
  const sessionById = new Map(sessionList.map(s => [s.id, s]));

  const seBySessionId = new Map<string, SessionExerciseRow[]>();
  for (const se of sessionExercises) {
    const arr = seBySessionId.get(se.session_id) ?? [];
    arr.push(se);
    seBySessionId.set(se.session_id, arr);
  }

  const setsBySeId = new Map<string, WorkoutSet[]>();
  for (const s of sets) {
    const arr = setsBySeId.get(s.session_exercise_id) ?? [];
    arr.push(s);
    setsBySeId.set(s.session_exercise_id, arr);
  }

  const seByExerciseId = new Map<string, SessionExerciseRow[]>();
  for (const se of sessionExercises) {
    const arr = seByExerciseId.get(se.exercise_id) ?? [];
    arr.push(se);
    seByExerciseId.set(se.exercise_id, arr);
  }

  return { sessions: sessionList, sessionExercises, sets, sessionById, seBySessionId, setsBySeId, seByExerciseId };
}

/** Fetch and merge both personal + predefined exercises */
async function getAllExercisesForCalc(): Promise<CalcExercise[]> {
  const [{ data: personal }, { data: predefined }] = await Promise.all([
    supabase.from('exercises').select('*'),
    supabase.from('predefined_exercises').select('*'),
  ]);
  const result: CalcExercise[] = [];
  const seen = new Set<string>();
  for (const e of (personal ?? [])) {
    seen.add(e.id);
    result.push({ id: e.id, name: e.name, tracking_type: e.tracking_type as TrackingType, primary_muscle_ids: e.primary_muscle_ids, secondary_muscle_ids: e.secondary_muscle_ids });
  }
  for (const e of (predefined ?? [])) {
    if (!seen.has(e.id)) {
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

// ============ Core metric helpers ============

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

/** Compute metric for an exercise from pre-fetched data, filtering sessions by date range */
function exerciseMetricFromPrefetched(
  exerciseId: string,
  trackingType: TrackingType,
  fromDate: string,
  toDate: string,
  prefetched: PrefetchedData,
): number {
  const seList = prefetched.seByExerciseId.get(exerciseId) ?? [];
  let total = 0;
  for (const se of seList) {
    const session = prefetched.sessionById.get(se.session_id);
    if (!session || session.date < fromDate || session.date > toDate) continue;
    const sets = prefetched.setsBySeId.get(se.id) ?? [];
    for (const s of sets) {
      total += setWorkMetric(s, trackingType);
    }
  }
  return total;
}

// ============ Exercise Comparisons ============

export async function getExerciseComparisons(exerciseId: string, trackingType: TrackingType, range?: DateRange) {
  let allFrom: string, allTo: string;
  let currFrom: string, currTo: string, prevFrom: string, prevTo: string;

  if (range) {
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const days = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    currFrom = range.from;
    currTo = range.to;
    prevTo = format(subDays(fromDate, 1), 'yyyy-MM-dd');
    prevFrom = format(subDays(fromDate, days + 1), 'yyyy-MM-dd');
    allFrom = prevFrom;
    allTo = currTo;
  } else {
    const today = format(new Date(), 'yyyy-MM-dd');
    currTo = today;
    currFrom = format(subDays(new Date(), 6), 'yyyy-MM-dd');
    prevFrom = format(subDays(new Date(), 13), 'yyyy-MM-dd');
    prevTo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    allFrom = format(subDays(new Date(), 60), 'yyyy-MM-dd'); // cover month comparisons too
    allTo = today;
  }

  const prefetched = await prefetchSessionData(allFrom, allTo);

  if (range) {
    const curr = exerciseMetricFromPrefetched(exerciseId, trackingType, currFrom, currTo, prefetched);
    const prev = exerciseMetricFromPrefetched(exerciseId, trackingType, prevFrom, prevTo, prefetched);
    return { lastSession: null as Comparison | null, week: makeComparison(curr, prev), month: null as Comparison | null };
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const d7from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const d7prevFrom = format(subDays(new Date(), 13), 'yyyy-MM-dd');
  const d7prevTo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const curr7 = exerciseMetricFromPrefetched(exerciseId, trackingType, d7from, today, prefetched);
  const prev7 = exerciseMetricFromPrefetched(exerciseId, trackingType, d7prevFrom, d7prevTo, prefetched);
  const week = makeComparison(curr7, prev7);

  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const prevMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const currMonth = exerciseMetricFromPrefetched(exerciseId, trackingType, monthStart, today, prefetched);
  const prevMonth = exerciseMetricFromPrefetched(exerciseId, trackingType, prevMonthStart, prevMonthEnd, prefetched);
  const month = makeComparison(currMonth, prevMonth);

  return { lastSession: null as Comparison | null, week, month };
}

// ============ Muscle Comparisons (optimized) ============

export interface MuscleVolume {
  muscleId: number;
  muscleName: string;
  strength: Comparison;
  isometric: Comparison;
}

export async function getMuscleComparisons(period: '7d' | 'month', range?: DateRange): Promise<MuscleVolume[]> {
  let currFrom: string, currTo: string, prevFrom: string, prevTo: string;

  if (range) {
    currFrom = range.from;
    currTo = range.to;
    const fromDate = new Date(range.from);
    const days = Math.round((new Date(range.to).getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    prevTo = format(subDays(fromDate, 1), 'yyyy-MM-dd');
    prevFrom = format(subDays(fromDate, days + 1), 'yyyy-MM-dd');
  } else {
    const today = format(new Date(), 'yyyy-MM-dd');
    currTo = today;
    if (period === '7d') {
      currFrom = format(subDays(new Date(), 6), 'yyyy-MM-dd');
      prevFrom = format(subDays(new Date(), 13), 'yyyy-MM-dd');
      prevTo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    } else {
      currFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      prevFrom = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
      prevTo = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    }
  }

  // Batch-fetch: 5 queries total (muscles, exercises, sessions+se+sets)
  const [{ data: muscles }, exercises, prefetched] = await Promise.all([
    supabase.from('muscles').select('*').order('id'),
    getAllExercisesForCalc(),
    prefetchSessionData(prevFrom, currTo), // single fetch covering both periods
  ]);

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
      const currVal = exerciseMetricFromPrefetched(ex.id, ex.tracking_type, currFrom, currTo, prefetched);
      const prevVal = exerciseMetricFromPrefetched(ex.id, ex.tracking_type, prevFrom, prevTo, prefetched);

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

// ============ Session Summary ============

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

/** Compute session summary from pre-fetched data */
function computeSessionSummary(
  session: SessionRow,
  exercises: CalcExercise[],
  prefetched: PrefetchedData,
): SessionSummary {
  const sesExercises = prefetched.seBySessionId.get(session.id) ?? [];
  let strengthTotal = 0, isometricTotal = 0, cardioTime = 0, cardioDistance = 0;
  let totalWorkSets = 0, rpeSum = 0, rpeCount = 0;

  const exMap = new Map(exercises.map(e => [e.id, e]));

  for (const se of sesExercises) {
    const exercise = exMap.get(se.exercise_id);
    if (!exercise) continue;
    const sets = prefetched.setsBySeId.get(se.id) ?? [];
    const workSets = sets.filter(s => s.set_type === 'work');
    totalWorkSets += workSets.length;

    for (const s of workSets) {
      if (s.rpe != null) { rpeSum += Number(s.rpe); rpeCount++; }
    }

    switch (exercise.tracking_type) {
      case 'weight_reps':
        strengthTotal += workSets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
        break;
      case 'reps_only':
        strengthTotal += workSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
        break;
      case 'time_only':
        isometricTotal += workSets.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
        break;
      case 'distance_time':
        cardioTime += workSets.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
        cardioDistance += workSets.reduce((sum, s) => sum + (s.distance_meters ?? 0), 0);
        break;
    }
  }

  return {
    sessionId: session.id,
    date: session.date,
    strengthTotal,
    isometricTotal,
    cardioTime,
    cardioDistance,
    exerciseCount: sesExercises.length,
    totalWorkSets,
    avgRPE: rpeCount > 0 ? Math.round(rpeSum / rpeCount * 10) / 10 : null,
  };
}

export async function getSessionSummary(sessionId: string): Promise<SessionSummary> {
  const { data: session } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
  if (!session) return { sessionId, date: '', strengthTotal: 0, isometricTotal: 0, cardioTime: 0, cardioDistance: 0, exerciseCount: 0, totalWorkSets: 0, avgRPE: null };

  const exercises = await getAllExercisesForCalc();
  const prefetched = await prefetchSessionData(session.date, session.date);

  return computeSessionSummary(session, exercises, prefetched);
}

export async function getAllSessionSummaries(): Promise<SessionSummary[]> {
  const { data: sessions } = await supabase.from('sessions').select('*').order('date', { ascending: false });
  if (!sessions?.length) return [];

  const oldest = sessions[sessions.length - 1].date;
  const newest = sessions[0].date;

  const [exercises, prefetched] = await Promise.all([
    getAllExercisesForCalc(),
    prefetchSessionData(oldest, newest),
  ]);

  return sessions.map(s => computeSessionSummary(s, exercises, prefetched));
}

// ============ Exercise History ============

export interface ExerciseHistoryEntry {
  date: string;
  sessionId: string;
  sets: WorkoutSet[];
  totalMetric: number;
}

export async function getExerciseHistory(exerciseId: string, trackingType: TrackingType, range?: DateRange): Promise<ExerciseHistoryEntry[]> {
  let dateFrom: string, dateTo: string;
  if (range) {
    dateFrom = range.from;
    dateTo = range.to;
  } else {
    dateTo = format(new Date(), 'yyyy-MM-dd');
    dateFrom = format(subMonths(new Date(), 12), 'yyyy-MM-dd'); // last 12 months
  }

  const prefetched = await prefetchSessionData(dateFrom, dateTo);
  const seList = prefetched.seByExerciseId.get(exerciseId) ?? [];
  if (!seList.length) return [];

  // Group by session, ordered by date desc
  const sessionMap = new Map<string, { date: string; sets: WorkoutSet[] }>();
  for (const se of seList) {
    const session = prefetched.sessionById.get(se.session_id);
    if (!session) continue;
    const sets = (prefetched.setsBySeId.get(se.id) ?? []).filter(s => s.set_type === 'work');
    if (!sets.length) continue;
    const existing = sessionMap.get(session.id);
    if (existing) {
      existing.sets.push(...sets);
    } else {
      sessionMap.set(session.id, { date: session.date, sets: [...sets] });
    }
  }

  const results: ExerciseHistoryEntry[] = [];
  for (const [sessionId, { date, sets }] of sessionMap) {
    const totalMetric = sets.reduce((sum, s) => sum + setWorkMetric(s, trackingType), 0);
    results.push({ date, sessionId, sets, totalMetric });
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
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

// ============ Personal Records (optimized) ============

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  trackingType: TrackingType;
  records: { label: string; value: number; unit: string; date: string }[];
}

export async function getPersonalRecords(range?: DateRange): Promise<PersonalRecord[]> {
  let dateFrom: string, dateTo: string;
  if (range) {
    dateFrom = range.from;
    dateTo = range.to;
  } else {
    dateTo = format(new Date(), 'yyyy-MM-dd');
    dateFrom = format(subMonths(new Date(), 24), 'yyyy-MM-dd');
  }

  const [exercises, prefetched] = await Promise.all([
    getAllExercisesForCalc(),
    prefetchSessionData(dateFrom, dateTo),
  ]);
  if (!exercises.length || !prefetched.sessions.length) return [];

  const results: PersonalRecord[] = [];

  for (const ex of exercises) {
    const seList = prefetched.seByExerciseId.get(ex.id) ?? [];
    if (!seList.length) continue;

    const allSets: { set: WorkoutSet; date: string }[] = [];
    for (const se of seList) {
      const session = prefetched.sessionById.get(se.session_id);
      if (!session) continue;
      const sets = prefetched.setsBySeId.get(se.id) ?? [];
      for (const s of sets) {
        if (s.set_type === 'work') allSets.push({ set: s, date: session.date });
      }
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

// ============ Period Summaries (optimized) ============

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

export async function getPeriodSummaries(granularity: 'week' | 'month', range?: DateRange): Promise<PeriodSummary[]> {
  const now = new Date();
  const periods: { label: string; from: string; to: string }[] = [];

  if (range) {
    periods.push({ label: `${range.from} → ${range.to}`, from: range.from, to: range.to });
  } else if (granularity === 'week') {
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

  // Single batch fetch covering the entire range
  const allFrom = periods[periods.length - 1].from;
  const allTo = periods[0].to;

  const [exercises, prefetched] = await Promise.all([
    getAllExercisesForCalc(),
    prefetchSessionData(allFrom, allTo),
  ]);

  const results: PeriodSummary[] = [];

  for (const period of periods) {
    // Filter sessions in this period
    const periodSessions = prefetched.sessions.filter(s => s.date >= period.from && s.date <= period.to);

    let strengthTotal = 0, isometricTotal = 0, cardioTime = 0;
    let exerciseCount = 0, totalWorkSets = 0;
    let rpeSum = 0, rpeCount = 0;

    for (const session of periodSessions) {
      const summary = computeSessionSummary(session, exercises, prefetched);
      strengthTotal += summary.strengthTotal;
      isometricTotal += summary.isometricTotal;
      cardioTime += summary.cardioTime;
      exerciseCount += summary.exerciseCount;
      totalWorkSets += summary.totalWorkSets;
      if (summary.avgRPE != null) { rpeSum += summary.avgRPE; rpeCount++; }
    }

    results.push({
      label: period.label,
      from: period.from,
      to: period.to,
      sessionCount: periodSessions.length,
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

export async function getWeeklyMuscleSets(weeksBack: number = 0, range?: DateRange): Promise<WeeklyMuscleSets[]> {
  let from: string, to: string;

  if (range) {
    from = range.from;
    to = range.to;
  } else {
    const now = new Date();
    const targetWeek = subWeeks(now, weeksBack);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = weeksBack === 0 ? now : endOfWeek(targetWeek, { weekStartsOn: 1 });
    from = format(weekStart, 'yyyy-MM-dd');
    to = format(weekEnd, 'yyyy-MM-dd');
  }

  const [{ data: muscles }, exercises, prefetched] = await Promise.all([
    supabase.from('muscles').select('*').order('id'),
    getAllExercisesForCalc(),
    prefetchSessionData(from, to),
  ]);

  if (!muscles || !prefetched.sessions.length) return [];

  const setsPerExercise = new Map<string, number>();
  for (const se of prefetched.sessionExercises) {
    const sets = prefetched.setsBySeId.get(se.id) ?? [];
    const workCount = sets.filter(s => s.set_type === 'work').length;
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

export async function getAll1RMs(range?: DateRange): Promise<ExerciseRM[]> {
  let dateFrom: string, dateTo: string;
  if (range) {
    dateFrom = range.from;
    dateTo = range.to;
  } else {
    dateTo = format(new Date(), 'yyyy-MM-dd');
    dateFrom = format(subMonths(new Date(), 24), 'yyyy-MM-dd');
  }

  const [exercises, prefetched] = await Promise.all([
    getAllExercisesForCalc(),
    prefetchSessionData(dateFrom, dateTo),
  ]);
  if (!exercises.length || !prefetched.sessions.length) return [];

  const results: ExerciseRM[] = [];

  for (const ex of exercises) {
    if (ex.tracking_type !== 'weight_reps') continue;
    const seList = prefetched.seByExerciseId.get(ex.id) ?? [];
    if (!seList.length) continue;

    let best1RM = 0, bestWeight = 0, bestReps = 0, bestDate = '';

    for (const se of seList) {
      const session = prefetched.sessionById.get(se.session_id);
      if (!session) continue;
      const sets = prefetched.setsBySeId.get(se.id) ?? [];
      for (const s of sets) {
        if (s.set_type !== 'work') continue;
        const rm = calculate1RM(s.weight ?? 0, s.reps ?? 0);
        if (rm > best1RM) {
          best1RM = rm;
          bestWeight = s.weight ?? 0;
          bestReps = s.reps ?? 0;
          bestDate = session.date;
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

export async function get1RMHistory(exerciseId: string, range?: DateRange): Promise<RM1History[]> {
  let dateFrom: string, dateTo: string;
  if (range) {
    dateFrom = range.from;
    dateTo = range.to;
  } else {
    dateTo = format(new Date(), 'yyyy-MM-dd');
    dateFrom = format(subMonths(new Date(), 24), 'yyyy-MM-dd');
  }

  const prefetched = await prefetchSessionData(dateFrom, dateTo);
  const seList = prefetched.seByExerciseId.get(exerciseId) ?? [];
  if (!seList.length) return [];

  // Group by session date
  const dateMap = new Map<string, number>();
  for (const se of seList) {
    const session = prefetched.sessionById.get(se.session_id);
    if (!session) continue;
    const sets = prefetched.setsBySeId.get(se.id) ?? [];
    for (const s of sets) {
      if (s.set_type !== 'work') continue;
      const rm = calculate1RM(s.weight ?? 0, s.reps ?? 0);
      if (rm > (dateMap.get(session.date) ?? 0)) {
        dateMap.set(session.date, rm);
      }
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, estimated1RM]) => ({ date, estimated1RM }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
  const allSets = await fetchSetsIn('session_exercise_id', seIds);
  const historicalSets = allSets.filter(s => s.set_type === 'work' && s.id !== currentSet.id);

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
