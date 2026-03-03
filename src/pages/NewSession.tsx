import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRoutines, getRoutineExercises, createSession, addSessionExercise, createSet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Play, Zap } from 'lucide-react';

export default function NewSession() {
  const navigate = useNavigate();
  const { data: routines } = useQuery({ queryKey: ['routines'], queryFn: getRoutines });
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mode, setMode] = useState<'routine' | 'free'>('free');
  const [routineId, setRoutineId] = useState('');

  const startMutation = useMutation({
    mutationFn: async () => {
      const session = await createSession({ date, routine_id: mode === 'routine' && routineId ? routineId : undefined });
      if (mode === 'routine' && routineId) {
        const reList = await getRoutineExercises(routineId);
        for (const re of reList) {
          const newSe = await addSessionExercise(session.id, re.exercise_id, re.order_index);
          const plannedSets = Array.isArray((re as any).planned_sets) ? (re as any).planned_sets : [];
          for (const ps of plannedSets) await createSet(newSe.id, ps.set_type || 'work', ps.rpe ?? null);
        }
      }
      return session.id;
    },
    onSuccess: (sessionId) => { toast.success('Sesión iniciada'); navigate(`/session/${sessionId}`); },
  });

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-6">Nueva Sesión</h1>
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-lg bg-card border-border" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Modo</Label>
          <div className="flex gap-2 mt-1">
            <Button
              variant={mode === 'routine' ? 'default' : 'outline'}
              className={`flex-1 rounded-lg gap-2 ${mode === 'routine' ? 'gradient-primary text-primary-foreground border-0' : 'border-border'}`}
              onClick={() => setMode('routine')}
            >
              <Zap className="h-4 w-4" />Desde rutina
            </Button>
            <Button
              variant={mode === 'free' ? 'default' : 'outline'}
              className={`flex-1 rounded-lg gap-2 ${mode === 'free' ? 'gradient-primary text-primary-foreground border-0' : 'border-border'}`}
              onClick={() => setMode('free')}
            >
              <Play className="h-4 w-4" />Sesión libre
            </Button>
          </div>
        </div>
        {mode === 'routine' && (
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Rutina</Label>
            <Select value={routineId} onValueChange={setRoutineId}>
              <SelectTrigger className="rounded-lg bg-card border-border"><SelectValue placeholder="Seleccionar rutina" /></SelectTrigger>
              <SelectContent>{routines?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <Button
          className="w-full h-14 text-lg font-bold rounded-xl gradient-primary text-primary-foreground border-0 glow-primary hover:opacity-90 transition-opacity gap-3"
          onClick={() => startMutation.mutate()}
          disabled={mode === 'routine' && !routineId}
        >
          <Play className="h-6 w-6" />
          Iniciar
        </Button>
      </div>
    </div>
  );
}
