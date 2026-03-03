import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getExercises } from '@/lib/api';
import {
  getExerciseComparisons, getMuscleComparisons, getAllSessionSummaries,
  getExerciseHistory, formatSetSummary, getPersonalRecords, getPeriodSummaries,
  type MuscleVolume, type SessionSummary, type Comparison,
  type ExerciseHistoryEntry, type PersonalRecord, type PeriodSummary,
} from '@/db/calculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComparisonRow } from '@/components/ComparisonRow';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp } from 'lucide-react';

function ArrowBadge({ c }: { c: Comparison }) {
  const cls = c.arrow === '↑' ? 'arrow-up' : c.arrow === '↓' ? 'arrow-down' : 'arrow-equal';
  return <span className={`text-xs font-mono ${cls}`}>{c.current} {c.arrow}</span>;
}

export default function Analysis() {
  const { data: exercises } = useQuery({ queryKey: ['exercises'], queryFn: getExercises });
  const [selectedExId, setSelectedExId] = useState('');
  const [exComps, setExComps] = useState<{ week: any; month: any; lastSession: any } | null>(null);
  const [muscleData, setMuscleData] = useState<{ week: MuscleVolume[]; month: MuscleVolume[] }>({ week: [], month: [] });
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [musclePeriod, setMusclePeriod] = useState<'7d' | 'month'>('7d');
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [periodData, setPeriodData] = useState<PeriodSummary[]>([]);
  const [periodGranularity, setPeriodGranularity] = useState<'week' | 'month'>('week');

  const selectedEx = exercises?.find(e => e.id === selectedExId);

  useEffect(() => {
    if (!selectedExId || !selectedEx) return;
    getExerciseComparisons(selectedEx.id, selectedEx.tracking_type).then(setExComps);
    getExerciseHistory(selectedEx.id, selectedEx.tracking_type).then(setHistory);
  }, [selectedExId, exercises]);

  useEffect(() => {
    getMuscleComparisons('7d').then(w => setMuscleData(prev => ({ ...prev, week: w })));
    getMuscleComparisons('month').then(m => setMuscleData(prev => ({ ...prev, month: m })));
    getAllSessionSummaries().then(setSessions);
    getPersonalRecords().then(setPrs);
  }, []);

  useEffect(() => {
    getPeriodSummaries(periodGranularity).then(setPeriodData);
  }, [periodGranularity]);

  const unitLabel = selectedEx ? (selectedEx.tracking_type === 'time_only' || selectedEx.tracking_type === 'distance_time' ? 's' : '') : '';
  const currentMuscleData = musclePeriod === '7d' ? muscleData.week : muscleData.month;

  const metricLabel = selectedEx
    ? selectedEx.tracking_type === 'weight_reps' ? 'Volumen (kg)' 
    : selectedEx.tracking_type === 'reps_only' ? 'Reps'
    : selectedEx.tracking_type === 'time_only' ? 'Tiempo (s)'
    : 'Tiempo (s)'
    : '';

  const chartData = [...history].reverse().map(h => ({
    date: h.date.slice(5),
    value: h.totalMetric,
  }));

  const maxStrength = Math.max(...periodData.map(p => p.strengthTotal), 1);
  const maxIso = Math.max(...periodData.map(p => p.isometricTotal), 1);

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Análisis</h1>
      <Tabs defaultValue="exercise">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="exercise" className="flex-1 text-xs">Ejercicio</TabsTrigger>
          <TabsTrigger value="muscle" className="flex-1 text-xs">Músculo</TabsTrigger>
          <TabsTrigger value="session" className="flex-1 text-xs">Sesión</TabsTrigger>
          <TabsTrigger value="prs" className="flex-1 text-xs">PRs</TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 text-xs">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="exercise" className="space-y-4 mt-4">
          <Select value={selectedExId} onValueChange={setSelectedExId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar ejercicio" /></SelectTrigger>
            <SelectContent>
              {exercises?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {exComps && (
            <div className="space-y-2">
              <ComparisonRow label="Última sesión" comparison={exComps.lastSession} unit={unitLabel} />
              <ComparisonRow label="Últimos 7 días" comparison={exComps.week} unit={unitLabel} />
              <ComparisonRow label="Mes actual" comparison={exComps.month} unit={unitLabel} />
              {selectedEx?.tracking_type === 'distance_time' && <p className="text-xs text-muted-foreground">Distancia mostrada como dato secundario</p>}
            </div>
          )}

          {chartData.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> Evolución
              </h3>
              <div className="bg-card border rounded-lg p-3">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                      labelFormatter={(l) => `Fecha: ${l}`}
                      formatter={(v: number) => [v.toLocaleString(), metricLabel]}
                    />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Historial</h3>
              <div className="space-y-1.5">
                {history.map(h => (
                  <Link key={h.sessionId} to={`/session/${h.sessionId}`} className="block p-2.5 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{h.date}</span>
                      <span className="text-xs font-mono font-semibold text-primary">{h.totalMetric.toLocaleString()}{unitLabel && ` ${unitLabel}`}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatSetSummary(h.sets, selectedEx!.tracking_type)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!selectedExId && <p className="text-center text-muted-foreground text-sm py-8">Selecciona un ejercicio</p>}
        </TabsContent>

        <TabsContent value="muscle" className="mt-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMusclePeriod('7d')} className={`text-sm px-3 py-1 rounded-full ${musclePeriod === '7d' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>7 días</button>
            <button onClick={() => setMusclePeriod('month')} className={`text-sm px-3 py-1 rounded-full ${musclePeriod === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Mes</button>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1 text-xs text-muted-foreground font-medium">
              <span>Músculo</span><span className="w-24 text-center">Fuerza</span><span className="w-24 text-center">Isométrico</span>
            </div>
            {currentMuscleData.map(m => (
              <div key={m.muscleId} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 rounded-md bg-card border items-center">
                <span className="text-sm font-medium">{m.muscleName}</span>
                <div className="w-24 text-center"><ArrowBadge c={m.strength} /></div>
                <div className="w-24 text-center"><ArrowBadge c={m.isometric} /></div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="session" className="mt-4">
          <div className="space-y-2">
            {sessions.map(s => (
              <Link key={s.sessionId} to={`/session/${s.sessionId}`} className="block p-3 rounded-lg bg-card border hover:border-primary/50 transition-colors">
                <div className="font-medium text-sm mb-1">{s.date}</div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {s.strengthTotal > 0 && <span>Fuerza: <span className="font-mono text-foreground">{s.strengthTotal.toLocaleString()}</span></span>}
                  {s.isometricTotal > 0 && <span>Iso: <span className="font-mono text-foreground">{Math.floor(s.isometricTotal / 60)}m</span></span>}
                  {s.cardioTime > 0 && <span>Cardio: <span className="font-mono text-foreground">{Math.floor(s.cardioTime / 60)}m</span></span>}
                </div>
              </Link>
            ))}
            {sessions.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Sin sesiones</p>}
          </div>
        </TabsContent>

        <TabsContent value="prs" className="mt-4">
          {prs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Sin récords aún. Completa sesiones para ver tus PRs.</p>
          ) : (
            <div className="space-y-3">
              {prs.map(pr => (
                <div key={pr.exerciseId} className="p-3 rounded-lg bg-card border">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-accent-foreground" />
                    <span className="font-medium text-sm">{pr.exerciseName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {pr.records.map((r, i) => (
                      <div key={i} className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">{r.label}</p>
                        <p className="text-sm font-mono font-bold">{r.value.toLocaleString()} {r.unit}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setPeriodGranularity('week')} className={`text-sm px-3 py-1 rounded-full ${periodGranularity === 'week' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Semanal</button>
            <button onClick={() => setPeriodGranularity('month')} className={`text-sm px-3 py-1 rounded-full ${periodGranularity === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Mensual</button>
          </div>
          <div className="space-y-2">
            {periodData.map((p, i) => (
              <div key={i} className="p-3 rounded-lg bg-card border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.sessionCount} sesión{p.sessionCount !== 1 ? 'es' : ''}</span>
                </div>
                {p.strengthTotal > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">Fuerza</span>
                      <span className="font-mono">{p.strengthTotal.toLocaleString()}</span>
                    </div>
                    <Progress value={(p.strengthTotal / maxStrength) * 100} className="h-2" />
                  </div>
                )}
                {p.isometricTotal > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">Isométrico</span>
                      <span className="font-mono">{Math.floor(p.isometricTotal / 60)}m</span>
                    </div>
                    <Progress value={(p.isometricTotal / maxIso) * 100} className="h-2" />
                  </div>
                )}
                {p.cardioTime > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Cardio: <span className="font-mono text-foreground">{Math.floor(p.cardioTime / 60)}m</span>
                  </div>
                )}
              </div>
            ))}
            {periodData.every(p => p.sessionCount === 0) && (
              <p className="text-center text-muted-foreground text-sm py-8">Sin datos en este período</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
