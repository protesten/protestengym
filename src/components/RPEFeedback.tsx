import { cn } from '@/lib/utils';

interface Props {
  rpe: number | null;
  weight: number | null;
  className?: string;
}

export function RPEFeedback({ rpe, weight, className }: Props) {
  if (rpe == null || weight == null || weight <= 0) return null;

  let message: string;
  let color: string;

  if (rpe <= 7) {
    const suggested = Math.round(weight * 1.05 * 2) / 2;
    message = `¡Muy fácil! Sube a ~${suggested}kg (+5%)`;
    color = 'text-green-400';
  } else if (rpe <= 9) {
    const suggested = Math.round(weight * 1.02 * 2) / 2;
    message = `Carga óptima. Mantén o sube a ~${suggested}kg`;
    color = 'text-yellow-400';
  } else {
    message = 'Límite alcanzado. Mantén hasta dominar técnica';
    color = 'text-red-400';
  }

  return (
    <p className={cn("text-[10px] font-medium mt-0.5 pl-8", color, className)}>
      {message}
    </p>
  );
}
