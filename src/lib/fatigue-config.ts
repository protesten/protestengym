// Recovery rates: fraction of fatigue removed per 24 hours
export type RecoveryCategory = 'fast' | 'medium' | 'slow';

export const RECOVERY_RATES: Record<RecoveryCategory, number> = {
  fast: 0.50,
  medium: 0.33,
  slow: 0.25,
};

// Muscle ID → recovery category (IDs from DB)
export const MUSCLE_RECOVERY: Record<number, RecoveryCategory> = {
  // FAST (50%/24h)
  35: 'fast', // Gastrocnemio lateral
  36: 'fast', // Gastrocnemio medial
  37: 'fast', // Sóleo
  44: 'fast', // Tibial anterior
  45: 'fast', // Recto abdominal
  46: 'fast', // Oblicuo externo
  47: 'fast', // Oblicuo interno
  48: 'fast', // Transverso del abdomen
  23: 'fast', // Extensores del antebrazo
  24: 'fast', // Flexores del antebrazo
  14: 'fast', // Deltoides lateral
  15: 'fast', // Deltoides posterior

  // MEDIUM (33%/24h)
  1: 'medium',  // Pectoral mayor
  2: 'medium',  // Pectoral menor
  3: 'medium',  // Dorsal ancho
  4: 'medium',  // Trapecio superior
  5: 'medium',  // Trapecio medio
  6: 'medium',  // Trapecio inferior
  13: 'medium', // Deltoides anterior
  16: 'medium', // Bíceps braquial
  17: 'medium', // Braquial anterior
  18: 'medium', // Coracobraquial
  19: 'medium', // Tríceps (cabeza larga)
  20: 'medium', // Tríceps (cabeza lateral)
  21: 'medium', // Tríceps (cabeza medial)
  22: 'medium', // Braquiorradial
  7: 'medium',  // Romboides mayor
  8: 'medium',  // Romboides menor
  9: 'medium',  // Redondo mayor
  10: 'medium', // Redondo menor
  11: 'medium', // Infraespinoso
  30: 'medium', // Glúteo medio
  31: 'medium', // Glúteo menor
  43: 'medium', // Tensor de la fascia lata
  49: 'medium', // Serrato anterior

  // SLOW (25%/24h)
  29: 'slow', // Glúteo mayor
  25: 'slow', // Vasto lateral
  26: 'slow', // Vasto medial
  27: 'slow', // Vasto intermedio
  28: 'slow', // Recto femoral
  32: 'slow', // Bíceps femoral
  33: 'slow', // Semitendinoso
  34: 'slow', // Semimembranoso
  12: 'slow', // Erectores espinales
  38: 'slow', // Aductor mayor
  39: 'slow', // Aductor largo
  40: 'slow', // Aductor corto
  41: 'slow', // Grácil
  42: 'slow', // Pectíneo
};

// Extra muscles not in the spec but in the DB — default to medium
const EXTRA_MUSCLES = [50, 51]; // Psoas ilíaco, Rotadores externos
EXTRA_MUSCLES.forEach(id => { MUSCLE_RECOVERY[id] = 'medium'; });

// Color thresholds
export function fatigueColor(pct: number): string {
  if (pct > 85) return 'hsl(0 80% 50%)';     // red
  if (pct > 60) return 'hsl(25 90% 50%)';     // orange
  if (pct > 30) return 'hsl(45 90% 50%)';     // yellow
  return 'hsl(140 60% 45%)';                   // green
}

export function fatigueLevel(pct: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (pct > 85) return 'red';
  if (pct > 60) return 'orange';
  if (pct > 30) return 'yellow';
  return 'green';
}

// Reference max for normalization — a heavy compound session contribution
const REFERENCE_MAX = 5000; // e.g. 5 sets × 10 reps × 100 kg

export interface SessionData {
  date: string; // ISO date
  exercises: {
    primaryMuscleIds: number[];
    secondaryMuscleIds: number[];
    sets: { weight: number | null; reps: number | null; setType: string }[];
  }[];
}

export function computeFatigue(sessions: SessionData[], asOfTimestamp?: number): Map<number, number> {
  const fatigue = new Map<number, number>();
  const now = asOfTimestamp ?? Date.now();
  for (const session of sessions) {
    const sessionTime = new Date(session.date + 'T12:00:00').getTime();
    const hoursAgo = (now - sessionTime) / 3_600_000;
    if (hoursAgo < 0 || hoursAgo > 14 * 24) continue;

    for (const ex of session.exercises) {
      // Only work sets
      const workSets = ex.sets.filter(s => s.setType === 'work');
      if (workSets.length === 0) continue;

      const totalSets = workSets.length;
      const avgReps = workSets.reduce((a, s) => a + (s.reps ?? 0), 0) / totalSets;
      const avgWeight = workSets.reduce((a, s) => a + (s.weight ?? 0), 0) / totalSets;
      const W = totalSets * avgReps * avgWeight;
      const Wnorm = Math.min(W / REFERENCE_MAX, 1.0) * 50;

      const applyToMuscle = (muscleId: number, multiplier: number) => {
        const cat = MUSCLE_RECOVERY[muscleId];
        if (!cat) return;
        const rate = RECOVERY_RATES[cat];
        const remaining = Wnorm * multiplier * Math.pow(1 - rate, hoursAgo / 24);
        fatigue.set(muscleId, (fatigue.get(muscleId) ?? 0) + remaining);
      };

      for (const id of ex.primaryMuscleIds) applyToMuscle(id, 1.0);
      for (const id of ex.secondaryMuscleIds) applyToMuscle(id, 0.5);
    }
  }

  // Cap at 100
  for (const [id, val] of fatigue) {
    fatigue.set(id, Math.min(val, 100));
  }

  return fatigue;
}

// Estimate hours until fatigue drops below 30%
export function estimateRecoveryHours(currentFatigue: number, muscleId: number): number {
  const cat = MUSCLE_RECOVERY[muscleId];
  if (!cat || currentFatigue <= 30) return 0;
  const rate = RECOVERY_RATES[cat];
  // currentFatigue * (1 - rate)^(h/24) = 30
  // h = 24 * ln(30/currentFatigue) / ln(1-rate)
  return Math.max(0, Math.ceil(24 * Math.log(30 / currentFatigue) / Math.log(1 - rate)));
}
