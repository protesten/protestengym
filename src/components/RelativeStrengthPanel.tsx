import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllExercises } from '@/lib/api';
import {
  prefetchRelativeStrengthData,
  computeRelativeStrengthForExercise,
  type DateRange,
} from '@/db/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Zap, Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  dateRange?: DateRange;
}

export function RelativeStrengthPanel({ dateRange }: Props) {
  const { data: exercises } = useQuery({ queryKey: ['allExercises'], queryFn: getAllExercises });
  const [selectedExId, setSelectedExId] = useState('');

  // Bulk-fetch all data once
  const { data: bulk, isLoading } = useQuery({
    queryKey: ['relativeStrengthBulk', dateRange?.from, dateRange?.to],
    queryFn: () => prefetchRelativeStrengthData(dateRange),
  });

  // Filter only weight_reps exercises
  const weightExercises = useMemo(
    () => (exercises ?? []).filter(e => e.tracking_type === 'weight_reps'),
    [exercises],
  );

  // Compute ratio instantly on exercise change via useMemo
  const result = useMemo(() => {
    if (!selectedExId || !bulk) return null;
    return computeRelativeStrengthForExercise(selectedExId, bulk.prefetched, bulk.bodyWeights);
  }, [selectedExId, bulk]);

  const chartData = useMemo(
    () => (result?.history ?? []).map(h => ({ date: h.date.slice(5), ratio: h.ratio, '1RM': h.estimated1RM, peso: h.bodyWeight })),
    [result],
  );

  // AI interpretation
  const interpretation = useMemo(() => {
    if (!result?.history || result.history.length < 2) return null;
    const first = result.history[0];
    const last = result.history[result.history.length - 1];
    const ratioTrend = last.ratio - first.ratio;
    const weightTrend = last.bodyWeight - first.bodyWeight;

    if (ratioTrend > 0.05 && weightTrend <= 0) {
      return {
        type: 'positive' as const,
        text: '¡Eficiencia brutal! Estás ganando fuerza real sin ganar lastre. Tu ratio de fuerza relativa ha mejorado mientras tu peso corporal se ha mantenido o bajado.',
      };
    }
    if (ratioTrend > 0.05 && weightTrend > 0) {
      return {
        type: 'neutral' as const,
        text: 'Buen progreso de fuerza, aunque tu peso corporal también ha subido. Si buscas rendimiento relativo, considera ajustar tu ingesta calórica.',
      };
    }
    if (ratioTrend < -0.05) {
      return {
        type: 'warning' as const,
        text: 'Ojo, tu peso está subiendo más rápido que tu fuerza. Revisa si el superávit calórico es excesivo o si necesitas ajustar tu entrenamiento.',
      };
    }
    return {
      type: 'neutral' as const,
      text: 'Tu ratio de fuerza relativa se mantiene estable. Sigue así para consolidar tus ganancias.',
    };
  }, [result]);

  const selectedExName = weightExercises.find(e => e.id === selectedExId)?.name ?? '';

  return (
    <div className="space-y-4">
      {/* Exercise selector */}
      <Select value={selectedExId} onValueChange={setSelectedExId}>
        <SelectTrigger className="rounded-xl bg-card border-border">
          <SelectValue placeholder="Seleccionar ejercicio (peso+reps)" />
        </SelectTrigger>
        <SelectContent>
          {weightExercises.filter(e => e.source === 'predefined').length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-bold text-muted-foreground">Predefinidos</div>
              {weightExercises.filter(e => e.source === 'predefined').map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </>
          )}
          {weightExercises.filter(e => e.source === 'personal').length > 0 && (
            <>
              <div className="px-2 py-1 text-xs font-bold text-muted-foreground mt-1">Personales</div>
              {weightExercises.filter(e => e.source === 'personal').map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {!selectedExId && (
        <p className="text-center text-muted-foreground text-sm py-8">Selecciona un ejercicio de fuerza</p>
      )}

      {selectedExId && isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {selectedExId && !isLoading && result && (
        <>
          {/* Chart */}
          {chartData.length > 1 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> Evolución del Ratio
              </h3>
              <div className="rounded-xl bg-card border border-border p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                      formatter={(v: number, name: string) => {
                        if (name === 'ratio') return [`${v.toFixed(2)}×`, 'Ratio'];
                        if (name === '1RM') return [`${v} kg`, '1RM Est.'];
                        if (name === 'peso') return [`${v} kg`, 'Peso Corp.'];
                        return [v, name];
                      }}
                    />
                    <Line type="monotone" dataKey="ratio" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : chartData.length === 1 ? (
            <p className="text-center text-muted-foreground text-sm py-4">Solo hay 1 punto de datos. Necesitas más sesiones para ver la evolución.</p>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">Sin datos de fuerza relativa para este ejercicio.</p>
          )}

          {/* Top Ratio Card */}
          {result.topRatio && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-bold text-sm">Top Ratio Histórico</span>
              </div>
              <p className="text-2xl font-black text-primary font-mono">{result.topRatio.ratio.toFixed(2)}×</p>
              <p className="text-sm text-muted-foreground mt-1">
                En <span className="font-semibold text-foreground">{selectedExName}</span> mueves{' '}
                <span className="font-bold text-primary">{result.topRatio.ratio.toFixed(1)}×</span> tu peso corporal
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                1RM: {result.topRatio.estimated1RM} kg · Peso: {result.topRatio.bodyWeight} kg · {result.topRatio.date}
              </p>
            </div>
          )}

          {/* AI Interpretation */}
          {interpretation && (
            <div className={`p-4 rounded-xl border ${
              interpretation.type === 'positive' ? 'bg-green-500/10 border-green-500/30' :
              interpretation.type === 'warning' ? 'bg-red-500/10 border-red-500/30' :
              'bg-card border-border'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {interpretation.type === 'positive' ? <Zap className="h-4 w-4 text-green-400" /> :
                 interpretation.type === 'warning' ? <TrendingDown className="h-4 w-4 text-red-400" /> :
                 <Brain className="h-4 w-4 text-muted-foreground" />}
                <span className="font-bold text-sm">Análisis del Coach</span>
              </div>
              <p className="text-sm text-muted-foreground">{interpretation.text}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
