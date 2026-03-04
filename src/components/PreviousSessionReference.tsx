import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { History } from 'lucide-react';
import type { WorkoutSet } from '@/lib/api';
import { SET_TYPE_LABELS } from '@/lib/constants';

interface Props {
  sets: WorkoutSet[];
  date: string | null;
  trackingType: string;
}

export function PreviousSessionReference({ sets, date, trackingType }: Props) {
  if (!sets.length) return null;

  const formattedDate = date
    ? format(parseISO(date), "d MMM yyyy", { locale: es })
    : 'Desconocida';

  return (
    <div className="mb-3 rounded-lg bg-muted/40 border border-border/50 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/60">
        <History className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground">
          Sesión anterior: {formattedDate}
        </span>
      </div>
      <div className="px-3 py-1.5 space-y-1">
        {sets.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span className="w-4 text-right opacity-50">{i + 1}</span>
            <span className="text-[10px] opacity-60 w-16 truncate">
              {SET_TYPE_LABELS[s.set_type as keyof typeof SET_TYPE_LABELS] ?? s.set_type}
            </span>
            {(trackingType === 'weight_reps') && (
              <>
                <span>{s.weight ?? '-'}<span className="opacity-50">kg</span></span>
                <span>×</span>
                <span>{s.reps ?? '-'}<span className="opacity-50">r</span></span>
              </>
            )}
            {trackingType === 'reps_only' && (
              <span>{s.reps ?? '-'}<span className="opacity-50">r</span></span>
            )}
            {trackingType === 'time_only' && (
              <span>{s.duration_seconds ?? '-'}<span className="opacity-50">s</span></span>
            )}
            {trackingType === 'distance_time' && (
              <>
                <span>{s.duration_seconds ?? '-'}<span className="opacity-50">s</span></span>
                <span>{s.distance_meters ?? '-'}<span className="opacity-50">m</span></span>
              </>
            )}
            {(s as any).rpe != null && (
              <span className="opacity-60">@{(s as any).rpe}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
