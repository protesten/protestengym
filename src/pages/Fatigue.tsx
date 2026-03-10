import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { BodyHeatmap } from '@/components/BodyHeatmap';
import { FatigueHistory } from '@/components/FatigueHistory';
import { AIInsightCard } from '@/components/AIInsightCard';
import { supabase } from '@/integrations/supabase/client';
import {
  computeFatigue,
  estimateRecoveryHours,
  fatigueLevel,
  fatigueColor,
  MUSCLE_RECOVERY,
  type SessionData,
  type RecoveryCategory,
} from '@/lib/fatigue-config';

export default function Fatigue() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fatigue, setFatigue] = useState<Map<number, number>>(new Map());
  const [muscleNames, setMuscleNames] = useState<Map<number, string>>(new Map());
  const [recoveryMap, setRecoveryMap] = useState<Map<number, RecoveryCategory>>(new Map());
  const [activeMuscleIds, setActiveMuscleIds] = useState<Set<number>>(new Set());
  const [sessionDataArr, setSessionDataArr] = useState<SessionData[]>([]);
  const [showDeload, setShowDeload] = useState(false);

  useEffect(() => {
    loadFatigueData();
  }, []);

  async function loadFatigueData() {
    try {
      const { data: muscles } = await supabase.from('muscles').select('*');
      const nameMap = new Map<number, string>();
      const recMap = new Map<number, RecoveryCategory>();
      const activeIds = new Set<number>();
      (muscles ?? []).forEach((m: any) => {
        nameMap.set(m.id, m.name);
        if (m.recovery_category) recMap.set(m.id, m.recovery_category as RecoveryCategory);
        if (m.is_active) activeIds.add(m.id);
      });
      setMuscleNames(nameMap);
      setRecoveryMap(recMap);
      setActiveMuscleIds(activeIds);

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const dateStr = fourteenDaysAgo.toISOString().split('T')[0];

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, date')
        .gte('date', dateStr)
        .order('date', { ascending: false });

      if (!sessions?.length) {
        setLoading(false);
        return;
      }

      const [{ data: personalEx }, { data: predefinedEx }] = await Promise.all([
        supabase.from('exercises').select('id, primary_muscle_ids, secondary_muscle_ids'),
        supabase.from('predefined_exercises').select('id, primary_muscle_ids, secondary_muscle_ids'),
      ]);
      const exerciseMap = new Map<string, { primary: number[]; secondary: number[] }>();
      [...(personalEx ?? []), ...(predefinedEx ?? [])].forEach(e => {
        exerciseMap.set(e.id, {
          primary: (e.primary_muscle_ids as number[]) ?? [],
          secondary: (e.secondary_muscle_ids as number[]) ?? [],
        });
      });

      const sessionIds = sessions.map(s => s.id);
      const { data: sessionExercises } = await supabase
        .from('session_exercises')
        .select('id, session_id, exercise_id')
        .in('session_id', sessionIds);

      const seIds = (sessionExercises ?? []).map(se => se.id);
      let allSets: any[] = [];
      if (seIds.length > 0) {
        for (let i = 0; i < seIds.length; i += 100) {
          const chunk = seIds.slice(i, i + 100);
          const { data: sets } = await supabase
            .from('sets')
            .select('session_exercise_id, weight, reps, set_type')
            .in('session_exercise_id', chunk);
          allSets = allSets.concat(sets ?? []);
        }
      }

      const setsBySE = new Map<string, any[]>();
      allSets.forEach(s => {
        const arr = setsBySE.get(s.session_exercise_id) ?? [];
        arr.push(s);
        setsBySE.set(s.session_exercise_id, arr);
      });

      const sessionDataMap = new Map<string, SessionData>();
      sessions.forEach(s => sessionDataMap.set(s.id, { date: s.date, exercises: [] }));

      (sessionExercises ?? []).forEach(se => {
        const sd = sessionDataMap.get(se.session_id);
        if (!sd) return;
        const exInfo = exerciseMap.get(se.exercise_id);
        const sets = (setsBySE.get(se.id) ?? []).map((s: any) => ({
          weight: s.weight,
          reps: s.reps,
          setType: s.set_type,
        }));
        sd.exercises.push({
          primaryMuscleIds: exInfo?.primary ?? [],
          secondaryMuscleIds: exInfo?.secondary ?? [],
          sets,
        });
      });

      const arr = Array.from(sessionDataMap.values());
      setSessionDataArr(arr);
      const computed = computeFatigue(arr, undefined, recMap);
      setFatigue(computed);

      if (computed.size > 0) {
        const vals = Array.from(computed.values());
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        setShowDeload(avg > 70);
      }
    } catch (err) {
      console.error('Error loading fatigue data:', err);
    } finally {
      setLoading(false);
    }
  }

  const criticalMuscles = Array.from(fatigue.entries())
    .filter(([, pct]) => pct > 60)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          Fatiga Muscular
        </h1>
      </div>

      {!loading && fatigue.size > 0 && (
        <AIInsightCard
          context="fatigue_advice"
          data={{
            muscles: Array.from(fatigue.entries()).map(([id, pct]) => ({
              name: muscleNames.get(id) ?? `#${id}`,
              fatigue: Math.round(pct),
              recovery: recoveryMap.get(id) ?? 'medium',
            })),
            avgFatigue: Math.round(Array.from(fatigue.values()).reduce((a, b) => a + b, 0) / fatigue.size),
          }}
          cacheKey="fatigue"
          label="✨ Consejo de recuperación"
        />
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-[260px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          {showDeload && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Semana de Descarga Recomendada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tu fatiga media corporal es muy alta. Considera reducir volumen e intensidad durante la próxima semana para optimizar la recuperación.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mapa de Fatiga</CardTitle>
            </CardHeader>
            <CardContent>
              {fatigue.size === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay datos de entrenamiento en los últimos 14 días.
                </p>
              ) : (
                <BodyHeatmap fatigue={fatigue} muscleNames={muscleNames} activeMuscleIds={activeMuscleIds} />
              )}
            </CardContent>
          </Card>

          <FatigueHistory sessions={sessionDataArr} muscleNames={muscleNames} recoveryMap={recoveryMap} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Músculos Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {criticalMuscles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos los músculos están en niveles seguros ✓</p>
              ) : (
                <div className="space-y-3">
                  {criticalMuscles.map(([id, pct]) => {
                    const hours = estimateRecoveryHours(pct, id, recoveryMap);
                    return (
                      <div key={id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{muscleNames.get(id) ?? `Músculo ${id}`}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold" style={{ color: fatigueColor(pct) }}>
                              {Math.round(pct)}%
                            </span>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span className="text-[11px]">{hours}h</span>
                            </div>
                          </div>
                        </div>
                        <Progress
                          value={Math.round(pct)}
                          className="h-1.5"
                          style={{ ['--progress-color' as any]: fatigueColor(pct) }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {fatigue.size > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumen General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(fatigue.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, pct]) => (
                      <div key={id} className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: fatigueColor(pct) }} />
                        <span className="text-xs truncate">{muscleNames.get(id) ?? `#${id}`}</span>
                        <span className="text-xs font-bold ml-auto shrink-0" style={{ color: fatigueColor(pct) }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
