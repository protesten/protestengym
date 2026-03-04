// Recovery rates: fraction of fatigue removed per 24 hours
export type RecoveryCategory = 'fast' | 'medium' | 'slow';

export const RECOVERY_RATES: Record<RecoveryCategory, number> = {
  fast: 0.50,
  medium: 0.33,
  slow: 0.25,
};

// Legacy hardcoded mapping (used as fallback)
export const MUSCLE_RECOVERY: Record<number, RecoveryCategory> = {
  35: 'fast', 36: 'fast', 37: 'fast', 44: 'fast',
  45: 'fast', 46: 'fast', 47: 'fast', 48: 'fast',
  23: 'fast', 24: 'fast', 14: 'fast', 15: 'fast',
  1: 'medium', 2: 'medium', 3: 'medium', 4: 'medium',
  5: 'medium', 6: 'medium', 13: 'medium', 16: 'medium',
  17: 'medium', 18: 'medium', 19: 'medium', 20: 'medium',
  21: 'medium', 22: 'medium', 7: 'medium', 8: 'medium',
  9: 'medium', 10: 'medium', 11: 'medium', 30: 'medium',
  31: 'medium', 43: 'medium', 49: 'medium', 50: 'medium', 51: 'medium',
  29: 'slow', 25: 'slow', 26: 'slow', 27: 'slow', 28: 'slow',
  32: 'slow', 33: 'slow', 34: 'slow', 12: 'slow',
  38: 'slow', 39: 'slow', 40: 'slow', 41: 'slow', 42: 'slow',
};

// Color thresholds
export function fatigueColor(pct: number): string {
  if (pct > 85) return 'hsl(0 80% 50%)';
  if (pct > 60) return 'hsl(25 90% 50%)';
  if (pct > 30) return 'hsl(45 90% 50%)';
  return 'hsl(140 60% 45%)';
}

export function fatigueLevel(pct: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (pct > 85) return 'red';
  if (pct > 60) return 'orange';
  if (pct > 30) return 'yellow';
  return 'green';
}

const REFERENCE_MAX = 5000;

export interface SessionData {
  date: string;
  exercises: {
    primaryMuscleIds: number[];
    secondaryMuscleIds: number[];
    sets: { weight: number | null; reps: number | null; setType: string }[];
  }[];
}

/**
 * Compute fatigue. Accepts an optional dynamic recovery map from DB.
 * Falls back to hardcoded MUSCLE_RECOVERY for unknown IDs.
 */
export function computeFatigue(
  sessions: SessionData[],
  asOfTimestamp?: number,
  dynamicRecovery?: Map<number, RecoveryCategory>,
): Map<number, number> {
  const fatigue = new Map<number, number>();
  const now = asOfTimestamp ?? Date.now();

  const getRecovery = (muscleId: number): RecoveryCategory => {
    return dynamicRecovery?.get(muscleId) ?? MUSCLE_RECOVERY[muscleId] ?? 'medium';
  };

  for (const session of sessions) {
    const sessionTime = new Date(session.date + 'T12:00:00').getTime();
    const hoursAgo = (now - sessionTime) / 3_600_000;
    if (hoursAgo < 0 || hoursAgo > 14 * 24) continue;

    for (const ex of session.exercises) {
      const workSets = ex.sets.filter(s => s.setType === 'work');
      if (workSets.length === 0) continue;

      const totalSets = workSets.length;
      const avgReps = workSets.reduce((a, s) => a + (s.reps ?? 0), 0) / totalSets;
      const avgWeight = workSets.reduce((a, s) => a + (s.weight ?? 0), 0) / totalSets;
      const W = totalSets * avgReps * avgWeight;
      const Wnorm = Math.min(W / REFERENCE_MAX, 1.0) * 50;

      const applyToMuscle = (muscleId: number, multiplier: number) => {
        const cat = getRecovery(muscleId);
        const rate = RECOVERY_RATES[cat];
        const remaining = Wnorm * multiplier * Math.pow(1 - rate, hoursAgo / 24);
        fatigue.set(muscleId, (fatigue.get(muscleId) ?? 0) + remaining);
      };

      for (const id of ex.primaryMuscleIds) applyToMuscle(id, 1.0);
      for (const id of ex.secondaryMuscleIds) applyToMuscle(id, 0.5);
    }
  }

  for (const [id, val] of fatigue) {
    fatigue.set(id, Math.min(val, 100));
  }

  return fatigue;
}

export function estimateRecoveryHours(currentFatigue: number, muscleId: number, dynamicRecovery?: Map<number, RecoveryCategory>): number {
  const cat = dynamicRecovery?.get(muscleId) ?? MUSCLE_RECOVERY[muscleId] ?? 'medium';
  if (currentFatigue <= 30) return 0;
  const rate = RECOVERY_RATES[cat];
  return Math.max(0, Math.ceil(24 * Math.log(30 / currentFatigue) / Math.log(1 - rate)));
}
