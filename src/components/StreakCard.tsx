import { useState, useEffect, useMemo } from 'react';
import { subDays, format, startOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStreakData, type StreakData } from '@/db/calculations';
import { Flame, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

function intensityColor(count: number): string {
  if (count === 0) return 'bg-secondary/50';
  if (count === 1) return 'bg-primary/30';
  if (count === 2) return 'bg-primary/60';
  return 'bg-primary';
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function StreakCard() {
  const [data, setData] = useState<StreakData | null>(null);
  useEffect(() => { getStreakData().then(setData); }, []);

  const { days, monthLabels } = useMemo(() => {
    const result: { date: string; count: number; label: string }[] = [];
    const now = new Date();
    // Last 12 weeks (84 days) — aligned to Monday start
    const gridStart = startOfWeek(subWeeks(now, 11), { weekStartsOn: 1 });
    for (let i = 0; i < 84; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = data?.activityMap.get(dateStr) ?? 0;
      result.push({ date: dateStr, count, label: format(d, 'dd/MM') });
    }

    // Month labels for top row
    const months: { label: string; col: number }[] = [];
    let lastMonth = '';
    for (let col = 0; col < 12; col++) {
      const idx = col * 7; // first day of this column
      const d = result[idx];
      if (d) {
        const monthStr = format(new Date(d.date), 'MMM', { locale: es });
        if (monthStr !== lastMonth) {
          months.push({ label: monthStr, col });
          lastMonth = monthStr;
        }
      }
    }

    return { days: result, monthLabels: months };
  }, [data]);

  if (!data) return null;

  const lastSessionText = data.daysSinceLastSession === 0
    ? 'Hoy'
    : data.daysSinceLastSession === 1
    ? 'Ayer'
    : data.daysSinceLastSession === -1
    ? 'Nunca'
    : `Hace ${data.daysSinceLastSession} días`;

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Racha y Consistencia</h3>
      </div>

      {/* Last session */}
      <div className="flex items-center gap-2 text-xs">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Última sesión:</span>
        <span className="font-semibold">{lastSessionText}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center bg-secondary/30 rounded-lg p-2">
          <div className="text-lg font-black text-primary">{data.currentStreak}</div>
          <p className="text-[9px] text-muted-foreground font-medium leading-tight">Racha actual<br />(semanas)</p>
        </div>
        <div className="text-center bg-secondary/30 rounded-lg p-2">
          <div className="text-lg font-black">{data.bestStreak}</div>
          <p className="text-[9px] text-muted-foreground font-medium leading-tight">Mejor racha<br />(semanas)</p>
        </div>
        <div className="text-center bg-secondary/30 rounded-lg p-2">
          <div className="text-lg font-black">{data.sessionsThisMonth}</div>
          <p className="text-[9px] text-muted-foreground font-medium leading-tight">Sesiones<br />este mes</p>
        </div>
        <div className="text-center bg-secondary/30 rounded-lg p-2">
          <div className="text-lg font-black">{data.weeklyAverage}</div>
          <p className="text-[9px] text-muted-foreground font-medium leading-tight">Media<br />semanal</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20">
        <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          La <strong>racha</strong> cuenta semanas consecutivas con al menos 1 sesión. 
          La <strong>media semanal</strong> se calcula sobre las últimas 8 semanas.
        </p>
      </div>

      {/* Activity grid (GitHub-style) */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1 font-semibold">Actividad (últimas 12 semanas)</p>
        
        {/* Month labels */}
        <div className="grid grid-cols-[20px_1fr] gap-0">
          <div /> {/* spacer for day labels */}
          <div className="grid grid-cols-12 gap-[3px] mb-1">
            {Array.from({ length: 12 }, (_, col) => {
              const monthLabel = monthLabels.find(m => m.col === col);
              return (
                <div key={col} className="text-[8px] text-muted-foreground capitalize text-center">
                  {monthLabel?.label ?? ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid with day labels */}
        {Array.from({ length: 7 }, (_, row) => (
          <div key={row} className="grid grid-cols-[20px_1fr] gap-0">
            <div className="text-[8px] text-muted-foreground flex items-center justify-end pr-1 h-full">
              {row % 2 === 0 ? DAY_LABELS[row] : ''}
            </div>
            <div className="grid grid-cols-12 gap-[3px]">
              {Array.from({ length: 12 }, (_, col) => {
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
              })}
            </div>
          </div>
        ))}

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
