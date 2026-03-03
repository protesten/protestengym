import Dexie, { type Table } from 'dexie';

export type TrackingType = 'weight_reps' | 'reps_only' | 'time_only' | 'distance_time';
export type SetType = 'warmup' | 'approach' | 'work';

export interface Muscle {
  id?: number;
  name: string;
}

export interface Exercise {
  id?: number;
  name: string;
  tracking_type: TrackingType;
  primary_muscle_id: number;
  secondary_muscle_id?: number;
}

export interface Routine {
  id?: number;
  name: string;
}

export interface RoutineExercise {
  id?: number;
  routine_id: number;
  exercise_id: number;
  order_index: number;
}

export interface WorkoutSession {
  id?: number;
  date: string; // YYYY-MM-DD
  routine_id?: number;
  notes?: string;
}

export interface SessionExercise {
  id?: number;
  session_id: number;
  exercise_id: number;
  order_index: number;
}

export interface WorkoutSet {
  id?: number;
  session_exercise_id: number;
  set_type: SetType;
  weight?: number;
  reps?: number;
  duration_seconds?: number;
  distance_meters?: number;
}

class WorkoutDB extends Dexie {
  muscles!: Table<Muscle, number>;
  exercises!: Table<Exercise, number>;
  routines!: Table<Routine, number>;
  routineExercises!: Table<RoutineExercise, number>;
  sessions!: Table<WorkoutSession, number>;
  sessionExercises!: Table<SessionExercise, number>;
  sets!: Table<WorkoutSet, number>;

  constructor() {
    super('WorkoutDB');
    this.version(1).stores({
      muscles: '++id, &name',
      exercises: '++id, name, tracking_type, primary_muscle_id',
      routines: '++id, name',
      routineExercises: '++id, routine_id, exercise_id',
      sessions: '++id, date, routine_id',
      sessionExercises: '++id, session_id, exercise_id',
      sets: '++id, session_exercise_id',
    });
  }
}

export const db = new WorkoutDB();

// Seed muscles on first load
const SEED_MUSCLES = [
  'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
  'Cuádriceps', 'Isquios', 'Glúteos', 'Gemelos', 'Core', 'Lumbar',
];

db.on('populate', (tx) => {
  const muscleTable = tx.table('muscles');
  SEED_MUSCLES.forEach((name) => {
    muscleTable.add({ name });
  });
});
