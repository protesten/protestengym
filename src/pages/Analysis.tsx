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
import { WeeklyMuscleVolume, OneRMPanel } from '@/components/AnalysisExtras';
import { StreakCard } from '@/components/StreakCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp, BarChart3 } from 'lucide-react';

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

  useEffect(() => { getPeriodSummaries(periodGranularity).then(setPeriodData); }, [periodGranularity]);

  const unitLabel = selectedEx ? (selectedEx.tracking_type === 'time_only' || selectedEx.tracking_type === 'distance_time' ? 's' : '') : '';
  const currentMuscleData = musclePeriod === '7d' ? muscleData.week : muscleData.month;
  const metricLabel = selectedEx
    ? selectedEx.tracking_type === 'weight_reps' ? 'Volumen (kg)' 
    : selectedEx.tracking_type === 'reps_only' ? 'Reps'
    : selectedEx.tracking_type === 'time_only' ? 'Tiempo (s)' : 'Tiempo (s)' : '';

  const chartData = [...history].reverse().map(h => ({ date: h.date.slice(5), value: h.totalMetric }));
  const maxStrength = Math.max(...periodData.map(p => p.strengthTotal), 1);
  const maxIso = Math.max(...periodData.map(p => p.isometricTotal), 1);

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        Análisis
      </h1>
      <Tabs defaultValue="exercise">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-secondary/50 rounded-xl p-1">
          <TabsTrigger value="exercise" className="flex-1 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Ejercicio</TabsTrigger>
          <TabsTrigger value="muscle" className="flex-1 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Músculo</TabsTrigger>
          <TabsTrigger value="volume" className="flex-1 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Volumen</TabsTrigger>
          <TabsTrigger value="1rm" className="flex-1 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">1RM</TabsTrigger>
          <TabsTrigger value="prs" className="flex-1 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">PRs</TabsTrigger>
          <TabsTrigger value="streak" className="flex-1 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Racha</TabsTrigger>
          <TabsTrigger value="summary" className="flex-1 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="exercise" className="space-y-4 mt-4">
          <Select value={selectedExId} onValueChange={setSelectedExId}>
            <SelectTrigger className="rounded-xl bg-card border-border"><SelectValue placeholder="Seleccionar ejercicio" /></SelectTrigger>
            <SelectContent>{exercises?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
          {exComps && (
            <div className="space-y-2">
              <ComparisonRow label="Última sesión" comparison={exComps.lastSession} unit={unitLabel} />
              <ComparisonRow label="Últimos 7 días" comparison={exComps.week} unit={unitLabel} />
              <ComparisonRow label="Mes actual" comparison={exComps.month} unit={unitLabel} />
            </div>
          )}
          {chartData.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> Evolución
              </h3>
              <div className="rounded-xl bg-card border border-border p-3">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 12% 16%)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(225 12% 16%)', background: 'hsl(225 14% 11%)' }} labelFormatter={(l) => `Fecha: ${l}`} formatter={(v: number) => [v.toLocaleString(), metricLabel]} />
                    <Line type="monotone" dataKey="value" stroke="hsl(20, 100%, 60%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(20, 100%, 60%)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Historial</h3>
              <div className="space-y-1.5">
                {history.map(h => (
                  <Link key={h.sessionId} to={`/session/${h.sessionId}`} className="block p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{h.date}</span>
                      <span className="text-xs font-mono font-bold text-primary">{h.totalMetric.toLocaleString()}{unitLabel && ` ${unitLabel}`}</span>
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
            <button onClick={() => setMusclePeriod('7d')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${musclePeriod === '7d' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>7 días</button>
            <button onClick={() => setMusclePeriod('month')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${musclePeriod === 'month' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>Mes</button>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1 text-xs text-muted-foreground font-semibold">
              <span>Músculo</span><span className="w-24 text-center">Fuerza</span><span className="w-24 text-center">Isométrico</span>
            </div>
            {currentMuscleData.map(m => (
              <div key={m.muscleId} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2.5 rounded-xl bg-card border border-border items-center">
                <span className="text-sm font-semibold">{m.muscleName}</span>
                <div className="w-24 text-center"><ArrowBadge c={m.strength} /></div>
                <div className="w-24 text-center"><ArrowBadge c={m.isometric} /></div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="volume" className="mt-4">
          <WeeklyMuscleVolume />
        </TabsContent>

        <TabsContent value="1rm" className="mt-4">
          <OneRMPanel />
        </TabsContent>

        <TabsContent value="prs" className="mt-4">
          {prs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Sin récords aún. Completa sesiones para ver tus PRs.</p>
          ) : (
            <div className="space-y-3">
              {prs.map(pr => (
                <div key={pr.exerciseId} className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">{pr.exerciseName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {pr.records.map((r, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-2.5">
                        <p className="text-xs text-muted-foreground">{r.label}</p>
                        <p className="text-sm font-mono font-black text-primary">{r.value.toLocaleString()} {r.unit}</p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="streak" className="mt-4">
          <StreakCard />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setPeriodGranularity('week')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${periodGranularity === 'week' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>Semanal</button>
            <button onClick={() => setPeriodGranularity('month')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${periodGranularity === 'month' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>Mensual</button>
          </div>
          <div className="space-y-2">
            {periodData.map((p, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-card border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">{p.label}</span>
                  <span className="text-xs text-muted-foreground font-semibold">{p.sessionCount} sesión{p.sessionCount !== 1 ? 'es' : ''}</span>
                </div>
                {p.strengthTotal > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Fuerza</span><span className="font-mono font-bold">{p.strengthTotal.toLocaleString()}</span></div>
                    <Progress value={(p.strengthTotal / maxStrength) * 100} className="h-2 bg-secondary" />
                  </div>
                )}
                {p.isometricTotal > 0 && (
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Isométrico</span><span className="font-mono font-bold">{Math.floor(p.isometricTotal / 60)}m</span></div>
                    <Progress value={(p.isometricTotal / maxIso) * 100} className="h-2 bg-secondary" />
                  </div>
                )}
                {p.cardioTime > 0 && <div className="text-xs text-muted-foreground">Cardio: <span className="font-mono text-foreground font-bold">{Math.floor(p.cardioTime / 60)}m</span></div>}
              </div>
            ))}
            {periodData.every(p => p.sessionCount === 0) && <p className="text-center text-muted-foreground text-sm py-8">Sin datos en este período</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
