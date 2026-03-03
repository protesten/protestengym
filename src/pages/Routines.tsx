import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoutines, createRoutine, updateRoutine, deleteRoutine, type Routine } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ChevronRight, ListChecks } from 'lucide-react';
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
      if (editing) await updateRoutine(editing.id, name);
      else await createRoutine(name);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routines'] }); toast.success(editing ? 'Rutina actualizada' : 'Rutina creada'); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: deleteRoutine,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routines'] }); toast.success('Rutina eliminada'); },
  });

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black">Mis Rutinas</h1>
        <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-lg font-semibold" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />Nueva
        </Button>
      </div>

      <div className="space-y-2">
        {routines?.map(r => (
          <div key={r.id} className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
            <Link to={`/routines/${r.id}`} className="flex-1 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <ListChecks className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm">{r.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </Link>
            <div className="flex gap-1 ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeMutation.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {(!routines || routines.length === 0) && (
          <div className="text-center py-12">
            <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">No hay rutinas</p>
            <p className="text-muted-foreground text-xs mt-1">Crea tu primera rutina para empezar</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border rounded-2xl">
          <DialogHeader><DialogTitle className="font-bold">{editing ? 'Editar' : 'Nueva'} Rutina</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nombre de la rutina" value={name} onChange={e => setName(e.target.value)} className="rounded-lg bg-secondary/50 border-border" />
            <Button className="w-full rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => saveMutation.mutate()}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
