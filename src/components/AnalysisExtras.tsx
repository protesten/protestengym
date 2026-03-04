import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllExercises } from '@/lib/api';
import { getWeeklyMuscleSets, getAll1RMs, get1RMHistory, type WeeklyMuscleSets, type ExerciseRM, type RM1History, type DateRange } from '@/db/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Target, TrendingUp, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

function setsColor(sets: number): string {
  if (sets < 10) return 'bg-red-500';
  if (sets <= 15) return 'bg-yellow-500';
  if (sets <= 20) return 'bg-green-500';
  return 'bg-orange-500';
}

function setsColorText(sets: number): string {
  if (sets < 10) return 'text-red-400';
  if (sets <= 15) return 'text-yellow-400';
  if (sets <= 20) return 'text-green-400';
  return 'text-orange-400';
}

interface VolumeProps {
  dateRange?: DateRange;
}

export function WeeklyMuscleVolume({ dateRange }: VolumeProps) {
  const [data, setData] = useState<WeeklyMuscleSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeksBack, setWeeksBack] = useState(0);
  const [prevData, setPrevData] = useState<WeeklyMuscleSets[]>([]);

  const hasCustomRange = !!dateRange;

  useEffect(() => {
    setLoading(true);
    if (hasCustomRange) {
      getWeeklyMuscleSets(0, dateRange).then(setData).finally(() => setLoading(false));
      setPrevData([]);
    } else {
      Promise.all([
        getWeeklyMuscleSets(weeksBack).then(setData),
        getWeeklyMuscleSets(weeksBack + 1).then(setPrevData),
      ]).finally(() => setLoading(false));
    }
  }, [weeksBack, dateRange]);

  const target = 15;
  const weekLabel = hasCustomRange
    ? `${dateRange!.from} → ${dateRange!.to}`
    : weeksBack === 0 ? 'Esta semana' : weeksBack === 1 ? 'Semana pasada' : `Hace ${weeksBack} semanas`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Series por Músculo</h3>
        </div>
        {!hasCustomRange && (
          <div className="flex items-center gap-1">
            <button onClick={() => setWeeksBack(w => w + 1)} className="p-1 rounded-md hover:bg-secondary transition-colors">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="text-xs text-muted-foreground font-medium min-w-[100px] text-center">{weekLabel}</span>
            <button onClick={() => setWeeksBack(w => Math.max(0, w - 1))} disabled={weeksBack === 0} className="p-1 rounded-md hover:bg-secondary transition-colors disabled:opacity-30">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {hasCustomRange && (
        <p className="text-[10px] text-muted-foreground">Período: {weekLabel}</p>
      )}

      {/* Explanation */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border">
        <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Series de trabajo por grupo muscular. <span className="text-green-400 font-semibold">10-20 series/semana</span> es el rango óptimo para hipertrofia. 
          Primarios cuentan 100%, secundarios 50%.
        </p>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">Sin datos en este período</p>
      ) : (
        <div className="space-y-1.5">
          {data.map(m => {
            const prev = prevData.find(p => p.muscleId === m.muscleId);
            const diff = prev ? m.workingSets - prev.workingSets : 0;
            return (
              <div key={m.muscleId} className="p-2.5 rounded-xl bg-card border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold">{m.muscleName}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-xs font-mono font-bold", setsColorText(m.workingSets))}>{m.workingSets}</span>
                    {prev && diff !== 0 && (
                      <span className={cn("text-[10px] font-mono", diff > 0 ? 'text-green-400' : 'text-red-400')}>
                        {diff > 0 ? '+' : ''}{Math.round(diff * 10) / 10}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", setsColor(m.workingSets))}
                    style={{ width: `${Math.min((m.workingSets / target) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground justify-center flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />&lt;10</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />10-15</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />15-20</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />&gt;20</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface OneRMProps {
  dateRange?: DateRange;
}

export function OneRMPanel({ dateRange }: OneRMProps) {
  const { data: exercises } = useQuery({ queryKey: ['allExercises'], queryFn: getAllExercises });
  const [rms, setRMs] = useState<ExerciseRM[]>([]);
  const [loadingRMs, setLoadingRMs] = useState(true);
  const [selectedExId, setSelectedExId] = useState('');
  const [rmHistory, setRmHistory] = useState<RM1History[]>([]);

  useEffect(() => { setLoadingRMs(true); getAll1RMs(dateRange).then(setRMs).finally(() => setLoadingRMs(false)); }, [dateRange]);
  useEffect(() => {
    if (selectedExId) get1RMHistory(selectedExId, dateRange).then(setRmHistory);
    else setRmHistory([]);
  }, [selectedExId, dateRange]);

  const chartData = rmHistory.map(h => ({ date: h.date.slice(5), value: h.estimated1RM }));
  const weightRepsExercises = exercises?.filter(e => e.tracking_type === 'weight_reps') ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Estimación 1RM (Epley)</h3>
      </div>

      {loadingRMs ? (
        <div className="space-y-1.5">
          {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : rms.length > 0 && (
        <div className="space-y-1.5">
          {rms.map(rm => (
            <div key={rm.exerciseId} className="flex justify-between items-center p-2.5 rounded-xl bg-card border border-border">
              <div>
                <span className="text-xs font-semibold">{rm.exerciseName}</span>
                <p className="text-[10px] text-muted-foreground">{rm.weight}kg × {rm.reps} · {rm.date}</p>
              </div>
              <span className="text-sm font-mono font-black text-primary">{rm.estimated1RM} kg</span>
            </div>
          ))}
        </div>
      )}
      {/* 1RM Evolution Chart */}
      <Select value={selectedExId} onValueChange={setSelectedExId}>
        <SelectTrigger className="rounded-xl bg-card border-border text-xs">
          <SelectValue placeholder="Evolución 1RM de..." />
        </SelectTrigger>
        <SelectContent>
          {weightRepsExercises.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {chartData.length > 1 && (
        <div className="rounded-xl bg-card border border-border p-3">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                formatter={(v: number) => [`${v} kg`, '1RM estimado']}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {rms.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Sin datos de peso+reps en este período</p>}
    </div>
  );
}
