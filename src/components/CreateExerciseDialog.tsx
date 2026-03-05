import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMuscles, createExercise } from '@/lib/api';
import { TRACKING_LABELS, type TrackingType } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MuscleSelect from '@/components/MuscleSelect';
import { toast } from 'sonner';

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (exercise: { id: string; name: string }) => void;
}

type ExForm = { name: string; tracking_type: TrackingType; primary_muscle_ids: number[]; secondary_muscle_ids: number[]; video_url: string };

export default function CreateExerciseDialog({ open, onOpenChange, onCreated }: CreateExerciseDialogProps) {
  const queryClient = useQueryClient();
  const { data: muscles } = useQuery({ queryKey: ['muscles'], queryFn: getMuscles });
  const [form, setForm] = useState<ExForm>({ name: '', tracking_type: 'weight_reps', primary_muscle_ids: [], secondary_muscle_ids: [], video_url: '' });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Nombre requerido');
      if (form.primary_muscle_ids.length === 0) throw new Error('Al menos un músculo primario requerido');
      return await createExercise({ ...form, video_url: form.video_url.trim() || null } as any);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['allExercises'] });
      toast.success('Ejercicio creado');
      setForm({ name: '', tracking_type: 'weight_reps', primary_muscle_ids: [], secondary_muscle_ids: [], video_url: '' });
      onOpenChange(false);
      onCreated?.({ id: data.id, name: data.name });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-bold">Nuevo ejercicio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Nombre</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-lg bg-secondary/50 border-border" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Tipo de tracking</Label>
            <Select value={form.tracking_type} onValueChange={v => setForm(f => ({ ...f, tracking_type: v as TrackingType }))}>
              <SelectTrigger className="rounded-lg bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TRACKING_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Músculos primarios</Label>
            <MuscleSelect muscles={muscles} value={form.primary_muscle_ids} onChange={v => setForm(f => ({ ...f, primary_muscle_ids: v }))} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Músculos secundarios</Label>
            <MuscleSelect muscles={muscles} value={form.secondary_muscle_ids} onChange={v => setForm(f => ({ ...f, secondary_muscle_ids: v }))} />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">URL de video (opcional)</Label>
            <Input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." className="rounded-lg bg-secondary/50 border-border" />
          </div>
          <Button className="w-full rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando...' : 'Crear ejercicio'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
