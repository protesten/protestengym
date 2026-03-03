import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExercises } from '@/lib/api';
import { getWeeklyMuscleSets, getAll1RMs, get1RMHistory, type WeeklyMuscleSets, type ExerciseRM, type RM1History } from '@/db/calculations';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function WeeklyMuscleVolume() {
  const [data, setData] = useState<WeeklyMuscleSets[]>([]);
  useEffect(() => { getWeeklyMuscleSets().then(setData); }, []);

  const target = 15; // default target sets per week

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Series por Músculo (Semana)</h3>
      </div>
      {data.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-4">Sin datos esta semana</p>
      ) : (
        <div className="space-y-1.5">
          {data.map(m => (
            <div key={m.muscleId} className="p-2.5 rounded-xl bg-card border border-border">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold">{m.muscleName}</span>
                <span className={cn("text-xs font-mono font-bold", setsColorText(m.workingSets))}>{m.workingSets}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", setsColor(m.workingSets))}
                  style={{ width: `${Math.min((m.workingSets / target) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
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

export function OneRMPanel() {
  const { data: exercises } = useQuery({ queryKey: ['exercises'], queryFn: getExercises });
  const [rms, setRMs] = useState<ExerciseRM[]>([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [rmHistory, setRmHistory] = useState<RM1History[]>([]);

  useEffect(() => { getAll1RMs().then(setRMs); }, []);
  useEffect(() => {
    if (selectedExId) get1RMHistory(selectedExId).then(setRmHistory);
    else setRmHistory([]);
  }, [selectedExId]);

  const chartData = rmHistory.map(h => ({ date: h.date.slice(5), value: h.estimated1RM }));
  const weightRepsExercises = exercises?.filter(e => e.tracking_type === 'weight_reps') ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Estimación 1RM (Epley)</h3>
      </div>

      {rms.length > 0 && (
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
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 12% 16%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(225 12% 16%)', background: 'hsl(225 14% 11%)' }}
                formatter={(v: number) => [`${v} kg`, '1RM estimado']}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(20, 100%, 60%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(20, 100%, 60%)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {rms.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Sin datos de peso+reps aún</p>}
    </div>
  );
}
