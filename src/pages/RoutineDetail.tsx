import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutines, getRoutineExercises, getAllExercises, addRoutineExercise, deleteRoutineExercise, updateRoutineExercise, getRoutineTrainingGoal, updateRoutineTrainingGoal, type AnyExercise } from '@/lib/api';
import { SET_TYPE_LABELS, RPE_OPTIONS, type SetType, type PlannedSet, type TrackingType, TRAINING_GOALS, type TrainingGoal } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExerciseSearchSelect from '@/components/ExerciseSearchSelect';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { AIInsightCard } from '@/components/AIInsightCard';
import { toast } from 'sonner';

const DEFAULT_PLANNED_SET: PlannedSet = { set_type: 'work', rpe: 8, min_reps: 8, max_reps: 12, min_time_seconds: null, max_time_seconds: null, min_distance_meters: null, max_distance_meters: null };

function getDefaultPlannedSet(trackingType: TrackingType, setType?: SetType): PlannedSet {
  if (setType === 'drop_set') {
    return { set_type: 'drop_set', rpe: null, min_reps: null, max_reps: null, min_time_seconds: null, max_time_seconds: null, min_distance_meters: null, max_distance_meters: null, num_drops: 3, weight_reduction_pct: 20 };
  }
  if (setType === 'partial') {
    return { set_type: 'partial', rpe: null, min_reps: null, max_reps: null, min_time_seconds: null, max_time_seconds: null, min_distance_meters: null, max_distance_meters: null };
  }
  switch (trackingType) {
    case 'time_only':
      return { set_type: 'work', rpe: 8, min_reps: null, max_reps: null, min_time_seconds: 30, max_time_seconds: 60, min_distance_meters: null, max_distance_meters: null };
    case 'distance_time':
      return { set_type: 'work', rpe: 8, min_reps: null, max_reps: null, min_time_seconds: 60, max_time_seconds: 120, min_distance_meters: 100, max_distance_meters: 200 };
    case 'reps_only':
      return { set_type: 'work', rpe: 8, min_reps: 8, max_reps: 12, min_time_seconds: null, max_time_seconds: null, min_distance_meters: null, max_distance_meters: null };
    default:
      return { ...DEFAULT_PLANNED_SET };
  }
}

function PlannedSetRow({ ps, index, trackingType, onChange, onDelete }: { ps: PlannedSet; index: number; trackingType: TrackingType; onChange: (ps: PlannedSet) => void; onDelete: () => void }) {
  const isDropSet = ps.set_type === 'drop_set';
  const isPartial = ps.set_type === 'partial';

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-2 rounded-lg bg-secondary/30">
      <span className="text-xs text-muted-foreground w-6 shrink-0 font-bold">S{index + 1}</span>
      <Select value={ps.set_type} onValueChange={v => {
        const newType = v as SetType;
        if (newType === 'drop_set') {
          onChange({ ...ps, set_type: newType, num_drops: ps.num_drops ?? 3, weight_reduction_pct: ps.weight_reduction_pct ?? 20, rpe: null, min_reps: null, max_reps: null });
        } else if (newType === 'partial') {
          onChange({ ...ps, set_type: newType, rpe: null, min_reps: null, max_reps: null, num_drops: null, weight_reduction_pct: null });
        } else {
          onChange({ ...ps, set_type: newType, num_drops: null, weight_reduction_pct: null });
        }
      }}>
        <SelectTrigger className="w-24 h-7 text-xs rounded-md bg-card border-border"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(SET_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
      </Select>

      {isDropSet ? (
        <>
          <div className="flex items-center gap-1.5">
            <Input type="number" inputMode="numeric" placeholder="3" className="w-12 h-7 text-xs rounded-md bg-card border-border text-center" value={ps.num_drops ?? ''} onChange={e => onChange({ ...ps, num_drops: e.target.value ? Number(e.target.value) : null })} />
            <span className="text-[11px] text-muted-foreground">drops</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Input type="number" inputMode="numeric" placeholder="20" className="w-12 h-7 text-xs rounded-md bg-card border-border text-center" value={ps.weight_reduction_pct ?? ''} onChange={e => onChange({ ...ps, weight_reduction_pct: e.target.value ? Number(e.target.value) : null })} />
            <span className="text-[11px] text-muted-foreground">% bajada</span>
          </div>
          <span className="text-[10px] text-purple-400 font-medium ml-1">Al fallo</span>
        </>
      ) : isPartial ? (
        <span className="text-[10px] text-yellow-400 font-medium ml-1">Reps parciales al fallo</span>
      ) : (
        <>
          <Select value={ps.rpe?.toString() ?? ''} onValueChange={v => onChange({ ...ps, rpe: v ? Number(v) : null })}>
            <SelectTrigger className="w-20 h-7 text-xs rounded-md bg-card border-border"><SelectValue placeholder="RPE" /></SelectTrigger>
            <SelectContent>{RPE_OPTIONS.map(r => <SelectItem key={r} value={r.toString()}>RPE {r}</SelectItem>)}</SelectContent>
          </Select>

          {(trackingType === 'weight_reps' || trackingType === 'reps_only') && (
            <div className="flex items-center gap-1.5">
              <Input type="number" inputMode="numeric" placeholder="min" className="w-14 h-7 text-xs rounded-md bg-card border-border" value={ps.min_reps ?? ''} onChange={e => onChange({ ...ps, min_reps: e.target.value ? Number(e.target.value) : null })} />
              <span className="text-xs text-muted-foreground">-</span>
              <Input type="number" inputMode="numeric" placeholder="max" className="w-14 h-7 text-xs rounded-md bg-card border-border" value={ps.max_reps ?? ''} onChange={e => onChange({ ...ps, max_reps: e.target.value ? Number(e.target.value) : null })} />
              <span className="text-[11px] text-muted-foreground">reps</span>
            </div>
          )}

          {(trackingType === 'time_only' || trackingType === 'distance_time') && (
            <div className="flex items-center gap-1.5">
              <Input type="number" inputMode="numeric" placeholder="min" className="w-14 h-7 text-xs rounded-md bg-card border-border" value={ps.min_time_seconds ?? ''} onChange={e => onChange({ ...ps, min_time_seconds: e.target.value ? Number(e.target.value) : null })} />
              <span className="text-xs text-muted-foreground">-</span>
              <Input type="number" inputMode="numeric" placeholder="max" className="w-14 h-7 text-xs rounded-md bg-card border-border" value={ps.max_time_seconds ?? ''} onChange={e => onChange({ ...ps, max_time_seconds: e.target.value ? Number(e.target.value) : null })} />
              <span className="text-[11px] text-muted-foreground">seg</span>
            </div>
          )}

          {trackingType === 'distance_time' && (
            <div className="flex items-center gap-1.5">
              <Input type="number" inputMode="numeric" placeholder="min" className="w-14 h-7 text-xs rounded-md bg-card border-border" value={ps.min_distance_meters ?? ''} onChange={e => onChange({ ...ps, min_distance_meters: e.target.value ? Number(e.target.value) : null })} />
              <span className="text-xs text-muted-foreground">-</span>
              <Input type="number" inputMode="numeric" placeholder="max" className="w-14 h-7 text-xs rounded-md bg-card border-border" value={ps.max_distance_meters ?? ''} onChange={e => onChange({ ...ps, max_distance_meters: e.target.value ? Number(e.target.value) : null })} />
              <span className="text-[11px] text-muted-foreground">m</span>
            </div>
          )}
        </>
      )}

      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-auto" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
    </div>
  );
}

export default function RoutineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routineId = id!;

  const { data: routines } = useQuery({ queryKey: ['routines'], queryFn: getRoutines });
  const routine = routines?.find(r => r.id === routineId);
  const { data: routineExercises } = useQuery({ queryKey: ['routine_exercises', routineId], queryFn: () => getRoutineExercises(routineId) });
  const { data: exercises } = useQuery({ queryKey: ['all_exercises'], queryFn: getAllExercises });
  const { data: currentGoal } = useQuery({ queryKey: ['routine_training_goal', routineId], queryFn: () => getRoutineTrainingGoal(routineId) });
  const [selectedExId, setSelectedExId] = useState('');

  const updateGoalMutation = useMutation({
    mutationFn: (goal: string | null) => updateRoutineTrainingGoal(routineId, goal),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routine_training_goal', routineId] }); toast.success('Objetivo actualizado'); },
  });

  const addMutation = useMutation({
    mutationFn: async () => { if (!selectedExId) return; const maxOrder = routineExercises?.length ? Math.max(...routineExercises.map(re => re.order_index)) : -1; await addRoutineExercise(routineId, selectedExId, maxOrder + 1); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] }); setSelectedExId(''); toast.success('Ejercicio añadido'); },
  });

  const removeMutation = useMutation({ mutationFn: deleteRoutineExercise, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] }); toast.success('Ejercicio quitado'); } });

  const moveMutation = useMutation({
    mutationFn: async ({ reId, direction }: { reId: string; direction: -1 | 1 }) => {
      if (!routineExercises) return;
      const idx = routineExercises.findIndex(re => re.id === reId);
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= routineExercises.length) return;
      const a = routineExercises[idx]; const b = routineExercises[swapIdx];
      await updateRoutineExercise(a.id, { order_index: b.order_index });
      await updateRoutineExercise(b.id, { order_index: a.order_index });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] }),
  });

  const updatePlannedSetsMutation = useMutation({
    mutationFn: async ({ reId, plannedSets }: { reId: string; plannedSets: PlannedSet[] }) => { await updateRoutineExercise(reId, { planned_sets: plannedSets } as any); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] }),
  });

  const getPlannedSets = (re: any): PlannedSet[] => { const ps = re.planned_sets; if (Array.isArray(ps)) return ps; return []; };
  const getExerciseTrackingType = (exerciseId: string): TrackingType => {
    const ex = exercises?.find(e => e.id === exerciseId);
    return (ex?.tracking_type as TrackingType) ?? 'weight_reps';
  };
  const handleAddPlannedSet = (reId: string, current: PlannedSet[], trackingType: TrackingType, setType?: SetType) => { updatePlannedSetsMutation.mutate({ reId, plannedSets: [...current, getDefaultPlannedSet(trackingType, setType)] }); };
  const handleUpdatePlannedSet = (reId: string, current: PlannedSet[], index: number, updated: PlannedSet) => { const next = [...current]; next[index] = updated; updatePlannedSetsMutation.mutate({ reId, plannedSets: next }); };
  const handleDeletePlannedSet = (reId: string, current: PlannedSet[], index: number) => { updatePlannedSetsMutation.mutate({ reId, plannedSets: current.filter((_, i) => i !== index) }); };

  const exName = (exId: string) => exercises?.find(e => e.id === exId)?.name ?? 'Desconocido';

  if (!routine) return <div className="p-4 text-muted-foreground">Cargando...</div>;

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <button onClick={() => navigate('/routines')} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm font-medium hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Volver
      </button>
      <h1 className="text-xl font-black mb-2 truncate">{routine.name}</h1>

      {/* AI Routine Review — moved to top */}
      {routineExercises && routineExercises.length >= 2 && (
        <div className="mb-4">
          <AIInsightCard
            context="routine_review"
            data={{
              routineName: routine.name,
              trainingGoal: currentGoal,
              exercises: routineExercises.map(re => ({
                name: exercises?.find(e => e.id === re.exercise_id)?.name ?? 'Desconocido',
                muscles: exercises?.find(e => e.id === re.exercise_id)?.primary_muscle_ids ?? [],
                setsCount: getPlannedSets(re).length,
              })),
            }}
            cacheKey={`routine-${routineId}-${routineExercises.length}`}
            label="✨ Evaluar rutina"
          />
        </div>
      )}

      {/* Training goal selector */}
      <div className="flex gap-1.5 mb-4">
        {(Object.entries(TRAINING_GOALS) as [TrainingGoal, typeof TRAINING_GOALS[TrainingGoal]][]).map(([key, goal]) => (
          <button
            key={key}
            onClick={() => updateGoalMutation.mutate(currentGoal === key ? null : key)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors border ${currentGoal === key ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-secondary/30 border-border text-muted-foreground hover:border-primary/20'}`}
          >
            {goal.emoji} {goal.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <ExerciseSearchSelect exercises={exercises} value={selectedExId} onChange={setSelectedExId} />
        <Button size="icon" className="gradient-primary text-primary-foreground border-0 rounded-lg shrink-0" onClick={() => addMutation.mutate()} disabled={!selectedExId}><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-3">
        {routineExercises?.map((re, i) => {
          const plannedSets = getPlannedSets(re);
          const trackingType = getExerciseTrackingType(re.exercise_id);
          return (
            <div key={re.id} className="p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-primary font-black w-6">{i + 1}</span>
                <span className="flex-1 text-sm font-bold truncate">{exName(re.exercise_id)}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveMutation.mutate({ reId: re.id, direction: -1 })} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveMutation.mutate({ reId: re.id, direction: 1 })} disabled={i === (routineExercises?.length ?? 0) - 1}><ArrowDown className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMutation.mutate(re.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
              <div className="mt-2 ml-6 space-y-1.5">
                {plannedSets.map((ps, j) => (
                  <PlannedSetRow key={j} ps={ps} index={j} trackingType={trackingType} onChange={updated => handleUpdatePlannedSet(re.id, plannedSets, j, updated)} onDelete={() => handleDeletePlannedSet(re.id, plannedSets, j)} />
                ))}
                <Button variant="outline" size="sm" className="mt-1.5 w-full text-xs h-7 rounded-lg border-dashed border-border hover:border-primary/30" onClick={() => handleAddPlannedSet(re.id, plannedSets, trackingType)}>
                  <Plus className="h-3 w-3 mr-1" />Añadir serie
                </Button>
              </div>
            </div>
          );
        })}
        {(!routineExercises || routineExercises.length === 0) && <p className="text-center text-muted-foreground text-sm py-8">Sin ejercicios aún</p>}
      </div>
    </div>
  );
}
