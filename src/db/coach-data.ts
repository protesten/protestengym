import { supabase } from '@/integrations/supabase/client';
import { format, subDays, differenceInDays, differenceInYears, parseISO } from 'date-fns';
import { computeFatigue, type SessionData } from '@/lib/fatigue-config';

/** Epley 1RM */
function calc1RM(w: number | null | undefined, r: number | null | undefined): number {
  const weight = Number(w);
  const reps = Number(r);
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

// ============ Types ============

export interface ExerciseTrend {
  exerciseId: string;
  exerciseName: string;
  sessionRMs: { date: string; rm: number }[];
  plateau: boolean;
}

export interface MuscleSetsWeekly {
  muscleId: number;
  muscleName: string;
  setsPerWeek: number;
  /** MEV ~10, MAV ~10-20, MRV ~20+ */
  zone: 'below_mev' | 'mev_mav' | 'above_mrv';
}

export interface MuscleFrequencyData {
  muscleId: number;
  muscleName: string;
  timesPerWeek: number;
}

export interface MuscleFatigueData {
  muscleId: number;
  muscleName: string;
  fatiguePct: number;
}

export interface RepDistribution {
  strengthPct: number;   // 1-5 reps
  hypertrophyPct: number; // 6-12 reps
  endurancePct: number;   // 13+ reps
}

export interface IntensityByExercise {
  exerciseName: string;
  avgWeightUsed: number;
  estimated1RM: number;
  intensityPct: number; // avgWeight / 1RM * 100
}

export interface BilateralSymmetry {
  bodyPart: string;
  rightCm: number;
  leftCm: number;
  deltaCm: number;
  alert: boolean; // delta > 2cm
}

export interface Anthropometrics {
  bmi: number | null;
  waistHipRatio: number | null;
  leanMassKg: number | null;
  bodyFatPct: number | null;
}

export interface ActiveProgram {
  name: string;
  currentWeek: number;
  totalWeeks: number;
  goal: string | null;
  isDeloadWeek: boolean;
  deloadWeek: number | null;
}

export interface VolumeTrendWeek {
  weekLabel: string;
  totalSets: number;
  totalVolume: number; // weight * reps
}

export interface ConsistencyData {
  currentStreak: number;
  sessionsPerWeek: number; // avg last 4 weeks
  daysSinceLastSession: number;
}

export interface RecentPR {
  exerciseName: string;
  newRM: number;
  previousRM: number;
  improvementPct: number;
}

export interface ProfileData {
  sex: string | null;
  age: number | null;
  heightCm: number | null;
}

export interface ProgressionRate {
  exerciseName: string;
  pctPerWeek: number; // linear slope as %/week
  dataPoints: number;
}

export interface SessionTonnage {
  date: string;
  tonnage: number; // Σ(weight × reps)
}

export interface ExerciseVariety {
  muscleName: string;
  distinctExercises: number;
}

export interface RPEByExercise {
  exerciseName: string;
  avgRPE: number;
  setCount: number;
}

export interface RelativeStrength {
  exerciseName: string;
  ratio: number; // 1RM / bodyWeight
  rm: number;
}

export interface MeasurementTrends {
  chest: { date: string; cm: number }[];
  arm: { date: string; cm: number }[];
  thigh: { date: string; cm: number }[];
  waist: { date: string; cm: number }[];
}

export interface AvailableRoutine {
  name: string;
  goal: string | null;
}

export interface CoachData {
  exercises: ExerciseTrend[];
  weeklyAvgRPE: number | null;
  last3SessionsAvgRPE: number | null;
  bodyWeight: { date: string; kg: number }[];
  bodyFat: { date: string; pct: number }[];
  // v2 fields
  weeklyMuscleSets: MuscleSetsWeekly[];
  muscleFatigue: MuscleFatigueData[];
  muscleFrequency: MuscleFrequencyData[];
  repDistribution: RepDistribution;
  intensityByExercise: IntensityByExercise[];
  bilateralSymmetry: BilateralSymmetry[];
  anthropometrics: Anthropometrics;
  activeProgram: ActiveProgram | null;
  volumeTrend: VolumeTrendWeek[];
  consistency: ConsistencyData;
  recentPRs: RecentPR[];
  pushPullRatio: number | null;
  profile: ProfileData;
  // v3 fields
  progressionRate: ProgressionRate[];
  sessionTonnage: SessionTonnage[];
  exerciseVariety: ExerciseVariety[];
  programAdherence: number | null; // 0-100%
  trainingDayDistribution: number[]; // [Mon..Sun] counts last 28d
  relativeStrength: RelativeStrength[];
  rpeByExercise: RPEByExercise[];
  recentSessionNotes: string[];
  measurementTrends: MeasurementTrends;
  availableRoutines: AvailableRoutine[];
}

// ============ Push/Pull classification by muscle group ============
// Based on common muscle IDs from the muscles table
const PUSH_MUSCLE_IDS = new Set([1, 2, 3, 4, 5, 6, 13, 16, 17, 18]); // chest, delts anterior/lateral, triceps
const PULL_MUSCLE_IDS = new Set([7, 8, 9, 10, 11, 12, 14, 15, 19, 20, 21, 22, 29]); // back, biceps, rear delts

export async function getCoachData(): Promise<CoachData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // ============ Parallel data fetch ============
  const since90 = format(subDays(new Date(), 90), 'yyyy-MM-dd');
  const since28 = format(subDays(new Date(), 28), 'yyyy-MM-dd');
  const since7 = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  const [
    { data: personal },
    { data: predefined },
    { data: sessions },
    { data: allSessions }, // for consistency/streak
    { data: muscles },
    { data: measurements },
    { data: profile },
    { data: activePrograms },
    { data: routines },
    { data: sessionsWithNotes },
  ] = await Promise.all([
    supabase.from('exercises').select('id, name, tracking_type, primary_muscle_ids, secondary_muscle_ids'),
    supabase.from('predefined_exercises').select('id, name, tracking_type, primary_muscle_ids, secondary_muscle_ids'),
    supabase.from('sessions').select('id, date, routine_id').eq('user_id', user.id).gte('date', since90).order('date', { ascending: false }).limit(50),
    supabase.from('sessions').select('id, date').eq('user_id', user.id).eq('is_completed', true).order('date', { ascending: false }).limit(100),
    supabase.from('muscles').select('id, name, recovery_category, body_region'),
    supabase.from('body_measurements').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
    supabase.from('profiles').select('sex, birth_date, height_cm').eq('user_id', user.id).maybeSingle(),
    supabase.from('programs').select('id, name, weeks, deload_week, start_date, is_active').eq('user_id', user.id).eq('is_active', true).limit(1),
    supabase.from('routines').select('name, training_goal').eq('user_id', user.id).limit(20),
    supabase.from('sessions').select('notes, date').eq('user_id', user.id).not('notes', 'is', null).order('date', { ascending: false }).limit(3),
  ]);

  const allExercises = [
    ...(personal ?? []),
    ...(predefined ?? []).filter(p => !(personal ?? []).find(e => e.id === p.id)),
  ];
  const weightRepsExercises = allExercises.filter(e => e.tracking_type === 'weight_reps');
  const exerciseMap = new Map(allExercises.map(e => [e.id, e]));
  const muscleMap = new Map((muscles ?? []).map(m => [m.id, m]));

  if (!sessions?.length) {
    return emptyCoachData(profile, measurements);
  }

  const sessionIds = sessions.map(s => s.id);
  const sessionDateMap = new Map(sessions.map(s => [s.id, s.date]));

  // Fetch session_exercises and sets in bulk
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

  // ============ 1. Exercise trends (existing) ============
  const exerciseTrends: ExerciseTrend[] = [];
  const exercise1RMMap = new Map<string, number>(); // exerciseId -> best 1RM ever (for intensity calc)
  const exercisePrevBest = new Map<string, number>(); // for PRs

  for (const ex of weightRepsExercises) {
    const relevantSEs = (sesExs ?? []).filter(se => se.exercise_id === ex.id);
    if (!relevantSEs.length) continue;

    const sessionRMMap = new Map<string, number>();
    for (const se of relevantSEs) {
      const sets = (setsBySE.get(se.id) ?? []).filter(s => s.set_type === 'work');
      let bestRM = 0;
      for (const s of sets) {
        const rm = calc1RM(s.weight, s.reps);
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
      .slice(0, 10);

    if (sessionRMs.length >= 1) {
      // Store best 1RM for intensity calc
      const allRMs = sessionRMs.map(s => s.rm);
      const bestEver = Math.max(...allRMs);
      exercise1RMMap.set(ex.id, bestEver);

      // Previous best (excluding last session) for PR detection
      if (sessionRMs.length >= 2) {
        exercisePrevBest.set(ex.id, Math.max(...sessionRMs.slice(1).map(s => s.rm)));
      }
    }

    if (sessionRMs.length < 2) continue;

    let plateau = false;
    if (sessionRMs.length >= 3) {
      const last3 = sessionRMs.slice(0, 3).map(s => s.rm);
      const maxLast3 = Math.max(...last3);
      const older = sessionRMs.slice(3).map(s => s.rm);
      const maxOlder = older.length ? Math.max(...older) : 0;
      plateau = maxLast3 <= maxOlder || (last3[0] <= last3[2] && last3[1] <= last3[2]);
    }

    exerciseTrends.push({ exerciseId: ex.id, exerciseName: ex.name, sessionRMs, plateau });
  }

  // ============ 2. RPE calculations ============
  const recentSessionIds = sessions.filter(s => s.date >= since7).map(s => s.id);
  let rpeSum = 0, rpeCount = 0;
  if (recentSessionIds.length) {
    const recentSEs = (sesExs ?? []).filter(se => recentSessionIds.includes(se.session_id));
    for (const se of recentSEs) {
      for (const s of (setsBySE.get(se.id) ?? [])) {
        if (s.set_type === 'work' && s.rpe != null) { rpeSum += Number(s.rpe); rpeCount++; }
      }
    }
  }

  const last3Sessions = sessions.slice(0, 3);
  const last3Ids = last3Sessions.map(s => s.id);
  let rpe3Sum = 0, rpe3Count = 0;
  if (last3Ids.length) {
    const last3SEs = (sesExs ?? []).filter(se => last3Ids.includes(se.session_id));
    for (const se of last3SEs) {
      for (const s of (setsBySE.get(se.id) ?? [])) {
        if (s.set_type === 'work' && s.rpe != null) { rpe3Sum += Number(s.rpe); rpe3Count++; }
      }
    }
  }

  // ============ 3. Weekly muscle sets (volume landmarks) ============
  const weekSessions = sessions.filter(s => s.date >= since7);
  const weekSessionIds = new Set(weekSessions.map(s => s.id));
  const muscleSetsCount = new Map<number, number>();
  const muscleSessionDates = new Map<number, Set<string>>(); // for frequency (last 28 days)
  let pushSets = 0, pullSets = 0;

  // Also collect rep distribution and intensity data
  let strengthReps = 0, hypertrophyReps = 0, enduranceReps = 0, totalRepSets = 0;
  const exerciseWeightSums = new Map<string, { totalWeight: number; count: number }>();

  const sessions28 = sessions.filter(s => s.date >= since28);
  const sessions28Ids = new Set(sessions28.map(s => s.id));

  for (const se of (sesExs ?? [])) {
    const sessionDate = sessionDateMap.get(se.session_id);
    if (!sessionDate) continue;
    const ex = exerciseMap.get(se.exercise_id);
    if (!ex) continue;

    const workSets = (setsBySE.get(se.id) ?? []).filter(s => s.set_type === 'work');
    if (!workSets.length) continue;

    const primaryIds = (ex.primary_muscle_ids ?? []) as number[];
    const secondaryIds = (ex.secondary_muscle_ids ?? []) as number[];
    const allMuscleIds = [...primaryIds, ...secondaryIds];

    // Muscle frequency (last 28 days)
    if (sessions28Ids.has(se.session_id)) {
      for (const mid of allMuscleIds) {
        const dates = muscleSessionDates.get(mid) ?? new Set<string>();
        dates.add(sessionDate);
        muscleSessionDates.set(mid, dates);
      }
    }

    // Weekly muscle sets count
    if (weekSessionIds.has(se.session_id)) {
      for (const mid of primaryIds) {
        muscleSetsCount.set(mid, (muscleSetsCount.get(mid) ?? 0) + workSets.length);
      }
      for (const mid of secondaryIds) {
        muscleSetsCount.set(mid, (muscleSetsCount.get(mid) ?? 0) + workSets.length * 0.5);
      }

      // Push/Pull ratio
      for (const mid of primaryIds) {
        if (PUSH_MUSCLE_IDS.has(mid)) pushSets += workSets.length;
        if (PULL_MUSCLE_IDS.has(mid)) pullSets += workSets.length;
      }
    }

    // Rep distribution & intensity (all sessions last 28 days)
    if (sessions28Ids.has(se.session_id) && ex.tracking_type === 'weight_reps') {
      for (const s of workSets) {
        const reps = s.reps ?? 0;
        if (reps >= 1 && reps <= 5) strengthReps++;
        else if (reps >= 6 && reps <= 12) hypertrophyReps++;
        else if (reps >= 13) enduranceReps++;
        totalRepSets++;

        if (s.weight && s.weight > 0) {
          const entry = exerciseWeightSums.get(se.exercise_id) ?? { totalWeight: 0, count: 0 };
          entry.totalWeight += Number(s.weight);
          entry.count++;
          exerciseWeightSums.set(se.exercise_id, entry);
        }
      }
    }
  }

  // Build weeklyMuscleSets
  const weeklyMuscleSets: MuscleSetsWeekly[] = [];
  for (const [mid, count] of muscleSetsCount) {
    const m = muscleMap.get(mid);
    if (!m) continue;
    const zone: MuscleSetsWeekly['zone'] = count < 10 ? 'below_mev' : count <= 20 ? 'mev_mav' : 'above_mrv';
    weeklyMuscleSets.push({ muscleId: mid, muscleName: m.name, setsPerWeek: Math.round(count * 10) / 10, zone });
  }

  // Build muscleFrequency (last 4 weeks → avg per week)
  const muscleFrequency: MuscleFrequencyData[] = [];
  for (const [mid, dates] of muscleSessionDates) {
    const m = muscleMap.get(mid);
    if (!m) continue;
    muscleFrequency.push({ muscleId: mid, muscleName: m.name, timesPerWeek: Math.round(dates.size / 4 * 10) / 10 });
  }

  // ============ 4. Muscle fatigue (using computeFatigue) ============
  const fatigueSessionData: SessionData[] = [];
  for (const session of sessions) {
    const sesExsForSession = (sesExs ?? []).filter(se => se.session_id === session.id);
    const exercises: SessionData['exercises'] = [];
    for (const se of sesExsForSession) {
      const ex = exerciseMap.get(se.exercise_id);
      if (!ex) continue;
      const sets = (setsBySE.get(se.id) ?? []).map(s => ({
        weight: s.weight ? Number(s.weight) : null,
        reps: s.reps ? Number(s.reps) : null,
        setType: s.set_type,
      }));
      exercises.push({
        primaryMuscleIds: (ex.primary_muscle_ids ?? []) as number[],
        secondaryMuscleIds: (ex.secondary_muscle_ids ?? []) as number[],
        sets,
      });
    }
    fatigueSessionData.push({ date: session.date, exercises });
  }

  const fatigueMap = computeFatigue(fatigueSessionData);
  const muscleFatigue: MuscleFatigueData[] = [];
  for (const [mid, pct] of fatigueMap) {
    const m = muscleMap.get(mid);
    if (!m) continue;
    muscleFatigue.push({ muscleId: mid, muscleName: m.name, fatiguePct: Math.round(pct) });
  }

  // ============ 5. Rep distribution ============
  const repDistribution: RepDistribution = totalRepSets > 0
    ? {
        strengthPct: Math.round(strengthReps / totalRepSets * 100),
        hypertrophyPct: Math.round(hypertrophyReps / totalRepSets * 100),
        endurancePct: Math.round(enduranceReps / totalRepSets * 100),
      }
    : { strengthPct: 0, hypertrophyPct: 0, endurancePct: 0 };

  // ============ 6. Intensity by exercise ============
  const intensityByExercise: IntensityByExercise[] = [];
  for (const [exId, { totalWeight, count }] of exerciseWeightSums) {
    const ex = exerciseMap.get(exId);
    const rm = exercise1RMMap.get(exId);
    if (!ex || !rm || rm <= 0) continue;
    const avgWeight = totalWeight / count;
    intensityByExercise.push({
      exerciseName: ex.name,
      avgWeightUsed: Math.round(avgWeight * 10) / 10,
      estimated1RM: Math.round(rm * 10) / 10,
      intensityPct: Math.round(avgWeight / rm * 100),
    });
  }

  // ============ 7. Bilateral symmetry ============
  const bilateralSymmetry: BilateralSymmetry[] = [];
  const latestMeasurement = (measurements ?? [])[0];
  if (latestMeasurement) {
    const pairs: [string, string | null | undefined, string | null | undefined][] = [
      ['Bíceps contraído', latestMeasurement.bicep_right_contracted_cm?.toString(), latestMeasurement.bicep_left_contracted_cm?.toString()],
      ['Bíceps relajado', latestMeasurement.bicep_right_relaxed_cm?.toString(), latestMeasurement.bicep_left_relaxed_cm?.toString()],
      ['Muslo contraído', latestMeasurement.thigh_right_contracted_cm?.toString(), latestMeasurement.thigh_left_contracted_cm?.toString()],
      ['Muslo relajado', latestMeasurement.thigh_right_relaxed_cm?.toString(), latestMeasurement.thigh_left_relaxed_cm?.toString()],
      ['Gemelo', latestMeasurement.calf_right_cm?.toString(), latestMeasurement.calf_left_cm?.toString()],
    ];
    for (const [part, r, l] of pairs) {
      const right = Number(r); const left = Number(l);
      if (right > 0 && left > 0) {
        const delta = Math.abs(right - left);
        bilateralSymmetry.push({ bodyPart: part, rightCm: right, leftCm: left, deltaCm: Math.round(delta * 10) / 10, alert: delta > 2 });
      }
    }
  }

  // ============ 8. Anthropometrics ============
  const anthropometrics: Anthropometrics = { bmi: null, waistHipRatio: null, leanMassKg: null, bodyFatPct: null };
  if (latestMeasurement) {
    const heightM = profile?.height_cm ? Number(profile.height_cm) / 100 : null;
    const weightKg = latestMeasurement.weight_kg ? Number(latestMeasurement.weight_kg) : null;
    if (heightM && weightKg) {
      anthropometrics.bmi = Math.round(weightKg / (heightM * heightM) * 10) / 10;
    }
    const waist = latestMeasurement.waist_cm ? Number(latestMeasurement.waist_cm) : null;
    const hip = latestMeasurement.hip_cm ? Number(latestMeasurement.hip_cm) : null;
    if (waist && hip && hip > 0) {
      anthropometrics.waistHipRatio = Math.round(waist / hip * 100) / 100;
    }
    const bf = latestMeasurement.body_fat_pct ? Number(latestMeasurement.body_fat_pct) : null;
    anthropometrics.bodyFatPct = bf;
    if (bf && weightKg) {
      anthropometrics.leanMassKg = Math.round(weightKg * (1 - bf / 100) * 10) / 10;
    }
  }

  // ============ 9. Active program context ============
  let activeProgram: ActiveProgram | null = null;
  if (activePrograms?.length) {
    const prog = activePrograms[0];
    const startDate = prog.start_date ? parseISO(prog.start_date) : new Date();
    const daysSinceStart = differenceInDays(new Date(), startDate);
    const currentWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, prog.weeks);

    // Get goal from program_weeks for current week
    const { data: weekData } = await supabase
      .from('program_weeks')
      .select('training_goal')
      .eq('program_id', prog.id)
      .eq('week_number', currentWeek)
      .maybeSingle();

    activeProgram = {
      name: prog.name,
      currentWeek,
      totalWeeks: prog.weeks,
      goal: weekData?.training_goal ?? null,
      isDeloadWeek: prog.deload_week != null && currentWeek === prog.deload_week,
      deloadWeek: prog.deload_week,
    };
  }

  // ============ 10. Volume trend (last 4 weeks) ============
  const volumeTrend: VolumeTrendWeek[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = format(subDays(new Date(), (w + 1) * 7 - 1), 'yyyy-MM-dd');
    const weekEnd = format(subDays(new Date(), w * 7), 'yyyy-MM-dd');
    const weekSess = sessions.filter(s => s.date >= weekStart && s.date <= weekEnd);
    let totalSets = 0, totalVolume = 0;
    for (const sess of weekSess) {
      const sessExs = (sesExs ?? []).filter(se => se.session_id === sess.id);
      for (const se of sessExs) {
        const workSets = (setsBySE.get(se.id) ?? []).filter(s => s.set_type === 'work');
        totalSets += workSets.length;
        totalVolume += workSets.reduce((sum, s) => sum + (Number(s.weight ?? 0)) * (s.reps ?? 0), 0);
      }
    }
    volumeTrend.push({ weekLabel: `Semana -${w}`, totalSets, totalVolume: Math.round(totalVolume) });
  }

  // ============ 11. Consistency ============
  const completedDates = (allSessions ?? []).map(s => s.date);
  let streak = 0;
  if (completedDates.length) {
    // Count consecutive weeks with at least 1 session
    const now = new Date();
    for (let w = 0; w < 52; w++) {
      const weekStart = format(subDays(now, (w + 1) * 7 - 1), 'yyyy-MM-dd');
      const weekEnd = format(subDays(now, w * 7), 'yyyy-MM-dd');
      if (completedDates.some(d => d >= weekStart && d <= weekEnd)) {
        streak++;
      } else break;
    }
  }

  const sessions28Count = (allSessions ?? []).filter(s => s.date >= since28).length;
  const daysSinceLast = completedDates.length ? differenceInDays(new Date(), parseISO(completedDates[0])) : 999;

  const consistency: ConsistencyData = {
    currentStreak: streak,
    sessionsPerWeek: Math.round(sessions28Count / 4 * 10) / 10,
    daysSinceLastSession: daysSinceLast,
  };

  // ============ 12. Recent PRs ============
  const recentPRs: RecentPR[] = [];
  for (const [exId, prevBest] of exercisePrevBest) {
    const trend = exerciseTrends.find(t => t.exerciseId === exId);
    if (!trend || !trend.sessionRMs.length) continue;
    const latest = trend.sessionRMs[0];
    if (latest.date >= since7 && latest.rm > prevBest) {
      const ex = exerciseMap.get(exId);
      recentPRs.push({
        exerciseName: ex?.name ?? '',
        newRM: latest.rm,
        previousRM: Math.round(prevBest * 10) / 10,
        improvementPct: Math.round((latest.rm - prevBest) / prevBest * 100 * 10) / 10,
      });
    }
  }

  // ============ 13. Push/Pull ratio ============
  const pushPullRatio = pullSets > 0 ? Math.round(pushSets / pullSets * 100) / 100 : null;

  // ============ 14. Profile ============
  const profileData: ProfileData = {
    sex: profile?.sex ?? null,
    age: profile?.birth_date ? differenceInYears(new Date(), parseISO(profile.birth_date)) : null,
    heightCm: profile?.height_cm ? Number(profile.height_cm) : null,
  };

  // ============ Body measurements ============
  const bodyWeight = (measurements ?? [])
    .filter(m => m.weight_kg != null)
    .map(m => ({ date: m.date, kg: Number(m.weight_kg!) }));
  const bodyFat = (measurements ?? [])
    .filter(m => m.body_fat_pct != null)
    .map(m => ({ date: m.date, pct: Number(m.body_fat_pct!) }));

  return {
    exercises: exerciseTrends,
    weeklyAvgRPE: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    last3SessionsAvgRPE: rpe3Count > 0 ? Math.round((rpe3Sum / rpe3Count) * 10) / 10 : null,
    bodyWeight,
    bodyFat,
    weeklyMuscleSets,
    muscleFatigue,
    muscleFrequency,
    repDistribution,
    intensityByExercise,
    bilateralSymmetry,
    anthropometrics,
    activeProgram,
    volumeTrend,
    consistency,
    recentPRs,
    pushPullRatio,
    profile: profileData,
  };
}

function emptyCoachData(profile: any, measurements: any[]): CoachData {
  const latestM = (measurements ?? [])[0];
  return {
    exercises: [],
    weeklyAvgRPE: null,
    last3SessionsAvgRPE: null,
    bodyWeight: (measurements ?? []).filter((m: any) => m.weight_kg).map((m: any) => ({ date: m.date, kg: Number(m.weight_kg) })),
    bodyFat: (measurements ?? []).filter((m: any) => m.body_fat_pct).map((m: any) => ({ date: m.date, pct: Number(m.body_fat_pct) })),
    weeklyMuscleSets: [],
    muscleFatigue: [],
    muscleFrequency: [],
    repDistribution: { strengthPct: 0, hypertrophyPct: 0, endurancePct: 0 },
    intensityByExercise: [],
    bilateralSymmetry: [],
    anthropometrics: { bmi: null, waistHipRatio: null, leanMassKg: null, bodyFatPct: null },
    activeProgram: null,
    volumeTrend: [],
    consistency: { currentStreak: 0, sessionsPerWeek: 0, daysSinceLastSession: 999 },
    recentPRs: [],
    pushPullRatio: null,
    profile: {
      sex: profile?.sex ?? null,
      age: profile?.birth_date ? differenceInYears(new Date(), parseISO(profile.birth_date)) : null,
      heightCm: profile?.height_cm ? Number(profile.height_cm) : null,
    },
  };
}
