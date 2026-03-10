export type TrackingType = 'weight_reps' | 'reps_only' | 'time_only' | 'distance_time';
export type SetType = 'warmup' | 'approach' | 'work' | 'drop_set' | 'partial';

export const MUSCLE_GROUPS: Record<string, string[]> = {
  'Pecho': ['Pectoral mayor', 'Pectoral menor'],
  'Espalda': ['Dorsal ancho', 'Trapecio superior', 'Trapecio medio', 'Trapecio inferior', 'Romboides mayor', 'Romboides menor', 'Redondo mayor', 'Redondo menor', 'Infraespinoso', 'Erectores espinales', 'Elevador de la escápula'],
  'Hombros': ['Deltoides anterior', 'Deltoides lateral', 'Deltoides posterior', 'Supraespinoso', 'Subescapular', 'Rotadores externos'],
  'Bíceps': ['Bíceps braquial', 'Braquial anterior', 'Coracobraquial'],
  'Tríceps': ['Tríceps braquial (cabeza larga)', 'Tríceps braquial (cabeza lateral)', 'Tríceps braquial (cabeza medial)'],
  'Antebrazos': ['Braquiorradial (Supinador largo)', 'Extensores del antebrazo', 'Flexores del antebrazo', 'Pronador redondo', 'Supinador'],
  'Cuádriceps': ['Vasto lateral', 'Vasto medial', 'Vasto intermedio', 'Recto femoral'],
  'Glúteos': ['Glúteo mayor', 'Glúteo medio', 'Glúteo menor', 'Piriforme', 'Glúteo menor profundo', 'Obturador interno', 'Obturador externo'],
  'Isquiotibiales': ['Bíceps femoral', 'Semitendinoso', 'Semimembranoso'],
  'Gemelos': ['Gastrocnemio lateral (Gemelo)', 'Gastrocnemio medial (Gemelo)', 'Sóleo', 'Plantar delgado'],
  'Aductores': ['Aductor mayor', 'Aductor largo', 'Aductor corto', 'Grácil', 'Pectíneo'],
  'Piernas (otros)': ['Tensor de la fascia lata', 'Tibial anterior', 'Poplíteo', 'Peroneos'],
  'Core': ['Recto abdominal', 'Oblicuo externo', 'Oblicuo interno', 'Transverso del abdomen', 'Serrato anterior', 'Psoas ilíaco', 'Iliopsoas', 'Cuadrado lumbar', 'Diafragma'],
  'Cuello': ['Esternocleidomastoideo', 'Escalenos'],
};

export const TRACKING_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Peso + Reps',
  reps_only: 'Solo Reps',
  time_only: 'Solo Tiempo',
  distance_time: 'Distancia + Tiempo',
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: 'Calentam.',
  approach: 'Aproxim.',
  work: 'Trabajo',
};

export const RPE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type TrainingGoal = 'strength' | 'hypertrophy' | 'endurance';
export const TRAINING_GOALS: Record<TrainingGoal, { label: string; pct: number; reps: string; emoji: string }> = {
  strength: { label: 'Fuerza', pct: 0.85, reps: '3-5', emoji: '🏋️' },
  hypertrophy: { label: 'Hipertrofia', pct: 0.75, reps: '8-12', emoji: '💪' },
  endurance: { label: 'Resistencia', pct: 0.60, reps: '15+', emoji: '🔄' },
};

export const BODYWEIGHT_EXERCISE_PATTERNS = [
  'dominad', 'pull up', 'pullup', 'chin up', 'chinup',
  'flexion', 'push up', 'pushup',
  'fondo', 'dip',
  'muscle up', 'muscleup',
  'pistol',
];

export type PlannedSet = {
  set_type: SetType;
  rpe: number | null;
  min_reps: number | null;
  max_reps: number | null;
  min_time_seconds: number | null;
  max_time_seconds: number | null;
  min_distance_meters: number | null;
  max_distance_meters: number | null;
};

export type WeightUnit = 'kg' | 'lb';
export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 1 / KG_TO_LB;
