import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getBest1RMForExercise, getLatestBodyWeight } from '@/lib/api';
import { TRAINING_GOALS, BODYWEIGHT_EXERCISE_PATTERNS, type TrainingGoal } from '@/lib/constants';

interface Props {
  exerciseId: string;
  exerciseName: string;
  trainingGoal: TrainingGoal | null;
  onApply: (weight: number) => void;
}

function isBodyweightExercise(name: string): boolean {
  const lower = name.toLowerCase();
  return BODYWEIGHT_EXERCISE_PATTERNS.some(p => lower.includes(p));
}

export function WeightSuggestion({ exerciseId, exerciseName, trainingGoal, onApply }: Props) {
  const [open, setOpen] = useState(false);

  const { data: best1RM } = useQuery({
    queryKey: ['best_1rm', exerciseId],
    queryFn: () => getBest1RMForExercise(exerciseId),
    enabled: open,
  });

  const isBW = isBodyweightExercise(exerciseName);

  const { data: bodyWeight } = useQuery({
    queryKey: ['latest_body_weight'],
    queryFn: getLatestBodyWeight,
    enabled: open && isBW,
  });

  const oneRM = best1RM?.oneRM ?? null;

  const computeTarget = (goal: TrainingGoal): number | null => {
    if (!oneRM) return null;
    const pct = TRAINING_GOALS[goal].pct;
    let target = Math.round(oneRM * pct * 2) / 2; // round to 0.5kg
    if (isBW && bodyWeight) {
      target = Math.max(0, target - bodyWeight);
    }
    return target;
  };

  const activeGoal = trainingGoal ?? 'hypertrophy';
  const targetWeight = computeTarget(activeGoal);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Peso objetivo" onClick={e => e.stopPropagation()}>
          <Target className="h-3.5 w-3.5 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-card border-border rounded-xl" align="end" side="bottom">
        <p className="text-xs font-bold mb-2 truncate">{exerciseName}</p>
        
        {oneRM != null ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">1RM estimado</span>
              <span className="font-mono font-bold text-primary">{oneRM} kg</span>
            </div>

            {isBW && bodyWeight && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Peso corporal</span>
                <span className="font-mono font-semibold">{bodyWeight} kg</span>
              </div>
            )}

            <div className="border-t border-border pt-2 space-y-1.5">
              {(Object.entries(TRAINING_GOALS) as [TrainingGoal, typeof TRAINING_GOALS[TrainingGoal]][]).map(([key, goal]) => {
                const tw = computeTarget(key);
                const isActive = key === activeGoal;
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-secondary/50'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{goal.emoji}</span>
                      <span className={isActive ? 'font-bold text-primary' : 'text-muted-foreground'}>{goal.label}</span>
                      <span className="text-muted-foreground/60">({goal.reps}r)</span>
                    </span>
                    <span className="font-mono font-bold">
                      {tw != null ? `${tw} kg` : '-'}
                      {isBW && tw != null ? ' lastre' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {targetWeight != null && (
              <Button
                size="sm"
                className="w-full rounded-lg text-xs"
                onClick={() => { onApply(targetWeight); setOpen(false); }}
              >
                Aplicar {targetWeight} kg {isBW ? '(lastre)' : ''}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Sin historial de peso</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Inline target weight badge shown in exercise header
export function TargetWeightBadge({ exerciseId, exerciseName, trainingGoal }: { exerciseId: string; exerciseName: string; trainingGoal: TrainingGoal | null }) {
  const { data: best1RM } = useQuery({
    queryKey: ['best_1rm', exerciseId],
    queryFn: () => getBest1RMForExercise(exerciseId),
  });

  const isBW = isBodyweightExercise(exerciseName);
  const { data: bodyWeight } = useQuery({
    queryKey: ['latest_body_weight'],
    queryFn: getLatestBodyWeight,
    enabled: isBW,
  });

  const oneRM = best1RM?.oneRM ?? null;
  if (!oneRM) return null;

  const goal = trainingGoal ?? 'hypertrophy';
  const goalInfo = TRAINING_GOALS[goal];
  let target = Math.round(oneRM * goalInfo.pct * 2) / 2;
  if (isBW && bodyWeight) target = Math.max(0, target - bodyWeight);

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
      {goalInfo.emoji} {target}kg · {goalInfo.reps}r
    </span>
  );
}
