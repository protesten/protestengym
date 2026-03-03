import { useState, useEffect, useMemo } from 'react';
import { subDays, format } from 'date-fns';
import { getStreakData, type StreakData } from '@/db/calculations';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function intensityColor(count: number): string {
  if (count === 0) return 'bg-secondary/50';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/60';
  return 'bg-primary';
}

export function StreakCard() {
  const [data, setData] = useState<StreakData | null>(null);
  useEffect(() => { getStreakData().then(setData); }, []);

  const days = useMemo(() => {
    const result: { date: string; count: number; label: string }[] = [];
    const now = new Date();
    // Last 12 weeks (84 days)
    for (let i = 83; i >= 0; i--) {
      const d = subDays(now, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = data?.activityMap.get(dateStr) ?? 0;
      result.push({ date: dateStr, count, label: format(d, 'dd/MM') });
    }
    return result;
  }, [data]);

  if (!data) return null;

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Racha y Consistencia</h3>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-lg font-black text-primary">{data.currentStreak}</div>
          <p className="text-[9px] text-muted-foreground font-medium">Racha sem.</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-black">{data.bestStreak}</div>
          <p className="text-[9px] text-muted-foreground font-medium">Mejor racha</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-black">{data.sessionsThisMonth}</div>
          <p className="text-[9px] text-muted-foreground font-medium">Este mes</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-black">{data.weeklyAverage}</div>
          <p className="text-[9px] text-muted-foreground font-medium">Media/sem</p>
        </div>
      </div>

      {/* Activity grid (GitHub-style) */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1.5">Últimas 12 semanas</p>
        <div className="grid grid-cols-12 gap-[3px]">
          {/* Render 84 days as 12 columns × 7 rows */}
          {Array.from({ length: 7 }, (_, row) =>
            Array.from({ length: 12 }, (_, col) => {
              const idx = col * 7 + row;
              const day = days[idx];
              if (!day) return <div key={`${row}-${col}`} className="w-full aspect-square rounded-[2px]" />;
              return (
                <div
                  key={day.date}
                  className={cn("w-full aspect-square rounded-[2px] transition-colors", intensityColor(day.count))}
                  title={`${day.label}: ${day.count} sesión(es)`}
                />
              );
            })
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 justify-end">
          <span className="text-[9px] text-muted-foreground">Menos</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-secondary/50" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/30" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary/60" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-primary" />
          <span className="text-[9px] text-muted-foreground">Más</span>
        </div>
      </div>
    </div>
  );
}
