import { db, type Exercise, type WorkoutSet, type TrackingType } from './index';
import { startOfMonth, subDays, subMonths, endOfMonth, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

// Work metric for a set based on tracking type
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

export function setsDistance(sets: WorkoutSet[]): number {
  return sets.filter(s => s.set_type === 'work').reduce((sum, s) => sum + (s.distance_meters ?? 0), 0);
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

// Get work metric for an exercise in a specific session
async function exerciseMetricInSession(sessionId: number, exerciseId: number, trackingType: TrackingType): Promise<number> {
  const ses = await db.sessionExercises.where({ session_id: sessionId, exercise_id: exerciseId }).toArray();
  if (!ses.length) return 0;
  const allSets = await Promise.all(ses.map(se => db.sets.where({ session_exercise_id: se.id! }).toArray()));
  return allSets.flat().reduce((sum, s) => sum + setWorkMetric(s, trackingType), 0);
}

// Sum work metric for exercise in date range
async function exerciseMetricInRange(exerciseId: number, from: string, to: string, trackingType: TrackingType): Promise<number> {
  const sessions = await db.sessions.where('date').between(from, to, true, true).toArray();
  let total = 0;
  for (const session of sessions) {
    total += await exerciseMetricInSession(session.id!, exerciseId, trackingType);
  }
  return total;
}

export async function getExerciseComparisons(exerciseId: number, trackingType: TrackingType, currentSessionId?: number) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Last session comparison
  let lastSession: Comparison | null = null;
  if (currentSessionId) {
    const allSessions = await db.sessions.orderBy('date').reverse().toArray();
    const sessionsWithExercise: number[] = [];
    for (const s of allSessions) {
      const has = await db.sessionExercises.where({ session_id: s.id!, exercise_id: exerciseId }).count();
      if (has > 0) sessionsWithExercise.push(s.id!);
    }
    const currentIdx = sessionsWithExercise.indexOf(currentSessionId);
    if (currentIdx >= 0 && sessionsWithExercise[currentIdx + 1]) {
      const prevId = sessionsWithExercise[currentIdx + 1];
      const curr = await exerciseMetricInSession(currentSessionId, exerciseId, trackingType);
      const prev = await exerciseMetricInSession(prevId, exerciseId, trackingType);
      lastSession = makeComparison(curr, prev);
    }
  }

  // 7 days
  const d7from = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const d7prevFrom = format(subDays(new Date(), 13), 'yyyy-MM-dd');
  const d7prevTo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const curr7 = await exerciseMetricInRange(exerciseId, d7from, today, trackingType);
  const prev7 = await exerciseMetricInRange(exerciseId, d7prevFrom, d7prevTo, trackingType);
  const week = makeComparison(curr7, prev7);

  // Month
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const prevMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
  const currMonth = await exerciseMetricInRange(exerciseId, monthStart, today, trackingType);
  const prevMonth = await exerciseMetricInRange(exerciseId, prevMonthStart, prevMonthEnd, trackingType);
  const month = makeComparison(currMonth, prevMonth);

  return { lastSession, week, month };
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

  const muscles = await db.muscles.toArray();
  const exercises = await db.exercises.toArray();
  const result: MuscleVolume[] = [];

  for (const muscle of muscles) {
    let currStrength = 0, prevStrength = 0, currIso = 0, prevIso = 0;

    for (const ex of exercises) {
      if (ex.tracking_type === 'distance_time') continue;
      const isPrimary = ex.primary_muscle_ids.includes(muscle.id!);
      const isSecondary = ex.secondary_muscle_ids.includes(muscle.id!);
      if (!isPrimary && !isSecondary) continue;

      const factor = isPrimary ? 1 : 0.5;
      const currVal = await exerciseMetricInRange(ex.id!, currFrom, today, ex.tracking_type);
      const prevVal = await exerciseMetricInRange(ex.id!, prevFrom, prevTo, ex.tracking_type);

      if (ex.tracking_type === 'time_only') {
        currIso += currVal * factor;
        prevIso += prevVal * factor;
      } else {
        currStrength += currVal * factor;
        prevStrength += prevVal * factor;
      }
    }

    result.push({
      muscleId: muscle.id!,
      muscleName: muscle.name,
      strength: makeComparison(currStrength, prevStrength),
      isometric: makeComparison(currIso, prevIso),
    });
  }

  return result;
}

export interface SessionSummary {
  sessionId: number;
  date: string;
  strengthTotal: number;
  isometricTotal: number;
  cardioTime: number;
  cardioDistance: number;
}

export async function getSessionSummary(sessionId: number): Promise<SessionSummary> {
  const session = await db.sessions.get(sessionId);
  const sesExercises = await db.sessionExercises.where({ session_id: sessionId }).toArray();
  let strengthTotal = 0, isometricTotal = 0, cardioTime = 0, cardioDistance = 0;

  for (const se of sesExercises) {
    const exercise = await db.exercises.get(se.exercise_id);
    if (!exercise) continue;
    const sets = await db.sets.where({ session_exercise_id: se.id! }).toArray();
    const workSets = sets.filter(s => s.set_type === 'work');

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

  return { sessionId, date: session?.date ?? '', strengthTotal, isometricTotal, cardioTime, cardioDistance };
}

export async function getAllSessionSummaries(): Promise<SessionSummary[]> {
  const sessions = await db.sessions.orderBy('date').reverse().toArray();
  return Promise.all(sessions.map(s => getSessionSummary(s.id!)));
}

// ==================== NEW: Exercise History ====================

export interface ExerciseHistoryEntry {
  date: string;
  sessionId: number;
  sets: WorkoutSet[];
  totalMetric: number;
}

export async function getExerciseHistory(exerciseId: number, trackingType: TrackingType): Promise<ExerciseHistoryEntry[]> {
  const allSessions = await db.sessions.orderBy('date').reverse().toArray();
  const results: ExerciseHistoryEntry[] = [];

  for (const session of allSessions) {
    const ses = await db.sessionExercises.where({ session_id: session.id!, exercise_id: exerciseId }).toArray();
    if (!ses.length) continue;
    const allSets = await Promise.all(ses.map(se => db.sets.where({ session_exercise_id: se.id! }).toArray()));
    const flatSets = allSets.flat();
    const workSets = flatSets.filter(s => s.set_type === 'work');
    if (!workSets.length) continue;
    const totalMetric = workSets.reduce((sum, s) => sum + setWorkMetric(s, trackingType), 0);
    results.push({ date: session.date, sessionId: session.id!, sets: workSets, totalMetric });
  }

  return results;
}

export function formatSetSummary(sets: WorkoutSet[], trackingType: TrackingType): string {
  const workSets = sets.filter(s => s.set_type === 'work');
  if (!workSets.length) return '-';

  switch (trackingType) {
    case 'weight_reps': {
      // Group by weight×reps
      const groups = new Map<string, number>();
      workSets.forEach(s => {
        const key = `${s.weight ?? 0}kg×${s.reps ?? 0}`;
        groups.set(key, (groups.get(key) ?? 0) + 1);
      });
      return Array.from(groups.entries()).map(([k, count]) => count > 1 ? `${count}×${k}` : k).join(', ');
    }
    case 'reps_only': {
      const reps = workSets.map(s => s.reps ?? 0);
      return reps.join(', ') + ' reps';
    }
    case 'time_only': {
      const times = workSets.map(s => `${s.duration_seconds ?? 0}s`);
      return times.join(', ');
    }
    case 'distance_time': {
      const entries = workSets.map(s => `${s.distance_meters ?? 0}m/${s.duration_seconds ?? 0}s`);
      return entries.join(', ');
    }
  }
}

// ==================== NEW: Personal Records ====================

export interface PersonalRecord {
  exerciseId: number;
  exerciseName: string;
  trackingType: TrackingType;
  records: { label: string; value: number; unit: string; date: string }[];
}

export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const exercises = await db.exercises.toArray();
  const allSessions = await db.sessions.toArray();
  const sessionDateMap = new Map(allSessions.map(s => [s.id!, s.date]));
  const results: PersonalRecord[] = [];

  for (const ex of exercises) {
    const sesExs = await db.sessionExercises.where({ exercise_id: ex.id! }).toArray();
    if (!sesExs.length) continue;

    const allSets: { set: WorkoutSet; date: string }[] = [];
    for (const se of sesExs) {
      const date = sessionDateMap.get(se.session_id) ?? '';
      const sets = await db.sets.where({ session_exercise_id: se.id! }).toArray();
      sets.filter(s => s.set_type === 'work').forEach(s => allSets.push({ set: s, date }));
    }
    if (!allSets.length) continue;

    const records: { label: string; value: number; unit: string; date: string }[] = [];

    switch (ex.tracking_type) {
      case 'weight_reps': {
        // Max weight
        let maxWeight = { value: 0, date: '' };
        let maxVolume = { value: 0, date: '' };
        for (const { set, date } of allSets) {
          const w = set.weight ?? 0;
          const vol = w * (set.reps ?? 0);
          if (w > maxWeight.value) maxWeight = { value: w, date };
          if (vol > maxVolume.value) maxVolume = { value: vol, date };
        }
        if (maxWeight.value > 0) records.push({ label: 'Peso máx', value: maxWeight.value, unit: 'kg', date: maxWeight.date });
        if (maxVolume.value > 0) records.push({ label: 'Vol. máx serie', value: maxVolume.value, unit: 'kg', date: maxVolume.date });
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
      results.push({ exerciseId: ex.id!, exerciseName: ex.name, trackingType: ex.tracking_type, records });
    }
  }

  return results;
}

// ==================== NEW: Period Summaries ====================

export interface PeriodSummary {
  label: string;
  from: string;
  to: string;
  sessionCount: number;
  strengthTotal: number;
  isometricTotal: number;
  cardioTime: number;
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
    const sessions = await db.sessions.where('date').between(period.from, period.to, true, true).toArray();
    let strengthTotal = 0, isometricTotal = 0, cardioTime = 0;

    for (const session of sessions) {
      const summary = await getSessionSummary(session.id!);
      strengthTotal += summary.strengthTotal;
      isometricTotal += summary.isometricTotal;
      cardioTime += summary.cardioTime;
    }

    results.push({
      label: period.label,
      from: period.from,
      to: period.to,
      sessionCount: sessions.length,
      strengthTotal,
      isometricTotal,
      cardioTime,
    });
  }

  return results;
}
