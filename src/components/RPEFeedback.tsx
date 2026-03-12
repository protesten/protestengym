import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TRAINING_GOALS, type TrainingGoal, type TrackingType, type SetType } from '@/lib/constants';

interface Props {
  rpe: number | null;
  weight: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  trackingType?: TrackingType;
  setType?: SetType;
  trainingGoal?: TrainingGoal | null;
  className?: string;
}

/** RPE fatigue badge colors */
export function getRPEBadge(rpe: number | null): { label: string; className: string } | null {
  if (rpe == null) return null;
  if (rpe <= 6) return { label: 'Recuperación', className: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]' };
  if (rpe <= 8) return { label: 'Zona Óptima', className: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]' };
  return { label: 'Esfuerzo Máximo', className: 'bg-destructive/15 text-destructive border-destructive/30' };
}

export function RPEBadge({ rpe, className }: { rpe: number | null; className?: string }) {
  const badge = getRPEBadge(rpe);
  if (!badge) return null;
  return (
    <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 h-4 border", badge.className, className)}>
      {badge.label}
    </Badge>
  );
}

export function RPEFeedback({ rpe, weight, reps, durationSeconds, trackingType = 'weight_reps', setType = 'work', trainingGoal, className }: Props) {
  if (rpe == null) return null;

  // For warmup/approach sets — only warn if RPE is too high
  if (setType === 'warmup' || setType === 'approach') {
    if (rpe >= 7) {
      return (
        <p className={cn("text-[10px] font-medium mt-0.5 pl-8 text-[hsl(var(--warning))]", className)}>
          ⚠️ RPE alto para {setType === 'warmup' ? 'calentamiento' : 'aproximación'} — debería ser ≤6
        </p>
      );
    }
    return null;
  }

  const goal = trainingGoal && TRAINING_GOALS[trainingGoal] ? trainingGoal : 'hypertrophy';
  const goalInfo = TRAINING_GOALS[goal];
  const [optLow, optHigh] = goalInfo.optimalRPE;

  let message: string;
  let color: string;

  if (trackingType === 'weight_reps') {
    if (weight == null || weight <= 0) return null;
    if (rpe < optLow) {
      const pctIncrease = rpe <= optLow - 2 ? 0.05 : 0.025;
      const suggested = Math.round(weight * (1 + pctIncrease) * 2) / 2;
      message = `RPE bajo para ${goalInfo.label}. Sube a ~${suggested}kg (+${Math.round(pctIncrease * 100)}%)`;
      color = 'text-[hsl(var(--success))]';
    } else if (rpe <= optHigh) {
      message = `✓ Zona óptima para ${goalInfo.label} (RPE ${optLow}-${optHigh})`;
      color = 'text-[hsl(var(--warning))]';
    } else {
      message = `RPE alto para ${goalInfo.label}. Mantén peso hasta dominar técnica`;
      color = 'text-destructive';
    }
  } else if (trackingType === 'reps_only') {
    if (reps == null) return null;
    if (rpe < optLow) {
      message = `RPE bajo — aumenta reps o dificultad (${goalInfo.label}: RPE ${optLow}-${optHigh})`;
      color = 'text-[hsl(var(--success))]';
    } else if (rpe <= optHigh) {
      message = `✓ Zona óptima para ${goalInfo.label}`;
      color = 'text-[hsl(var(--warning))]';
    } else {
      message = `RPE alto — reduce reps o facilita la variante`;
      color = 'text-destructive';
    }
  } else if (trackingType === 'time_only') {
    if (durationSeconds == null) return null;
    if (rpe < optLow) {
      message = `RPE bajo — aumenta duración o intensidad`;
      color = 'text-[hsl(var(--success))]';
    } else if (rpe <= optHigh) {
      message = `✓ Duración óptima para ${goalInfo.label}`;
      color = 'text-[hsl(var(--warning))]';
    } else {
      message = `RPE alto — reduce duración o baja intensidad`;
      color = 'text-destructive';
    }
  } else {
    // distance_time
    if (rpe < optLow) {
      message = `RPE bajo — aumenta distancia o ritmo`;
      color = 'text-[hsl(var(--success))]';
    } else if (rpe <= optHigh) {
      message = `✓ Zona óptima para ${goalInfo.label}`;
      color = 'text-[hsl(var(--warning))]';
    } else {
      message = `RPE alto — reduce distancia o baja ritmo`;
      color = 'text-destructive';
    }
  }

  return (
    <p className={cn("text-[10px] font-medium mt-0.5 pl-8", color, className)}>
      {message}
    </p>
  );
}
