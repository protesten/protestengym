import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutines, getRoutineExercises, getAllExercises, addRoutineExercise, deleteRoutineExercise, updateRoutineExercise, type AnyExercise } from '@/lib/api';
import { SET_TYPE_LABELS, RPE_OPTIONS, type SetType, type PlannedSet } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExerciseSearchSelect from '@/components/ExerciseSearchSelect';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PLANNED_SET: PlannedSet = { set_type: 'work', rpe: 8, min_reps: 8, max_reps: 12 };

function PlannedSetRow({ ps, index, onChange, onDelete }: { ps: PlannedSet; index: number; onChange: (ps: PlannedSet) => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="text-xs text-muted-foreground w-6 shrink-0">S{index + 1}</span>
      <Select value={ps.set_type} onValueChange={v => onChange({ ...ps, set_type: v as SetType })}>
        <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(SET_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={ps.rpe?.toString() ?? ''} onValueChange={v => onChange({ ...ps, rpe: v ? Number(v) : null })}>
        <SelectTrigger className="w-20 h-7 text-xs"><SelectValue placeholder="RPE" /></SelectTrigger>
        <SelectContent>
          {RPE_OPTIONS.map(r => <SelectItem key={r} value={r.toString()}>RPE {r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        type="number" inputMode="numeric" placeholder="min"
        className="w-14 h-7 text-xs"
        value={ps.min_reps ?? ''}
        onChange={e => onChange({ ...ps, min_reps: e.target.value ? Number(e.target.value) : null })}
      />
      <span className="text-xs text-muted-foreground">-</span>
      <Input
        type="number" inputMode="numeric" placeholder="max"
        className="w-14 h-7 text-xs"
        value={ps.max_reps ?? ''}
        onChange={e => onChange({ ...ps, max_reps: e.target.value ? Number(e.target.value) : null })}
      />
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
  const [selectedExId, setSelectedExId] = useState('');

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExId) return;
      const maxOrder = routineExercises?.length ? Math.max(...routineExercises.map(re => re.order_index)) : -1;
      await addRoutineExercise(routineId, selectedExId, maxOrder + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] });
      setSelectedExId('');
      toast.success('Ejercicio añadido');
    },
  });

  const removeMutation = useMutation({
    mutationFn: deleteRoutineExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] });
      toast.success('Ejercicio quitado');
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ reId, direction }: { reId: string; direction: -1 | 1 }) => {
      if (!routineExercises) return;
      const idx = routineExercises.findIndex(re => re.id === reId);
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= routineExercises.length) return;
      const a = routineExercises[idx];
      const b = routineExercises[swapIdx];
      await updateRoutineExercise(a.id, { order_index: b.order_index });
      await updateRoutineExercise(b.id, { order_index: a.order_index });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] }),
  });

  const updatePlannedSetsMutation = useMutation({
    mutationFn: async ({ reId, plannedSets }: { reId: string; plannedSets: PlannedSet[] }) => {
      await updateRoutineExercise(reId, { planned_sets: plannedSets } as any);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routine_exercises', routineId] }),
  });

  const getPlannedSets = (re: any): PlannedSet[] => {
    const ps = re.planned_sets;
    if (Array.isArray(ps)) return ps;
    return [];
  };

  const handleAddPlannedSet = (reId: string, current: PlannedSet[]) => {
    updatePlannedSetsMutation.mutate({ reId, plannedSets: [...current, { ...DEFAULT_PLANNED_SET }] });
  };

  const handleUpdatePlannedSet = (reId: string, current: PlannedSet[], index: number, updated: PlannedSet) => {
    const next = [...current];
    next[index] = updated;
    updatePlannedSetsMutation.mutate({ reId, plannedSets: next });
  };

  const handleDeletePlannedSet = (reId: string, current: PlannedSet[], index: number) => {
    const next = current.filter((_, i) => i !== index);
    updatePlannedSetsMutation.mutate({ reId, plannedSets: next });
  };

  const exName = (exId: string) => exercises?.find(e => e.id === exId)?.name ?? 'Desconocido';

  if (!routine) return <div className="p-4">Cargando...</div>;

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <button onClick={() => navigate('/routines')} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />Volver
      </button>
      <h1 className="text-xl font-bold mb-4">{routine.name}</h1>

      <div className="flex gap-2 mb-4">
        <ExerciseSearchSelect exercises={exercises} value={selectedExId} onChange={setSelectedExId} />
        <Button size="icon" onClick={() => addMutation.mutate()} disabled={!selectedExId}><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-2">
        {routineExercises?.map((re, i) => {
          const plannedSets = getPlannedSets(re);
          return (
            <div key={re.id} className="p-3 rounded-lg bg-card border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{exName(re.exercise_id)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMutation.mutate({ reId: re.id, direction: -1 })} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMutation.mutate({ reId: re.id, direction: 1 })} disabled={i === (routineExercises?.length ?? 0) - 1}><ArrowDown className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMutation.mutate(re.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
              <div className="mt-2 ml-6 space-y-0.5">
                {plannedSets.map((ps, j) => (
                  <PlannedSetRow
                    key={j}
                    ps={ps}
                    index={j}
                    onChange={updated => handleUpdatePlannedSet(re.id, plannedSets, j, updated)}
                    onDelete={() => handleDeletePlannedSet(re.id, plannedSets, j)}
                  />
                ))}
                <Button variant="outline" size="sm" className="mt-1 w-full text-xs h-7" onClick={() => handleAddPlannedSet(re.id, plannedSets)}>
                  <Plus className="h-3 w-3 mr-1" />Añadir serie
                </Button>
              </div>
            </div>
          );
        })}
        {(!routineExercises || routineExercises.length === 0) && <p className="text-center text-muted-foreground text-sm py-4">Sin ejercicios aún</p>}
      </div>
    </div>
  );
}
