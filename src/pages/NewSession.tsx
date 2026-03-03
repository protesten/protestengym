import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function NewSession() {
  const navigate = useNavigate();
  const routines = useLiveQuery(() => db.routines.toArray());
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mode, setMode] = useState<'routine' | 'free'>('free');
  const [routineId, setRoutineId] = useState('');

  async function start() {
    const sessionId = await db.sessions.add({
      date,
      routine_id: mode === 'routine' && routineId ? Number(routineId) : undefined,
    });

    if (mode === 'routine' && routineId) {
      const reList = await db.routineExercises.where({ routine_id: Number(routineId) }).sortBy('order_index');
      for (const re of reList) {
        await db.sessionExercises.add({ session_id: sessionId as number, exercise_id: re.exercise_id, order_index: re.order_index });
      }
    }

    toast.success('Sesión iniciada');
    navigate(`/session/${sessionId}`);
  }

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Nueva Sesión</h1>
      <div className="space-y-4">
        <div>
          <Label>Fecha</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Modo</Label>
          <div className="flex gap-2 mt-1">
            <Button variant={mode === 'routine' ? 'default' : 'outline'} className="flex-1" onClick={() => setMode('routine')}>Desde rutina</Button>
            <Button variant={mode === 'free' ? 'default' : 'outline'} className="flex-1" onClick={() => setMode('free')}>Sesión libre</Button>
          </div>
        </div>
        {mode === 'routine' && (
          <div>
            <Label>Rutina</Label>
            <Select value={routineId} onValueChange={setRoutineId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rutina" /></SelectTrigger>
              <SelectContent>
                {routines?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button className="w-full" onClick={start} disabled={mode === 'routine' && !routineId}>Iniciar</Button>
      </div>
    </div>
  );
}
