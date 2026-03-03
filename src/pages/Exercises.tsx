import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type TrackingType } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import MuscleSelect from '@/components/MuscleSelect';

const TRACKING_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Peso + Reps',
  reps_only: 'Solo Reps',
  time_only: 'Solo Tiempo',
  distance_time: 'Distancia + Tiempo',
};

export default function Exercises() {
  const muscles = useLiveQuery(() => db.muscles.toArray());
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState({ name: '', tracking_type: 'weight_reps' as TrackingType, primary_muscle_id: 0, secondary_muscle_id: 0 });

  const filtered = exercises?.filter(e => e.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ name: '', tracking_type: 'weight_reps', primary_muscle_id: muscles?.[0]?.id ?? 0, secondary_muscle_id: 0 });
    setDialogOpen(true);
  }

  function openEdit(ex: Exercise) {
    setEditing(ex);
    setForm({ name: ex.name, tracking_type: ex.tracking_type, primary_muscle_id: ex.primary_muscle_id, secondary_muscle_id: ex.secondary_muscle_id ?? 0 });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return; }
    if (!form.primary_muscle_id) { toast.error('Músculo primario requerido'); return; }
    const data = { ...form, secondary_muscle_id: form.secondary_muscle_id || undefined };
    if (editing?.id) {
      await db.exercises.update(editing.id, data);
      toast.success('Ejercicio actualizado');
    } else {
      await db.exercises.add(data);
      toast.success('Ejercicio creado');
    }
    setDialogOpen(false);
  }

  async function remove(id: number) {
    await db.exercises.delete(id);
    toast.success('Ejercicio eliminado');
  }

  const muscleName = (id?: number) => muscles?.find(m => m.id === id)?.name ?? '';

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Ejercicios</h1>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map(ex => (
          <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg bg-card border">
            <div>
              <p className="font-medium text-sm">{ex.name}</p>
              <p className="text-xs text-muted-foreground">{TRACKING_LABELS[ex.tracking_type]} · {muscleName(ex.primary_muscle_id)}{ex.secondary_muscle_id ? ` / ${muscleName(ex.secondary_muscle_id)}` : ''}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(ex)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(ex.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No hay ejercicios</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} Ejercicio</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>Tipo de tracking</Label>
              <Select value={form.tracking_type} onValueChange={v => setForm(f => ({ ...f, tracking_type: v as TrackingType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRACKING_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Músculo primario</Label>
              <MuscleSelect muscles={muscles} value={form.primary_muscle_id} onChange={v => setForm(f => ({ ...f, primary_muscle_id: v }))} />
            </div>
            <div>
              <Label>Músculo secundario (opcional)</Label>
              <MuscleSelect muscles={muscles} value={form.secondary_muscle_id ?? 0} onChange={v => setForm(f => ({ ...f, secondary_muscle_id: v }))} allowNone />
            </div>
            <Button className="w-full" onClick={save}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
