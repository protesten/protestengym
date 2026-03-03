import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutines, getRoutineExercises, getExercises, addRoutineExercise, deleteRoutineExercise, updateRoutineExercise } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

export default function RoutineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routineId = id!;

  const { data: routines } = useQuery({ queryKey: ['routines'], queryFn: getRoutines });
  const routine = routines?.find(r => r.id === routineId);
  const { data: routineExercises } = useQuery({ queryKey: ['routine_exercises', routineId], queryFn: () => getRoutineExercises(routineId) });
  const { data: exercises } = useQuery({ queryKey: ['exercises'], queryFn: getExercises });
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

  const exName = (exId: string) => exercises?.find(e => e.id === exId)?.name ?? 'Desconocido';

  if (!routine) return <div className="p-4">Cargando...</div>;

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <button onClick={() => navigate('/routines')} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm">
        <ArrowLeft className="h-4 w-4" />Volver
      </button>
      <h1 className="text-xl font-bold mb-4">{routine.name}</h1>

      <div className="flex gap-2 mb-4">
        <Select value={selectedExId} onValueChange={setSelectedExId}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Añadir ejercicio..." /></SelectTrigger>
          <SelectContent>
            {exercises?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="icon" onClick={() => addMutation.mutate()} disabled={!selectedExId}><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-2">
        {routineExercises?.map((re, i) => (
          <div key={re.id} className="flex items-center gap-2 p-3 rounded-lg bg-card border">
            <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
            <span className="flex-1 text-sm font-medium">{exName(re.exercise_id)}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMutation.mutate({ reId: re.id, direction: -1 })} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMutation.mutate({ reId: re.id, direction: 1 })} disabled={i === (routineExercises?.length ?? 0) - 1}><ArrowDown className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMutation.mutate(re.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
        {(!routineExercises || routineExercises.length === 0) && <p className="text-center text-muted-foreground text-sm py-4">Sin ejercicios aún</p>}
      </div>
    </div>
  );
}
