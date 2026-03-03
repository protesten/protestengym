import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutines, createRoutine, updateRoutine, deleteRoutine, type Routine } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Routines() {
  const queryClient = useQueryClient();
  const { data: routines } = useQuery({ queryKey: ['routines'], queryFn: getRoutines });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [name, setName] = useState('');

  function openCreate() { setEditing(null); setName(''); setDialogOpen(true); }
  function openEdit(r: Routine) { setEditing(r); setName(r.name); setDialogOpen(true); }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Nombre requerido');
      if (editing) {
        await updateRoutine(editing.id, name);
      } else {
        await createRoutine(name);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      toast.success(editing ? 'Rutina actualizada' : 'Rutina creada');
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: deleteRoutine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      toast.success('Rutina eliminada');
    },
  });

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
              <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <Button className="w-full" onClick={() => saveMutation.mutate()}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
