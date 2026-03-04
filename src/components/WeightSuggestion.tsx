import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getWeightHistoryForExercise } from '@/lib/api';

interface Props {
  exerciseId: string;
  exerciseName: string;
  onApply: (weight: number) => void;
}

export function WeightSuggestion({ exerciseId, exerciseName, onApply }: Props) {
  const [open, setOpen] = useState(false);

  const { data: history } = useQuery({
    queryKey: ['weight_history', exerciseId],
    queryFn: () => getWeightHistoryForExercise(exerciseId),
    enabled: open,
  });

  const suggestedWeight = history?.length
    ? Math.round((history.reduce((sum, h) => sum + h.weight, 0) / history.length) * 2) / 2
    : null;

  const maxWeight = history?.length
    ? Math.max(...history.map(h => h.weight))
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Peso sugerido" onClick={e => e.stopPropagation()}>
          <Calculator className="h-3.5 w-3.5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 bg-card border-border rounded-xl" align="end" side="bottom">
        <p className="text-xs font-bold mb-2 truncate">{exerciseName}</p>
        {suggestedWeight != null ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground text-xs">Media</span>
              <span className="font-mono font-bold">{suggestedWeight} kg</span>
            </div>
            {maxWeight != null && maxWeight !== suggestedWeight && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">Máximo</span>
                <span className="font-mono font-semibold text-primary">{maxWeight} kg</span>
              </div>
            )}
            <Button
              size="sm"
              className="w-full rounded-lg text-xs"
              onClick={() => { onApply(suggestedWeight); setOpen(false); }}
            >
              Aplicar {suggestedWeight} kg
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Sin historial de peso</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
