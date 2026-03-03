import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Muscle = Tables<'muscles'>;
export type Exercise = Tables<'exercises'>;
export type Routine = Tables<'routines'>;
export type RoutineExercise = Tables<'routine_exercises'>;
export type Session = Tables<'sessions'>;
export type SessionExercise = Tables<'session_exercises'>;
export type WorkoutSet = Tables<'sets'>;
export type Profile = Tables<'profiles'>;

// ============ Muscles ============
export async function getMuscles() {
  const { data, error } = await supabase.from('muscles').select('*').order('id');
  if (error) throw error;
  return data;
}

// ============ Exercises ============
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

export async function addRoutineExercise(routineId: string, exerciseId: string, orderIndex: number) {
  const { error } = await supabase.from('routine_exercises').insert({ routine_id: routineId, exercise_id: exerciseId, order_index: orderIndex });
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
  const { data, error } = await supabase.from('sets').select('*').in('session_exercise_id', seIds);
  if (error) throw error;
  return data ?? [];
}

export async function createSet(sessionExerciseId: string, setType: string = 'work') {
  const { data, error } = await supabase.from('sets').insert({ session_exercise_id: sessionExerciseId, set_type: setType as any }).select().single();
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
