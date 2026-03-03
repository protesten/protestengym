import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';
import { updateExercise } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  exerciseId: string;
  exerciseNotes: string | null;
  source: 'personal' | 'predefined';
}

export function ExerciseNotePopover({ exerciseId, exerciseNotes, source }: Props) {
  const [notes, setNotes] = useState(exerciseNotes ?? '');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { setNotes(exerciseNotes ?? ''); }, [exerciseNotes]);

  const saveMutation = useMutation({
    mutationFn: () => updateExercise(exerciseId, { notes } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Nota guardada');
      setOpen(false);
    },
  });

  // Only personal exercises can be edited
  const canEdit = source === 'personal';
  const hasNote = !!exerciseNotes?.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6 shrink-0", hasNote ? "text-primary" : "text-muted-foreground/50")}
          onClick={e => e.stopPropagation()}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-card border-border rounded-xl" align="start" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-bold text-muted-foreground mb-2">Nota del ejercicio</p>
        {canEdit ? (
          <>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Agarre ancho, máquina ajuste 5..."
              className="text-sm min-h-[60px] rounded-lg bg-secondary/30 border-border mb-2"
            />
            <Button
              size="sm"
              className="w-full gradient-primary text-primary-foreground border-0 rounded-lg"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              Guardar
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            {exerciseNotes || 'Sin notas (ejercicio predefinido, no editable)'}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
