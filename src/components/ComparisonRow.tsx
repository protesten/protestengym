import type { Comparison } from '@/db/calculations';

interface Props {
  label: string;
  comparison: Comparison | null;
  unit?: string;
}

export function ComparisonRow({ label, comparison, unit = '' }: Props) {
  if (!comparison) return null;

  const arrowClass = comparison.arrow === '↑' ? 'arrow-up' : comparison.arrow === '↓' ? 'arrow-down' : 'arrow-equal';

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono">{comparison.current}{unit}</span>
        <span className="text-xs text-muted-foreground">vs {comparison.previous}{unit}</span>
        <span className={`text-sm ${arrowClass}`}>
          {comparison.arrow} {comparison.diff > 0 ? '+' : ''}{comparison.diff}{unit}
        </span>
      </div>
    </div>
  );
}
