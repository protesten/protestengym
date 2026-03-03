import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMuscles, getExercises, createExercise, updateExercise, deleteExercise,
  getPredefinedExercises, createPredefinedExercise, updatePredefinedExercise, deletePredefinedExercise,
  isAdmin, type Exercise, type PredefinedExercise,
} from '@/lib/api';
import { TRACKING_LABELS, type TrackingType } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import MuscleSelect from '@/components/MuscleSelect';

type ExForm = { name: string; tracking_type: TrackingType; primary_muscle_ids: number[]; secondary_muscle_ids: number[] };

export default function Exercises() {
  const queryClient = useQueryClient();
  const { data: muscles } = useQuery({ queryKey: ['muscles'], queryFn: getMuscles });
  const { data: exercises } = useQuery({ queryKey: ['exercises'], queryFn: getExercises });
  const { data: predefined } = useQuery({ queryKey: ['predefined_exercises'], queryFn: getPredefinedExercises });
  const { data: admin } = useQuery({ queryKey: ['isAdmin'], queryFn: isAdmin });
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<Exercise | null>(null);
  const [editingPredefined, setEditingPredefined] = useState<PredefinedExercise | null>(null);
  const [isPredefinedMode, setIsPredefinedMode] = useState(false);
  const [form, setForm] = useState<ExForm>({ name: '', tracking_type: 'weight_reps', primary_muscle_ids: [], secondary_muscle_ids: [] });

  const filteredPersonal = exercises?.filter(e => e.name.toLowerCase().includes(search.toLowerCase())) ?? [];
  const filteredPredefined = predefined?.filter(e => e.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  const muscleName = (id: number) => muscles?.find(m => m.id === id)?.name ?? '';
  const muscleNames = (ids: number[]) => ids.map(id => muscleName(id)).filter(Boolean).join(', ');

  const savePersonalMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nombre requerido');
      if (form.primary_muscle_ids.length === 0) throw new Error('Al menos un músculo primario requerido');
      if (editingPersonal) await updateExercise(editingPersonal.id, form);
      else await createExercise(form);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); toast.success(editingPersonal ? 'Ejercicio actualizado' : 'Ejercicio creado'); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const savePredefinedMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nombre requerido');
      if (form.primary_muscle_ids.length === 0) throw new Error('Al menos un músculo primario requerido');
      if (editingPredefined) await updatePredefinedExercise(editingPredefined.id, form);
      else await createPredefinedExercise(form);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['predefined_exercises'] }); toast.success(editingPredefined ? 'Ejercicio actualizado' : 'Ejercicio predefinido creado'); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const removePersonalMutation = useMutation({ mutationFn: deleteExercise, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); toast.success('Ejercicio eliminado'); } });
  const removePredefinedMutation = useMutation({ mutationFn: deletePredefinedExercise, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['predefined_exercises'] }); toast.success('Ejercicio predefinido eliminado'); } });

  function openCreatePersonal() { setEditingPersonal(null); setEditingPredefined(null); setIsPredefinedMode(false); setForm({ name: '', tracking_type: 'weight_reps', primary_muscle_ids: [], secondary_muscle_ids: [] }); setDialogOpen(true); }
  function openCreatePredefined() { setEditingPersonal(null); setEditingPredefined(null); setIsPredefinedMode(true); setForm({ name: '', tracking_type: 'weight_reps', primary_muscle_ids: [], secondary_muscle_ids: [] }); setDialogOpen(true); }
  function openEditPersonal(ex: Exercise) { setEditingPersonal(ex); setEditingPredefined(null); setIsPredefinedMode(false); setForm({ name: ex.name, tracking_type: ex.tracking_type, primary_muscle_ids: ex.primary_muscle_ids ?? [], secondary_muscle_ids: ex.secondary_muscle_ids ?? [] }); setDialogOpen(true); }
  function openEditPredefined(ex: PredefinedExercise) { setEditingPredefined(ex); setEditingPersonal(null); setIsPredefinedMode(true); setForm({ name: ex.name, tracking_type: ex.tracking_type, primary_muscle_ids: ex.primary_muscle_ids ?? [], secondary_muscle_ids: ex.secondary_muscle_ids ?? [] }); setDialogOpen(true); }
  function handleSave() { if (isPredefinedMode) savePredefinedMutation.mutate(); else savePersonalMutation.mutate(); }

  function renderExerciseRow(ex: { id: string; name: string; tracking_type: string; primary_muscle_ids: number[] | null; secondary_muscle_ids: number[] | null }, isPred: boolean) {
    return (
      <div key={ex.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{ex.name}</p>
            {isPred && <Badge className="text-[10px] px-1.5 py-0 bg-secondary text-secondary-foreground border-0">Predefinido</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {TRACKING_LABELS[ex.tracking_type as TrackingType]} · {muscleNames(ex.primary_muscle_ids ?? [])}
            {(ex.secondary_muscle_ids ?? []).length > 0 ? ` / ${muscleNames(ex.secondary_muscle_ids ?? [])}` : ''}
          </p>
        </div>
        {isPred && admin ? (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => openEditPredefined(ex as PredefinedExercise)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => removePredefinedMutation.mutate(ex.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ) : !isPred ? (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => openEditPersonal(ex as Exercise)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => removePersonalMutation.mutate(ex.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-4">Ejercicios</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar ejercicio..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl bg-card border-border h-11" />
      </div>

      <Tabs defaultValue="predefined">
        <TabsList className="w-full bg-secondary/50 rounded-xl p-1">
          <TabsTrigger value="predefined" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">Predefinidos ({filteredPredefined.length})</TabsTrigger>
          <TabsTrigger value="personal" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground">Mis ejercicios ({filteredPersonal.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="predefined">
          {admin && (
            <div className="mb-3">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-lg" onClick={openCreatePredefined}><Plus className="h-4 w-4 mr-1" />Nuevo predefinido</Button>
            </div>
          )}
          <div className="space-y-2">{filteredPredefined.map(ex => renderExerciseRow(ex, true))}{filteredPredefined.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No hay ejercicios predefinidos</p>}</div>
        </TabsContent>

        <TabsContent value="personal">
          <div className="mb-3">
            <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-lg" onClick={openCreatePersonal}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
          </div>
          <div className="space-y-2">{filteredPersonal.map(ex => renderExerciseRow(ex, false))}{filteredPersonal.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">No hay ejercicios personales</p>}</div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm bg-card border-border rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold">
              {isPredefinedMode ? (editingPredefined ? 'Editar predefinido' : 'Nuevo predefinido') : (editingPersonal ? 'Editar ejercicio' : 'Nuevo ejercicio')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-xs font-semibold text-muted-foreground">Nombre</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-lg bg-secondary/50 border-border" /></div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">Tipo de tracking</Label>
              <Select value={form.tracking_type} onValueChange={v => setForm(f => ({ ...f, tracking_type: v as TrackingType }))}>
                <SelectTrigger className="rounded-lg bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TRACKING_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold text-muted-foreground">Músculos primarios</Label><MuscleSelect muscles={muscles} value={form.primary_muscle_ids} onChange={v => setForm(f => ({ ...f, primary_muscle_ids: v }))} /></div>
            <div><Label className="text-xs font-semibold text-muted-foreground">Músculos secundarios</Label><MuscleSelect muscles={muscles} value={form.secondary_muscle_ids} onChange={v => setForm(f => ({ ...f, secondary_muscle_ids: v }))} /></div>
            <Button className="w-full rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={handleSave}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
