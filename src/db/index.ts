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

const ALL_MUSCLES = [
  'Pectoral mayor','Pectoral menor',
  'Dorsal ancho','Trapecio superior','Trapecio medio','Trapecio inferior',
  'Deltoides anterior','Deltoides lateral','Deltoides posterior',
  'Bíceps braquial','Braquial anterior','Coracobraquial',
  'Tríceps braquial (cabeza larga)','Tríceps braquial (cabeza lateral)','Tríceps braquial (cabeza medial)',
  'Braquiorradial (Supinador largo)','Extensores del antebrazo','Flexores del antebrazo',
  'Romboides mayor','Romboides menor','Redondo mayor','Redondo menor','Infraespinoso',
  'Erectores espinales',
  'Vasto lateral','Vasto medial','Vasto intermedio','Recto femoral',
  'Glúteo mayor','Glúteo medio','Glúteo menor',
  'Bíceps femoral','Semitendinoso','Semimembranoso',
  'Gastrocnemio lateral (Gemelo)','Gastrocnemio medial (Gemelo)','Sóleo',
  'Aductor mayor','Aductor largo','Aductor corto','Grácil','Pectíneo',
  'Tensor de la fascia lata','Tibial anterior',
  'Recto abdominal','Oblicuo externo','Oblicuo interno','Transverso del abdomen',
  'Serrato anterior',
];

// Mapping from old generic muscles to new detailed ones
const OLD_TO_NEW: Record<string, string> = {
  'Pecho': 'Pectoral mayor',
  'Espalda': 'Dorsal ancho',
  'Hombros': 'Deltoides lateral',
  'Bíceps': 'Bíceps braquial',
  'Tríceps': 'Tríceps braquial (cabeza larga)',
  'Cuádriceps': 'Recto femoral',
  'Isquios': 'Bíceps femoral',
  'Glúteos': 'Glúteo mayor',
  'Gemelos': 'Gastrocnemio lateral (Gemelo)',
  'Core': 'Recto abdominal',
  'Lumbar': 'Erectores espinales',
};

// Seed on first load
db.on('populate', (tx) => {
  const muscleTable = tx.table('muscles');
  ALL_MUSCLES.forEach((name) => muscleTable.add({ name }));
});

// Add missing muscles + migrate old ones for existing users
db.on('ready', async () => {
  const existing = await db.muscles.toArray();
  const existingNames = new Set(existing.map(m => m.name));

  // 1. Add any missing new muscles
  const toAdd = ALL_MUSCLES.filter(n => !existingNames.has(n));
  if (toAdd.length > 0) {
    await db.muscles.bulkAdd(toAdd.map(name => ({ name })));
  }

  // 2. Migrate exercises from old muscles to new, then delete old muscles
  const allMuscles = await db.muscles.toArray();
  const nameToId = new Map(allMuscles.map(m => [m.name, m.id!]));
  const oldMuscles = allMuscles.filter(m => m.name in OLD_TO_NEW);

  if (oldMuscles.length > 0) {
    for (const old of oldMuscles) {
      const newName = OLD_TO_NEW[old.name];
      const newId = nameToId.get(newName);
      if (!newId) continue;

      // Update exercises referencing this old muscle
      const primaryExercises = await db.exercises.where('primary_muscle_id').equals(old.id!).toArray();
      for (const ex of primaryExercises) {
        await db.exercises.update(ex.id!, { primary_muscle_id: newId });
      }
      const allExercises = await db.exercises.toArray();
      for (const ex of allExercises) {
        if (ex.secondary_muscle_id === old.id!) {
          await db.exercises.update(ex.id!, { secondary_muscle_id: newId });
        }
      }

      // Delete old muscle
      await db.muscles.delete(old.id!);
    }
  }
});
