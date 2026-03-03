import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flame, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface WarmupSet {
  weight: number;
  reps: number;
  label: string;
}

function generateWarmup(workWeight: number, barWeight: number = 20): WarmupSet[] {
  if (workWeight <= barWeight) return [];
  
  const sets: WarmupSet[] = [];
  const percentages = [
    { pct: 0, reps: 10, label: 'Barra vacía' },
    { pct: 0.5, reps: 8, label: '50%' },
    { pct: 0.7, reps: 5, label: '70%' },
    { pct: 0.85, reps: 3, label: '85%' },
    { pct: 0.92, reps: 1, label: '92%' },
  ];

  for (const p of percentages) {
    const raw = p.pct === 0 ? barWeight : workWeight * p.pct;
    // Round to nearest 2.5
    const weight = Math.max(barWeight, Math.round(raw / 2.5) * 2.5);
    if (weight >= workWeight) break;
    // Avoid duplicate weights
    if (sets.length > 0 && sets[sets.length - 1].weight === weight) continue;
    sets.push({ weight, reps: p.reps, label: p.label });
  }

  return sets;
}

export function WarmupCalculator({ exerciseName }: { exerciseName: string }) {
  const [workWeight, setWorkWeight] = useState('');
  const [barWeight, setBarWeight] = useState('20');
  const [open, setOpen] = useState(false);

  const ww = Number(workWeight);
  const bw = Number(barWeight);
  const sets = ww > 0 ? generateWarmup(ww, bw > 0 ? bw : 20) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Calculadora de calentamiento" onClick={e => e.stopPropagation()}>
          <Flame className="h-3.5 w-3.5 text-orange-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            Calentamiento — {exerciseName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground font-semibold">Peso de trabajo (kg)</label>
              <Input
                inputMode="decimal"
                placeholder="100"
                value={workWeight}
                onChange={e => setWorkWeight(e.target.value)}
                className="rounded-lg bg-secondary/50 border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold">Peso barra (kg)</label>
              <Input
                inputMode="decimal"
                placeholder="20"
                value={barWeight}
                onChange={e => setBarWeight(e.target.value)}
                className="rounded-lg bg-secondary/50 border-border"
              />
            </div>
          </div>

          {sets.length > 0 ? (
            <div className="space-y-1.5">
              {sets.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground w-10">{s.label}</span>
                    <span className="text-sm font-mono font-bold">{s.weight} kg</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-semibold">× {s.reps} reps</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-primary w-10">100%</span>
                  <span className="text-sm font-mono font-black text-primary">{ww} kg</span>
                </div>
                <span className="text-xs text-primary font-bold">TRABAJO</span>
              </div>
            </div>
          ) : ww > 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Peso demasiado bajo para generar calentamiento</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">Introduce el peso de trabajo para generar series</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
