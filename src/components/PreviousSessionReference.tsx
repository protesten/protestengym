import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { History } from 'lucide-react';
import type { WorkoutSet } from '@/lib/api';

interface Props {
  sets: WorkoutSet[];
  date: string | null;
  trackingType: string;
}

function formatSet(s: WorkoutSet, trackingType: string): string {
  if (trackingType === 'weight_reps') {
    return `${s.weight ?? '-'}kg×${s.reps ?? '-'}`;
  }
  if (trackingType === 'reps_only') {
    return `${s.reps ?? '-'}r`;
  }
  if (trackingType === 'time_only') {
    return `${s.duration_seconds ?? '-'}s`;
  }
  if (trackingType === 'distance_time') {
    return `${s.duration_seconds ?? '-'}s/${s.distance_meters ?? '-'}m`;
  }
  return '';
}

export function PreviousSessionReference({ sets, date, trackingType }: Props) {
  if (!sets.length) return null;

  const formattedDate = date
    ? format(parseISO(date), "d MMM", { locale: es })
    : '?';

  const summary = sets.map(s => formatSet(s, trackingType)).join(', ');

  return (
    <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] text-muted-foreground overflow-x-auto">
      <History className="h-3 w-3 shrink-0 opacity-60" />
      <span className="font-semibold shrink-0">{formattedDate}:</span>
      <span className="font-mono truncate">{summary}</span>
    </div>
  );
}
