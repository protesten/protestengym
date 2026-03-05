import { useState, useEffect } from 'react';
import { Brain, Trophy, AlertTriangle, Lightbulb, Loader2, ArrowLeft, Clock, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getRPEBadge } from '@/components/RPEFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCoachData } from '@/db/coach-data';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CoachAnalysis {
  achievement: string;
  alert: string;
  advice: string;
  status: 'progress' | 'plateau' | 'overtraining';
  timestamp: string;
  weeklyAvgRPE?: number | null;
  last3SessionsAvgRPE?: number | null;
}

const STORAGE_KEY = 'coach-history';

function loadHistory(): CoachAnalysis[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch { return []; }
}

function saveHistory(h: CoachAnalysis[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 10)));
}

const statusConfig = {
  progress: { border: 'border-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success)/0.1)]', label: 'Progreso' },
  plateau: { border: 'border-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning)/0.1)]', label: 'Meseta' },
  overtraining: { border: 'border-destructive', bg: 'bg-destructive/10', label: 'Sobreentrenamiento' },
};

export default function Coach() {
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<CoachAnalysis | null>(null);
  const [history, setHistory] = useState<CoachAnalysis[]>(loadHistory);
  const { toast } = useToast();

  const consult = async () => {
    setLoading(true);
    try {
      const coachData = await getCoachData();

      if (!coachData.exercises.length) {
        toast({ title: 'Sin datos suficientes', description: 'Necesitas al menos 2 sesiones con ejercicios de peso para consultar al Coach.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-coach', {
        body: { coachData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const analysis: CoachAnalysis = {
        ...data,
        timestamp: new Date().toISOString(),
        weeklyAvgRPE: coachData.weeklyAvgRPE,
        last3SessionsAvgRPE: coachData.last3SessionsAvgRPE,
      };

      setCurrent(analysis);
      const updated = [analysis, ...history].slice(0, 10);
      setHistory(updated);
      saveHistory(updated);
    } catch (e: any) {
      console.error('Coach error:', e);
      toast({ title: 'Error', description: e?.message ?? 'No se pudo consultar al Coach', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const cfg = current ? statusConfig[current.status] ?? statusConfig.progress : null;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Coach IA
          </h1>
          <p className="text-sm text-muted-foreground">Inteligencia de entrenamiento personalizada</p>
        </div>
      </div>

      {/* CTA */}
      <Button onClick={consult} disabled={loading} className="w-full h-14 text-base font-bold gap-2" size="lg">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Brain className="h-5 w-5" />}
        {loading ? 'Analizando tus datos…' : 'Consultar al Coach'}
      </Button>

      {/* Loading skeleton */}
      {loading && !current && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Results */}
      {current && !loading && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Achievement */}
          <Card className={`border-2 ${statusConfig.progress.border}`}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[hsl(var(--success))]" /> Logro de la semana
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-foreground">{current.achievement}</p>
            </CardContent>
          </Card>

          {/* Alert */}
          <Card className={`border-2 ${current.status === 'plateau' || current.status === 'overtraining' ? statusConfig[current.status].border : 'border-border'}`}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" /> Alerta de mejora
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-foreground">{current.alert}</p>
            </CardContent>
          </Card>

          {/* Advice */}
          <Card className={`border-2 ${current.status === 'overtraining' ? 'border-destructive' : statusConfig.progress.border}`}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" /> Consejo personalizado
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-foreground">{current.advice}</p>
            </CardContent>
          </Card>

          {/* RPE Fatigue Summary */}
          {(current.weeklyAvgRPE != null || current.last3SessionsAvgRPE != null) && (
            <Card className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">Semáforo de Fatiga</span>
                </div>
                <div className="space-y-2">
                  {current.weeklyAvgRPE != null && (() => {
                    const badge = getRPEBadge(Math.round(current.weeklyAvgRPE!));
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">RPE medio semanal</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">{current.weeklyAvgRPE}</span>
                          {badge && <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 border ${badge.className}`}>{badge.label}</Badge>}
                        </div>
                      </div>
                    );
                  })()}
                  {current.last3SessionsAvgRPE != null && (() => {
                    const badge = getRPEBadge(Math.round(current.last3SessionsAvgRPE!));
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">RPE medio (últimos 3)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">{current.last3SessionsAvgRPE}</span>
                          {badge && <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 border ${badge.className}`}>{badge.label}</Badge>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && !loading && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Consultas anteriores
          </h2>
          {history
            .filter(h => h.timestamp !== current?.timestamp)
            .slice(0, 5)
            .map((h, i) => {
              const c = statusConfig[h.status] ?? statusConfig.progress;
              return (
                <Card key={i} className={`border ${c.border} cursor-pointer`} onClick={() => setCurrent(h)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} text-foreground`}>{c.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(h.timestamp), "d MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{h.achievement}</p>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
