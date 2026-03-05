import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
  rpe: number | null;
  weight: number | null;
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

export function RPEFeedback({ rpe, weight, className }: Props) {
  if (rpe == null || weight == null || weight <= 0) return null;

  let message: string;
  let color: string;

  if (rpe <= 7) {
    const suggested = Math.round(weight * 1.05 * 2) / 2;
    message = `¡Muy fácil! Sube a ~${suggested}kg (+5%)`;
    color = 'text-[hsl(var(--success))]';
  } else if (rpe <= 9) {
    const suggested = Math.round(weight * 1.02 * 2) / 2;
    message = `Carga óptima. Mantén o sube a ~${suggested}kg`;
    color = 'text-[hsl(var(--warning))]';
  } else {
    message = 'Límite alcanzado. Mantén hasta dominar técnica';
    color = 'text-destructive';
  }

  return (
    <p className={cn("text-[10px] font-medium mt-0.5 pl-8", color, className)}>
      {message}
    </p>
  );
}
