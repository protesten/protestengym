import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Muscle = Tables<'muscles'>;
export type Exercise = Tables<'exercises'>;
export type PredefinedExercise = Tables<'predefined_exercises'>;
export type Routine = Tables<'routines'>;
export type RoutineExercise = Tables<'routine_exercises'>;
export type Session = Tables<'sessions'>;
export type SessionExercise = Tables<'session_exercises'>;
export type WorkoutSet = Tables<'sets'>;
export type Profile = Tables<'profiles'>;

// Unified exercise type for selectors
export type AnyExercise = {
  id: string;
  name: string;
  tracking_type: string;
  primary_muscle_ids: number[] | null;
  secondary_muscle_ids: number[] | null;
  video_url?: string | null;
  source: 'predefined' | 'personal';
};

// ============ Muscles ============
export async function getMuscles() {
  const { data, error } = await supabase.from('muscles').select('*').eq('is_active', true).order('id');
  if (error) throw error;
  return data;
}

export async function getAllMusclesIncludingInactive() {
  const { data, error } = await supabase.from('muscles').select('*').order('id');
  if (error) throw error;
  return data;
}

export async function toggleMuscleActive(id: number, isActive: boolean) {
  const { error } = await supabase.from('muscles').update({ is_active: isActive } as any).eq('id', id);
  if (error) throw error;
}

// ============ Exercises (personal) ============
export async function getExercises() {
  const { data, error } = await supabase.from('exercises').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createExercise(ex: Omit<TablesInsert<'exercises'>, 'user_id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('exercises').insert({ ...ex, user_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateExercise(id: string, ex: TablesUpdate<'exercises'>) {
  const { error } = await supabase.from('exercises').update(ex).eq('id', id);
  if (error) throw error;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

// ============ Predefined Exercises ============
export async function getPredefinedExercises() {
  const { data, error } = await supabase.from('predefined_exercises').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createPredefinedExercise(ex: Omit<TablesInsert<'predefined_exercises'>, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('predefined_exercises').insert(ex).select().single();
  if (error) throw error;
  return data;
}

export async function updatePredefinedExercise(id: string, ex: TablesUpdate<'predefined_exercises'>) {
  const { error } = await supabase.from('predefined_exercises').update(ex).eq('id', id);
  if (error) throw error;
}

export async function deletePredefinedExercise(id: string) {
  const { error } = await supabase.from('predefined_exercises').delete().eq('id', id);
  if (error) throw error;
}

// ============ All Exercises (combined for selectors) ============
export async function getAllExercises(): Promise<AnyExercise[]> {
  const [personal, predefined] = await Promise.all([getExercises(), getPredefinedExercises()]);
  const result: AnyExercise[] = [
    ...(predefined ?? []).map(e => ({ id: e.id, name: e.name, tracking_type: e.tracking_type, primary_muscle_ids: e.primary_muscle_ids, secondary_muscle_ids: e.secondary_muscle_ids, video_url: (e as any).video_url ?? null, source: 'predefined' as const })),
    ...(personal ?? []).map(e => ({ id: e.id, name: e.name, tracking_type: e.tracking_type, primary_muscle_ids: e.primary_muscle_ids, secondary_muscle_ids: e.secondary_muscle_ids, video_url: (e as any).video_url ?? null, source: 'personal' as const })),
  ];
  return result;
}

// ============ Admin ============
export async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin');
  return (data?.length ?? 0) > 0;
}

// ============ Routines ============
export async function getRoutines() {
  const { data, error } = await supabase.from('routines').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createRoutine(name: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('routines').insert({ name, user_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRoutine(id: string, name: string) {
  const { error } = await supabase.from('routines').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteRoutine(id: string) {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

// ============ Routine Exercises ============
export async function getRoutineExercises(routineId: string) {
  const { data, error } = await supabase.from('routine_exercises').select('*').eq('routine_id', routineId).order('order_index');
  if (error) throw error;
  return data;
}

export async function addRoutineExercise(routineId: string, exerciseId: string, orderIndex: number, plannedSets?: any[]) {
  const { error } = await supabase.from('routine_exercises').insert({
    routine_id: routineId,
    exercise_id: exerciseId,
    order_index: orderIndex,
    ...(plannedSets !== undefined ? { planned_sets: plannedSets } : {}),
  } as any);
  if (error) throw error;
}

export async function deleteRoutineExercise(id: string) {
  const { error } = await supabase.from('routine_exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function updateRoutineExercise(id: string, data: TablesUpdate<'routine_exercises'>) {
  const { error } = await supabase.from('routine_exercises').update(data).eq('id', id);
  if (error) throw error;
}

// ============ Sessions ============
export async function getSessions() {
  const { data, error } = await supabase.from('sessions').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSession(id: string) {
  const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createSession(session: Omit<TablesInsert<'sessions'>, 'user_id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('sessions').insert({ ...session, user_id: user.id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSession(id: string, data: TablesUpdate<'sessions'>) {
  const { error } = await supabase.from('sessions').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
}

// ============ Session Exercises ============
export async function getSessionExercises(sessionId: string) {
  const { data, error } = await supabase.from('session_exercises').select('*').eq('session_id', sessionId).order('order_index');
  if (error) throw error;
  return data;
}

export async function addSessionExercise(sessionId: string, exerciseId: string, orderIndex: number) {
  const { data, error } = await supabase.from('session_exercises').insert({ session_id: sessionId, exercise_id: exerciseId, order_index: orderIndex }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSessionExercise(id: string) {
  const { error } = await supabase.from('session_exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function updateSessionExercise(id: string, data: TablesUpdate<'session_exercises'>) {
  const { error } = await supabase.from('session_exercises').update(data).eq('id', id);
  if (error) throw error;
}

// ============ Sets ============
export async function getSets(sessionExerciseId: string) {
  const { data, error } = await supabase.from('sets').select('*').eq('session_exercise_id', sessionExerciseId).order('created_at');
  if (error) throw error;
  return data;
}

export async function getSetsBySession(sessionId: string) {
  // Get all sets for all exercises in a session
  const { data: ses } = await supabase.from('session_exercises').select('id').eq('session_id', sessionId);
  if (!ses?.length) return [];
  const seIds = ses.map(se => se.id);
  const { data, error } = await supabase.from('sets').select('*').in('session_exercise_id', seIds).order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function createSet(sessionExerciseId: string, setType: string = 'work', rpe?: number | null) {
  const { data, error } = await supabase.from('sets').insert({
    session_exercise_id: sessionExerciseId,
    set_type: setType as any,
    ...(rpe != null ? { rpe } : {}),
  } as any).select().single();
  if (error) throw error;
  return data;
}

export async function updateSet(id: string, data: TablesUpdate<'sets'>) {
  const { error } = await supabase.from('sets').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteSet(id: string) {
  const { error } = await supabase.from('sets').delete().eq('id', id);
  if (error) throw error;
}

// ============ Previous Session Data (for reference) ============
export type PreviousSessionData = { sets: WorkoutSet[]; date: string | null };

export async function getPreviousSetsForExercise(exerciseId: string, currentSessionId: string): Promise<PreviousSessionData> {
  // Fetch all session_exercises for this exercise with their session date, excluding current
  const { data: ses, error: seErr } = await supabase
    .from('session_exercises')
    .select('id, session_id, sessions!inner(date)')
    .eq('exercise_id', exerciseId)
    .neq('session_id', currentSessionId);
  if (seErr || !ses?.length) return { sets: [], date: null };
  // Sort client-side by session date descending
  const sorted = ses.sort((a, b) => {
    const dateA = (a as any).sessions?.date ?? '';
    const dateB = (b as any).sessions?.date ?? '';
    return dateB.localeCompare(dateA);
  });
  const latest = sorted[0];
  const seId = latest.id;
  const sessionDate = (latest as any).sessions?.date ?? null;
  const { data: sets, error } = await supabase.from('sets').select('*').eq('session_exercise_id', seId).order('created_at');
  if (error) return { sets: [], date: sessionDate };
  return { sets: sets ?? [], date: sessionDate };
}

// ============ Weight History (for suggestions) ============
export async function getWeightHistoryForExercise(exerciseId: string, limit = 5): Promise<{ weight: number; reps: number; date: string }[]> {
  const { data: ses, error: seErr } = await supabase
    .from('session_exercises')
    .select('id, sessions!inner(date)')
    .eq('exercise_id', exerciseId);
  if (seErr || !ses?.length) return [];
  const sorted = ses.sort((a, b) => {
    const dateA = (a as any).sessions?.date ?? '';
    const dateB = (b as any).sessions?.date ?? '';
    return dateB.localeCompare(dateA);
  });
  const recentSeIds = sorted.slice(0, limit).map(s => s.id);
  const { data: sets } = await supabase
    .from('sets')
    .select('weight, reps, session_exercise_id')
    .in('session_exercise_id', recentSeIds)
    .eq('set_type', 'work')
    .not('weight', 'is', null);
  if (!sets?.length) return [];
  const seIdToDate = new Map(sorted.map(s => [s.id, (s as any).sessions?.date ?? '']));
  return sets
    .filter(s => s.weight != null && s.reps != null)
    .map(s => ({ weight: s.weight!, reps: s.reps!, date: seIdToDate.get(s.session_exercise_id) ?? '' }));
}

// ============ Best 1RM for exercise ============
export async function getBest1RMForExercise(exerciseId: string): Promise<{ oneRM: number; weight: number; reps: number } | null> {
  const { data: ses } = await supabase
    .from('session_exercises')
    .select('id')
    .eq('exercise_id', exerciseId);
  if (!ses?.length) return null;
  const seIds = ses.map(s => s.id);
  const { data: sets } = await supabase
    .from('sets')
    .select('weight, reps')
    .in('session_exercise_id', seIds)
    .eq('set_type', 'work')
    .not('weight', 'is', null)
    .not('reps', 'is', null);
  if (!sets?.length) return null;
  let best = { oneRM: 0, weight: 0, reps: 0 };
  for (const s of sets) {
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    if (w <= 0 || r <= 0) continue;
    const rm = r === 1 ? w : w * (1 + r / 30);
    if (rm > best.oneRM) best = { oneRM: Math.round(rm * 10) / 10, weight: w, reps: r };
  }
  return best.oneRM > 0 ? best : null;
}

// ============ Latest body weight ============
export async function getLatestBodyWeight(): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('body_measurements')
    .select('weight_kg')
    .eq('user_id', user.id)
    .not('weight_kg', 'is', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg ?? null;
}

// ============ Routine training goal ============
export async function getRoutineTrainingGoal(routineId: string): Promise<string | null> {
  const { data } = await supabase.from('routines').select('training_goal').eq('id', routineId).maybeSingle();
  return (data as any)?.training_goal ?? null;
}

export async function updateRoutineTrainingGoal(routineId: string, goal: string | null) {
  const { error } = await supabase.from('routines').update({ training_goal: goal } as any).eq('id', routineId);
  if (error) throw error;
}

// ============ Profile ============
export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(data: TablesUpdate<'profiles'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('profiles').update(data).eq('user_id', user.id);
  if (error) throw error;
}

// ============ Admin: User Approval ============
export async function getPendingUsers() {
  const { data, error } = await (supabase
    .from('profiles')
    .select('*') as any)
    .eq('is_approved', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function approveUser(profileId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_approved: true } as any)
    .eq('id', profileId);
  if (error) throw error;
}
