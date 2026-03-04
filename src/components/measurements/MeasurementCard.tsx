import { Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ALL_FIELDS } from './fields';

interface Props {
  measurement: any;
  onDelete: (id: string) => void;
  onEdit?: (measurement: any) => void;
}

export function MeasurementCard({ measurement: m, onDelete, onEdit }: Props) {
  const filledFields = ALL_FIELDS.filter(f => m[f.key] != null);

  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-bold text-primary">{m.date}</span>
        <div className="flex gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => onEdit(m)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border rounded-2xl">
              <AlertDialogHeader><AlertDialogTitle>¿Eliminar medida?</AlertDialogTitle><AlertDialogDescription>No se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(m.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {filledFields.map(f => (
          <div key={f.key} className="bg-secondary/50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-muted-foreground">{f.label}</p>
            <p className="text-xs font-mono font-bold">{m[f.key]} {f.unit}</p>
          </div>
        ))}
      </div>
      {m.notes && <p className="text-xs text-muted-foreground mt-1.5">{m.notes}</p>}
    </div>
  );
}
