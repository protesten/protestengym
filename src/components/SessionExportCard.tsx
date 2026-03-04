import { forwardRef } from 'react';
import type { WorkoutSet, AnyExercise, SessionExercise } from '@/lib/api';
import { Dumbbell } from 'lucide-react';

interface Props {
  date: string;
  exercises: { name: string; sets: WorkoutSet[]; trackingType: string }[];
  summary: { strengthTotal: number; isometricTotal: number; cardioTime: number };
}

const SessionExportCard = forwardRef<HTMLDivElement, Props>(({ date, exercises, summary }, ref) => {
  return (
    <div ref={ref} className="rounded-2xl bg-card border border-border p-5 space-y-3 min-w-[320px]">
      <div className="flex items-center gap-2">
        <Dumbbell className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Sesión</p>
          <p className="text-lg font-black text-primary">{date}</p>
        </div>
      </div>

      {exercises.map((ex, i) => (
        <div key={i} className="bg-secondary/30 rounded-xl p-3">
          <p className="text-sm font-bold mb-1">{ex.name}</p>
          <div className="space-y-0.5">
            {ex.sets.filter(s => s.set_type === 'work').map((s, j) => (
              <p key={j} className="text-xs text-muted-foreground font-mono">
                {ex.trackingType === 'weight_reps' && `${s.weight ?? 0}kg × ${s.reps ?? 0}`}
                {ex.trackingType === 'reps_only' && `${s.reps ?? 0} reps`}
                {ex.trackingType === 'time_only' && `${s.duration_seconds ?? 0}s`}
                {ex.trackingType === 'distance_time' && `${s.distance_meters ?? 0}m / ${s.duration_seconds ?? 0}s`}
                {s.rpe != null && ` @${s.rpe}`}
              </p>
            ))}
          </div>
        </div>
      ))}

      {summary.strengthTotal > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Volumen total</span>
          <span className="font-mono font-black text-primary">{summary.strengthTotal.toLocaleString()} kg</span>
        </div>
      )}

      <p className="text-center text-[9px] text-muted-foreground/40 font-mono pt-1">GymTracker</p>
    </div>
  );
});

SessionExportCard.displayName = 'SessionExportCard';
export { SessionExportCard };
