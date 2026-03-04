import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { ALL_FIELDS } from './fields';
import { Activity, Scale, Ruler, ArrowLeftRight } from 'lucide-react';
import { differenceInYears } from 'date-fns';

interface Props {
  latestMeasurement: any | null;
}

interface IndexCard {
  label: string;
  value: string;
  status: 'good' | 'warning' | 'neutral';
  icon: React.ReactNode;
  detail?: string;
}

function bmiCategory(bmi: number): { status: 'good' | 'warning' | 'neutral'; label: string } {
  if (bmi < 18.5) return { status: 'warning', label: 'Bajo peso' };
  if (bmi < 25) return { status: 'good', label: 'Normal' };
  if (bmi < 30) return { status: 'warning', label: 'Sobrepeso' };
  return { status: 'warning', label: 'Obesidad' };
}

function whrCategory(ratio: number, isMale = true): { status: 'good' | 'warning'; label: string } {
  const threshold = isMale ? 0.9 : 0.85;
  return ratio <= threshold
    ? { status: 'good', label: 'Saludable' }
    : { status: 'warning', label: 'Riesgo elevado' };
}

function symmetryPct(right: number, left: number): number {
  const max = Math.max(right, left);
  if (max === 0) return 100;
  return Math.round((Math.min(right, left) / max) * 100);
}

export function AnthropometricAnalysis({ latestMeasurement }: Props) {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const m = latestMeasurement;
  if (!m) return null;

  const heightCm = (profile as any)?.height_cm as number | null;
  const birthDate = (profile as any)?.birth_date as string | null;
  const sex = (profile as any)?.sex as string | null;
  const weight = m.weight_kg as number | null;

  const cards: IndexCard[] = [];

  // Age
  if (birthDate) {
    const age = differenceInYears(new Date(), new Date(birthDate));
    cards.push({ label: 'Edad', value: `${age} años`, status: 'neutral', icon: <Activity className="h-4 w-4" /> });
  }

  // BMI
  if (weight && heightCm) {
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    const cat = bmiCategory(bmi);
    cards.push({ label: 'IMC', value: bmi.toFixed(1), status: cat.status, icon: <Scale className="h-4 w-4" />, detail: cat.label });
  }

  // Waist-Hip Ratio
  if (m.waist_cm && m.hip_cm) {
    const ratio = m.waist_cm / m.hip_cm;
    const cat = whrCategory(ratio, sex !== 'female');
    cards.push({ label: 'Cintura / Cadera', value: ratio.toFixed(2), status: cat.status, icon: <Ruler className="h-4 w-4" />, detail: cat.label });
  }

  // Waist-Height Ratio
  if (m.waist_cm && heightCm) {
    const ratio = m.waist_cm / heightCm;
    const status: 'good' | 'warning' = ratio < 0.5 ? 'good' : 'warning';
    cards.push({ label: 'Cintura / Altura', value: ratio.toFixed(2), status, icon: <Ruler className="h-4 w-4" />, detail: status === 'good' ? 'Saludable' : 'Riesgo' });
  }

  // Bilateral symmetry
  const symPairs: { label: string; rightKey: string; leftKey: string }[] = [
    { label: 'Bíceps contraído', rightKey: 'bicep_right_contracted_cm', leftKey: 'bicep_left_contracted_cm' },
    { label: 'Bíceps relajado', rightKey: 'bicep_right_relaxed_cm', leftKey: 'bicep_left_relaxed_cm' },
    { label: 'Muslo relajado', rightKey: 'thigh_right_relaxed_cm', leftKey: 'thigh_left_relaxed_cm' },
    { label: 'Muslo contraído', rightKey: 'thigh_right_contracted_cm', leftKey: 'thigh_left_contracted_cm' },
    { label: 'Gemelo', rightKey: 'calf_right_cm', leftKey: 'calf_left_cm' },
  ];

  const symResults = symPairs
    .filter(p => m[p.rightKey] != null && m[p.leftKey] != null)
    .map(p => {
      const pct = symmetryPct(m[p.rightKey], m[p.leftKey]);
      const diff = Math.abs(m[p.rightKey] - m[p.leftKey]).toFixed(1);
      return { ...p, pct, diff, right: m[p.rightKey], left: m[p.leftKey] };
    });

  if (cards.length === 0 && symResults.length === 0) return null;

  const statusColors = {
    good: 'text-green-400 bg-green-400/10 border-green-400/20',
    warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    neutral: 'text-muted-foreground bg-secondary/50 border-border',
  };

  return (
    <div className="mb-4 space-y-3">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        Análisis Antropométrico
      </h3>

      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {cards.map(c => (
            <div key={c.label} className={`rounded-xl border p-3 ${statusColors[c.status]}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {c.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wide">{c.label}</span>
              </div>
              <p className="text-lg font-black">{c.value}</p>
              {c.detail && <p className="text-[10px] opacity-80">{c.detail}</p>}
            </div>
          ))}
        </div>
      )}

      {symResults.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold">Simetría Bilateral</span>
          </div>
          <div className="space-y-2">
            {symResults.map(s => {
              const isGood = s.pct >= 95;
              return (
                <div key={s.label}>
                  <div className="flex justify-between items-center text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={`font-bold ${isGood ? 'text-green-400' : 'text-amber-400'}`}>
                      {s.pct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-muted-foreground">D: <span className="font-mono font-bold text-foreground">{s.right} cm</span></span>
                    <span className="text-muted-foreground">I: <span className="font-mono font-bold text-foreground">{s.left} cm</span></span>
                    <span className="text-muted-foreground ml-auto">Δ {s.diff} cm</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isGood ? 'bg-green-400' : 'bg-amber-400'}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cards.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Completa tu altura y fecha de nacimiento en el perfil para ver IMC y más índices.
        </p>
      )}
    </div>
  );
}
