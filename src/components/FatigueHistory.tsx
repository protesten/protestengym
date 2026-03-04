import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp } from 'lucide-react';
import { computeFatigue, type SessionData } from '@/lib/fatigue-config';

interface FatigueHistoryProps {
  sessions: SessionData[];
  muscleNames: Map<number, string>;
}

// Muscle group definitions for chart readability
const MUSCLE_GROUPS: { label: string; ids: number[]; color: string }[] = [
  { label: 'Pecho', ids: [1, 2], color: 'hsl(0 80% 60%)' },
  { label: 'Espalda', ids: [3, 4, 5, 6, 7, 8, 9, 10, 11], color: 'hsl(210 80% 60%)' },
  { label: 'Hombros', ids: [13, 14, 15], color: 'hsl(45 90% 55%)' },
  { label: 'Bíceps', ids: [16, 17, 18], color: 'hsl(140 60% 50%)' },
  { label: 'Tríceps', ids: [19, 20, 21], color: 'hsl(280 70% 60%)' },
  { label: 'Cuádriceps', ids: [25, 26, 27, 28], color: 'hsl(25 90% 55%)' },
  { label: 'Isquios', ids: [32, 33, 34], color: 'hsl(340 70% 55%)' },
  { label: 'Glúteos', ids: [29, 30, 31], color: 'hsl(170 60% 45%)' },
  { label: 'Core', ids: [45, 46, 47, 48], color: 'hsl(60 70% 50%)' },
  { label: 'Gemelos', ids: [35, 36, 37], color: 'hsl(200 50% 55%)' },
];

type RangeKey = '7d' | '14d';

function getGroupAvgFatigue(groupIds: number[], fatigueMap: Map<number, number>): number {
  let sum = 0;
  let count = 0;
  for (const id of groupIds) {
    const val = fatigueMap.get(id);
    if (val !== undefined && val > 0) {
      sum += val;
      count++;
    }
  }
  return count > 0 ? Math.round(sum / count) : 0;
}

export function FatigueHistory({ sessions, muscleNames }: FatigueHistoryProps) {
  const [range, setRange] = useState<RangeKey>('7d');
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setHiddenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const chartData = useMemo(() => {
    const days = range === '7d' ? 7 : 14;
    const now = new Date();
    const data: Record<string, any>[] = [];

    for (let d = days; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(23, 59, 59, 999);
      const asOf = date.getTime();

      const fatigueMap = computeFatigue(sessions, asOf);

      const point: Record<string, any> = {
        date: date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      };

      for (const group of MUSCLE_GROUPS) {
        point[group.label] = getGroupAvgFatigue(group.ids, fatigueMap);
      }

      data.push(point);
    }

    return data;
  }, [sessions, range]);

  // Find which groups have any data > 0 across all days
  const activeGroups = useMemo(() => {
    return MUSCLE_GROUPS.filter(g =>
      chartData.some(d => (d[g.label] as number) > 0)
    );
  }, [chartData]);

  if (activeGroups.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Historial de Fatiga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay datos suficientes para mostrar el historial.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Historial de Fatiga
          </CardTitle>
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <TabsList className="h-7">
              <TabsTrigger value="7d" className="text-xs px-2 h-5">7 días</TabsTrigger>
              <TabsTrigger value="14d" className="text-xs px-2 h-5">14 días</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number) => [`${value}%`]}
              />
              {activeGroups.map((group) => (
                <Line
                  key={group.label}
                  type="monotone"
                  dataKey={group.label}
                  stroke={group.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  hide={hiddenGroups.has(group.label)}
                />
              ))}
              {/* Reference lines for thresholds */}
              <Line dataKey={() => 30} stroke="hsl(140 60% 45%)" strokeDasharray="4 4" strokeWidth={1} dot={false} legendType="none" name="" />
              <Line dataKey={() => 60} stroke="hsl(45 90% 50%)" strokeDasharray="4 4" strokeWidth={1} dot={false} legendType="none" name="" />
              <Line dataKey={() => 85} stroke="hsl(0 80% 50%)" strokeDasharray="4 4" strokeWidth={1} dot={false} legendType="none" name="" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive muscle group toggles */}
        <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
          {activeGroups.map((group) => {
            const isHidden = hiddenGroups.has(group.label);
            return (
              <button
                key={group.label}
                onClick={() => toggleGroup(group.label)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-all"
                style={{
                  borderColor: isHidden ? 'hsl(var(--border))' : group.color,
                  backgroundColor: isHidden ? 'transparent' : `${group.color.replace(')', ' / 0.15)')}`,
                  color: isHidden ? 'hsl(var(--muted-foreground))' : group.color,
                  opacity: isHidden ? 0.5 : 1,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isHidden ? 'hsl(var(--muted-foreground))' : group.color }}
                />
                {group.label}
              </button>
            );
          })}
        </div>

        {/* Threshold legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          {[
            { label: 'Seguro', color: 'hsl(140 60% 45%)' },
            { label: 'Moderado', color: 'hsl(45 90% 50%)' },
            { label: 'Crítico', color: 'hsl(0 80% 50%)' },
          ].map(t => (
            <div key={t.label} className="flex items-center gap-1">
              <div className="w-4 h-px border-t border-dashed" style={{ borderColor: t.color }} />
              <span className="text-[9px] text-muted-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
