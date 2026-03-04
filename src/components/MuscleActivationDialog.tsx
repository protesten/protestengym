import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllMusclesIncludingInactive, toggleMuscleActive } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MuscleActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECOVERY_LABELS: Record<string, { label: string; color: string }> = {
  fast: { label: 'Rápida', color: 'hsl(140 60% 45%)' },
  medium: { label: 'Media', color: 'hsl(45 90% 50%)' },
  slow: { label: 'Lenta', color: 'hsl(25 90% 50%)' },
};

export default function MuscleActivationDialog({ open, onOpenChange }: MuscleActivationDialogProps) {
  const queryClient = useQueryClient();
  const { data: allMuscles } = useQuery({
    queryKey: ['allMuscles'],
    queryFn: getAllMusclesIncludingInactive,
    enabled: open,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => toggleMuscleActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muscles'] });
      queryClient.invalidateQueries({ queryKey: ['allMuscles'] });
    },
    onError: () => toast.error('Error al actualizar'),
  });

  // Group by body_region
  const grouped = new Map<string, typeof allMuscles>();
  (allMuscles ?? []).forEach(m => {
    const region = (m as any).body_region || 'Otros';
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region)!.push(m);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bold">Activar músculos</DialogTitle>
          <p className="text-xs text-muted-foreground">Activa los músculos que quieras usar en tus ejercicios</p>
        </DialogHeader>
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([region, muscles]) => (
            <div key={region}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{region}</h3>
              <div className="space-y-1.5">
                {muscles!.map(m => {
                  const recovery = RECOVERY_LABELS[(m as any).recovery_category] ?? RECOVERY_LABELS.medium;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm truncate">{m.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0" style={{ borderColor: recovery.color, color: recovery.color }}>
                          {recovery.label}
                        </Badge>
                      </div>
                      <Switch
                        checked={(m as any).is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: m.id, isActive: checked })}
                        className="shrink-0 ml-2"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
