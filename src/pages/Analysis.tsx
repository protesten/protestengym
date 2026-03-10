import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllExercises } from '@/lib/api';
import {
  getExerciseComparisons, getMuscleComparisons,
  getExerciseHistory, formatSetSummary, getPersonalRecords, getPeriodSummaries,
  type MuscleVolume, type Comparison, type DateRange,
  type ExerciseHistoryEntry, type PersonalRecord, type PeriodSummary,
} from '@/db/calculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComparisonRow } from '@/components/ComparisonRow';
import { Progress } from '@/components/ui/progress';
import { WeeklyMuscleVolume, OneRMPanel } from '@/components/AnalysisExtras';
import { DateRangeSelector } from '@/components/DateRangeSelector';
import { AIInsightCard } from '@/components/AIInsightCard';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { Trophy, TrendingUp, BarChart3, ArrowUp, ArrowDown, Minus, Dumbbell, Activity, Clock, Ruler } from 'lucide-react';
import { BodyEvolutionPanel } from '@/components/BodyEvolutionPanel';
import { RelativeStrengthPanel } from '@/components/RelativeStrengthPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { getProfile } from '@/lib/api';
import { getAppFeatures } from '@/lib/ai-insights';

function ArrowBadge({ c }: { c: Comparison }) {
  const cls = c.arrow === '↑' ? 'arrow-up' : c.arrow === '↓' ? 'arrow-down' : 'arrow-equal';
  return <span className={`text-xs font-mono ${cls}`}>{c.current} {c.arrow}</span>;
}

function DeltaIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : current > 0 ? 100 : 0;
  if (diff === 0) return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> 0%</span>;
  if (diff > 0) return <span className="flex items-center gap-0.5 text-xs text-green-400"><ArrowUp className="h-3 w-3" /> +{pct}%</span>;
  return <span className="flex items-center gap-0.5 text-xs text-red-400"><ArrowDown className="h-3 w-3" /> {pct}%</span>;
}

export default function Analysis() {
  const { data: exercises } = useQuery({ queryKey: ['allExercises'], queryFn: getAllExercises });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedExId, setSelectedExId] = useState('');
  const [exComps, setExComps] = useState<{ week: any; month: any; lastSession: any } | null>(null);
  const [muscleData, setMuscleData] = useState<MuscleVolume[]>([]);
  const [musclePeriod, setMusclePeriod] = useState<'7d' | 'month'>('7d');
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [periodData, setPeriodData] = useState<PeriodSummary[]>([]);
  const [periodGranularity, setPeriodGranularity] = useState<'week' | 'month'>('week');
  const [loadingExercise, setLoadingExercise] = useState(false);
  const [loadingMuscle, setLoadingMuscle] = useState(false);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const selectedEx = exercises?.find(e => e.id === selectedExId);

  // Exercise tab
  useEffect(() => {
    if (!selectedExId || !selectedEx) return;
    setLoadingExercise(true);
    Promise.all([
      getExerciseComparisons(selectedEx.id, selectedEx.tracking_type as any, dateRange).then(setExComps),
      getExerciseHistory(selectedEx.id, selectedEx.tracking_type as any, dateRange).then(setHistory),
    ]).finally(() => setLoadingExercise(false));
  }, [selectedExId, exercises, dateRange]);

  // Muscle tab
  useEffect(() => {
    setLoadingMuscle(true);
    const p = dateRange
      ? getMuscleComparisons('7d', dateRange)
      : getMuscleComparisons(musclePeriod);
    p.then(setMuscleData).finally(() => setLoadingMuscle(false));
  }, [musclePeriod, dateRange]);

  // PRs tab
  useEffect(() => {
    setLoadingPrs(true);
    getPersonalRecords(dateRange).then(setPrs).finally(() => setLoadingPrs(false));
  }, [dateRange]);

  // Summary tab
  useEffect(() => {
    setLoadingSummary(true);
    getPeriodSummaries(periodGranularity, dateRange).then(setPeriodData).finally(() => setLoadingSummary(false));
  }, [periodGranularity, dateRange]);

  const unitLabel = selectedEx ? (selectedEx.tracking_type === 'time_only' || selectedEx.tracking_type === 'distance_time' ? 's' : '') : '';
  const metricLabel = selectedEx
    ? selectedEx.tracking_type === 'weight_reps' ? 'Volumen (kg)' 
    : selectedEx.tracking_type === 'reps_only' ? 'Reps'
    : selectedEx.tracking_type === 'time_only' ? 'Tiempo (s)' : 'Tiempo (s)' : '';

  const chartData = [...history].reverse().map(h => ({ date: h.date.slice(5), value: h.totalMetric }));
  const maxStrength = Math.max(...periodData.map(p => p.strengthTotal), 1);
  const maxIso = Math.max(...periodData.map(p => p.isometricTotal), 1);

  const barChartData = [...periodData].reverse().map(p => ({
    label: p.label.length > 10 ? p.label.slice(0, 8) + '…' : p.label,
    fuerza: Math.round(p.strengthTotal),
    sesiones: p.sessionCount,
    series: p.totalWorkSets,
  }));

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-3 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        Análisis
      </h1>

      {/* Global date range selector */}
      <div className="mb-4">
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      <Tabs defaultValue="exercise">
        <TabsList className="w-full grid grid-cols-4 h-auto gap-1 bg-secondary/50 rounded-xl p-1">
          <TabsTrigger value="exercise" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Ejercicio</TabsTrigger>
          <TabsTrigger value="muscle" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Músculo</TabsTrigger>
          <TabsTrigger value="volume" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Volumen</TabsTrigger>
          <TabsTrigger value="1rm" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">1RM</TabsTrigger>
          <TabsTrigger value="prs" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">PRs</TabsTrigger>
          <TabsTrigger value="body" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Cuerpo</TabsTrigger>
          <TabsTrigger value="relative" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">F. Relativa</TabsTrigger>
          <TabsTrigger value="summary" className="text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground">Resumen</TabsTrigger>
        </TabsList>

        <TabsContent value="exercise" className="space-y-4 mt-4">
          <Select value={selectedExId} onValueChange={setSelectedExId}>
            <SelectTrigger className="rounded-xl bg-card border-border"><SelectValue placeholder="Seleccionar ejercicio" /></SelectTrigger>
            <SelectContent>
              {exercises && exercises.filter(e => e.source === 'predefined').length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground">Predefinidos</div>
                  {exercises.filter(e => e.source === 'predefined').map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </>
              )}
              {exercises && exercises.filter(e => e.source === 'personal').length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground mt-1">Personales</div>
                  {exercises.filter(e => e.source === 'personal').map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </>
              )}
            </SelectContent>
          </Select>
          {selectedExId && loadingExercise ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : exComps && (
            <div className="space-y-2">
              {dateRange ? (
                <ComparisonRow label="Período seleccionado" comparison={exComps.week} unit={unitLabel} />
              ) : (
                <>
                  <ComparisonRow label="Última sesión" comparison={exComps.lastSession} unit={unitLabel} />
                  <ComparisonRow label="Últimos 7 días" comparison={exComps.week} unit={unitLabel} />
                  <ComparisonRow label="Mes actual" comparison={exComps.month} unit={unitLabel} />
                </>
              )}
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} labelFormatter={(l) => `Fecha: ${l}`} formatter={(v: number) => [v.toLocaleString(), metricLabel]} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
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
                    <p className="text-xs text-muted-foreground mt-0.5">{formatSetSummary(h.sets, selectedEx!.tracking_type as any)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {selectedExId && history.length > 0 && (
            <AIInsightCard
              context="exercise_analysis"
              compact
              data={{
                exerciseName: selectedEx?.name,
                trackingType: selectedEx?.tracking_type,
                history: history.slice(0, 10).map(h => ({ date: h.date, metric: h.totalMetric, sets: h.sets.length })),
                comparisons: exComps,
              }}
              cacheKey={`ex-${selectedExId}`}
            />
          )}
          {!selectedExId && <p className="text-center text-muted-foreground text-sm py-8">Selecciona un ejercicio</p>}
        </TabsContent>

        <TabsContent value="muscle" className="mt-4">
          {!dateRange && (
            <div className="flex gap-2 mb-4">
              <button onClick={() => setMusclePeriod('7d')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${musclePeriod === '7d' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>7 días</button>
              <button onClick={() => setMusclePeriod('month')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${musclePeriod === 'month' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>Mes</button>
            </div>
          )}
          {loadingMuscle ? (
            <div className="space-y-1.5">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : muscleData.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Sin datos de volumen muscular en este período</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-2 px-3 py-1 text-xs text-muted-foreground font-semibold">
                <span>Músculo</span><span className="text-center">Fuerza</span><span className="text-center">Isométrico</span>
              </div>
              {muscleData.map(m => (
                <div key={m.muscleId} className="grid grid-cols-3 gap-2 px-3 py-2.5 rounded-xl bg-card border border-border items-center">
                  <span className="text-sm font-semibold truncate">{m.muscleName}</span>
                  <div className="text-center"><ArrowBadge c={m.strength} /></div>
                  <div className="text-center"><ArrowBadge c={m.isometric} /></div>
                </div>
              ))}
            </div>
          )}
          {muscleData.length > 0 && (
            <AIInsightCard
              context="routine_review"
              compact
              data={{ muscles: muscleData.map(m => ({ name: m.muscleName, strength: m.strength.current, isometric: m.isometric.current })) }}
              cacheKey={`muscle-${musclePeriod}`}
              label="✨ Evaluar volumen muscular"
            />
          )}
        </TabsContent>

        <TabsContent value="volume" className="mt-4">
          <WeeklyMuscleVolume dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="1rm" className="mt-4">
          <OneRMPanel dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="prs" className="mt-4">
          {loadingPrs ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : prs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Sin récords en este período.</p>
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

        <TabsContent value="body" className="mt-4">
          <BodyEvolutionPanel dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="relative" className="mt-4">
          <RelativeStrengthPanel dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="summary" className="mt-4 space-y-4">
          {!dateRange && (
            <div className="flex gap-2">
              <button onClick={() => setPeriodGranularity('week')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${periodGranularity === 'week' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>Semanal</button>
              <button onClick={() => setPeriodGranularity('month')} className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all ${periodGranularity === 'month' ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'}`}>Mensual</button>
            </div>
          )}

          {/* Summary bar chart */}
          {barChartData.length > 1 && barChartData.some(d => d.sesiones > 0) && (
            <div className="rounded-xl bg-card border border-border p-3">
              <h3 className="text-xs font-bold mb-2 text-muted-foreground">Sesiones por período</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  <Bar dataKey="sesiones" name="Sesiones" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {loadingSummary ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : (
          <div className="space-y-2">
            {periodData.map((p, i) => {
              const prev = periodData[i + 1];
              return (
                <div key={i} className="p-3.5 rounded-xl bg-card border border-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">{p.label}</span>
                    <span className="text-xs text-muted-foreground font-semibold">{p.sessionCount} sesión{p.sessionCount !== 1 ? 'es' : ''}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <Dumbbell className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="text-xs font-mono font-bold">{p.totalWorkSets}</p>
                      <p className="text-[9px] text-muted-foreground">Series</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <Activity className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="text-xs font-mono font-bold">{p.exerciseCount}</p>
                      <p className="text-[9px] text-muted-foreground">Ejercicios</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <Clock className="h-3 w-3 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="text-xs font-mono font-bold">{p.avgRPE ?? '—'}</p>
                      <p className="text-[9px] text-muted-foreground">RPE medio</p>
                    </div>
                  </div>

                  {p.strengthTotal > 0 && (
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-muted-foreground">Fuerza</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{p.strengthTotal.toLocaleString()}</span>
                          {prev && <DeltaIndicator current={p.strengthTotal} previous={prev.strengthTotal} />}
                        </div>
                      </div>
                      <Progress value={(p.strengthTotal / maxStrength) * 100} className="h-2 bg-secondary" />
                    </div>
                  )}
                  {p.isometricTotal > 0 && (
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-muted-foreground">Isométrico</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{Math.floor(p.isometricTotal / 60)}m</span>
                          {prev && <DeltaIndicator current={p.isometricTotal} previous={prev.isometricTotal} />}
                        </div>
                      </div>
                      <Progress value={(p.isometricTotal / maxIso) * 100} className="h-2 bg-secondary" />
                    </div>
                  )}
                  {p.cardioTime > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      Cardio: <span className="font-mono text-foreground font-bold">{Math.floor(p.cardioTime / 60)}m</span>
                      {prev && <DeltaIndicator current={p.cardioTime} previous={prev.cardioTime} />}
                    </div>
                  )}
                </div>
              );
            })}
            {periodData.every(p => p.sessionCount === 0) && <p className="text-center text-muted-foreground text-sm py-8">Sin datos en este período</p>}
          </div>
          )}
          {periodData.some(p => p.sessionCount > 0) && (
            <AIInsightCard
              context="session_feedback"
              compact
              data={{ periods: periodData.slice(0, 4).map(p => ({ label: p.label, sessions: p.sessionCount, volume: p.strengthTotal, sets: p.totalWorkSets, rpe: p.avgRPE })) }}
              cacheKey={`summary-${periodGranularity}`}
              label="✨ Analizar tendencia"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
