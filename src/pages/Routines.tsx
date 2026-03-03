import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Routine } from '@/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Routines() {
  const routines = useLiveQuery(() => db.routines.toArray());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [name, setName] = useState('');

  function openCreate() { setEditing(null); setName(''); setDialogOpen(true); }
  function openEdit(r: Routine) { setEditing(r); setName(r.name); setDialogOpen(true); }

  async function save() {
    if (!name.trim()) { toast.error('Nombre requerido'); return; }
    if (editing?.id) {
      await db.routines.update(editing.id, { name });
      toast.success('Rutina actualizada');
    } else {
      await db.routines.add({ name });
      toast.success('Rutina creada');
    }
    setDialogOpen(false);
  }

  async function remove(id: number) {
    await db.routineExercises.where({ routine_id: id }).delete();
    await db.routines.delete(id);
    toast.success('Rutina eliminada');
  }

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Rutinas</h1>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nueva</Button>
      </div>

      <div className="space-y-2">
        {routines?.map(r => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-card border">
            <Link to={`/routines/${r.id}`} className="flex-1 flex items-center gap-2">
              <span className="font-medium text-sm">{r.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </Link>
            <div className="flex gap-1 ml-2">
              <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {(!routines || routines.length === 0) && <p className="text-center text-muted-foreground text-sm py-8">No hay rutinas</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nueva'} Rutina</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nombre de la rutina" value={name} onChange={e => setName(e.target.value)} />
            <Button className="w-full" onClick={save}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
