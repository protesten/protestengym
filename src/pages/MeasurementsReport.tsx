import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getProfile } from '@/lib/api';
import { exportElementAsImage, shareElementAsImage } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Share2, TrendingUp, TrendingDown, Minus, Scale, Ruler, Activity, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { ALL_FIELDS, FIELD_SECTIONS } from '@/components/measurements/fields';

interface FieldDelta {
  key: string;
  label: string;
  current: number;
  previous: number;
  diff: number;
  pct: number;
  unit: string;
}

function symmetryPct(a: number, b: number) {
  const max = Math.max(a, b);
  return max === 0 ? 100 : Math.round((Math.min(a, b) / max) * 100);
}

export default function MeasurementsReport() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const targetDate = subMonths(new Date(), monthOffset);
  const from = format(startOfMonth(targetDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(targetDate), 'yyyy-MM-dd');
  const monthLabel = format(targetDate, 'MMMM yyyy', { locale: es });

  const prevDate = subMonths(targetDate, 1);
  const prevFrom = format(startOfMonth(prevDate), 'yyyy-MM-dd');
  const prevTo = format(endOfMonth(prevDate), 'yyyy-MM-dd');

  const { data: currentMeasurements, isLoading } = useQuery({
    queryKey: ['measurements-report', from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false });
      return data ?? [];
    },
  });

  const { data: prevMeasurements } = useQuery({
    queryKey: ['measurements-report', prevFrom, prevTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .gte('date', prevFrom)
        .lte('date', prevTo)
        .order('date', { ascending: false });
      return data ?? [];
    },
  });

  const latest = currentMeasurements?.[0];
  const prevLatest = prevMeasurements?.[0];

  // Compute deltas for fields that have values in both months
  const deltas: FieldDelta[] = [];
  if (latest && prevLatest) {
    for (const f of ALL_FIELDS) {
      const cur = latest[f.key as keyof typeof latest] as number | null;
      const prev = prevLatest[f.key as keyof typeof prevLatest] as number | null;
      if (cur != null && prev != null && prev !== 0) {
        const diff = Math.round((cur - prev) * 10) / 10;
        const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
        deltas.push({ key: f.key, label: f.label, current: cur, previous: prev, diff, pct, unit: f.unit });
      }
    }
  }

  // Health indices
  const heightCm = (profile as any)?.height_cm as number | null;
  const birthDate = (profile as any)?.birth_date as string | null;
  const weight = latest?.weight_kg as number | null;
  const prevWeight = prevLatest?.weight_kg as number | null;

  const bmi = weight && heightCm ? weight / ((heightCm / 100) ** 2) : null;
  const prevBmi = prevWeight && heightCm ? prevWeight / ((heightCm / 100) ** 2) : null;
  const whr = latest?.waist_cm && latest?.hip_cm ? (latest.waist_cm as number) / (latest.hip_cm as number) : null;
  const prevWhr = prevLatest?.waist_cm && prevLatest?.hip_cm ? (prevLatest.waist_cm as number) / (prevLatest.hip_cm as number) : null;
  const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : null;

  // Symmetry
  const symPairs = [
    { label: 'Bíceps contr.', rk: 'bicep_right_contracted_cm', lk: 'bicep_left_contracted_cm' },
    { label: 'Bíceps relaj.', rk: 'bicep_right_relaxed_cm', lk: 'bicep_left_relaxed_cm' },
    { label: 'Muslo contr.', rk: 'thigh_right_contracted_cm', lk: 'thigh_left_contracted_cm' },
    { label: 'Muslo relaj.', rk: 'thigh_right_relaxed_cm', lk: 'thigh_left_relaxed_cm' },
    { label: 'Gemelo', rk: 'calf_right_cm', lk: 'calf_left_cm' },
  ];

  const symResults = latest ? symPairs
    .filter(p => (latest as any)[p.rk] != null && (latest as any)[p.lk] != null)
    .map(p => ({
      ...p,
      pct: symmetryPct((latest as any)[p.rk], (latest as any)[p.lk]),
      diff: Math.abs((latest as any)[p.rk] - (latest as any)[p.lk]).toFixed(1),
    })) : [];

  const handleDownload = async () => {
    if (!cardRef.current) return;
    await exportElementAsImage(cardRef.current, `medidas-${monthLabel}.png`);
    toast.success('Imagen descargada');
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    await shareElementAsImage(cardRef.current, `Medidas ${monthLabel}`);
  };

  const measurementCount = currentMeasurements?.length ?? 0;

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm font-medium hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Volver
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black">Informe de Medidas</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Generando informe...</div>
      ) : measurementCount === 0 ? (
        <div className="text-center text-muted-foreground py-12">Sin medidas registradas en {monthLabel}.</div>
      ) : (
        <>
          <div ref={cardRef} className="rounded-2xl bg-card border border-border p-5 space-y-4">
            {/* Header */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Informe de Medidas</p>
              <h2 className="text-2xl font-black capitalize text-primary mt-1">{monthLabel}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{measurementCount} registro{measurementCount > 1 ? 's' : ''}</p>
            </div>

            {/* Health indices */}
            {(bmi || age || whr) && (
              <div className="grid grid-cols-2 gap-2">
                {age != null && (
                  <IndexBox icon={<Activity className="h-4 w-4" />} label="Edad" value={`${age}`} unit="años" />
                )}
                {bmi != null && (
                  <IndexBox
                    icon={<Scale className="h-4 w-4" />}
                    label="IMC"
                    value={bmi.toFixed(1)}
                    delta={prevBmi ? Math.round((bmi - prevBmi) * 10) / 10 : undefined}
                    status={bmi < 25 ? 'good' : 'warning'}
                  />
                )}
                {whr != null && (
                  <IndexBox
                    icon={<Ruler className="h-4 w-4" />}
                    label="Cintura/Cadera"
                    value={whr.toFixed(2)}
                    delta={prevWhr ? Math.round((whr - prevWhr) * 100) / 100 : undefined}
                    status={whr <= 0.9 ? 'good' : 'warning'}
                  />
                )}
                {weight != null && (
                  <IndexBox
                    icon={<Scale className="h-4 w-4" />}
                    label="Peso"
                    value={weight.toString()}
                    unit="kg"
                    delta={prevWeight ? Math.round((weight - prevWeight) * 10) / 10 : undefined}
                  />
                )}
              </div>
            )}

            {/* Deltas by section */}
            {deltas.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Cambios vs mes anterior
                </p>
                <div className="space-y-1">
                  {deltas.map(d => (
                    <div key={d.key} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg bg-secondary/30">
                      <span className="text-muted-foreground text-xs truncate flex-1">{d.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{d.previous}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono text-xs font-bold">{d.current}</span>
                        <DeltaBadge diff={d.diff} unit={d.unit} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Symmetry */}
            {symResults.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3" /> Simetría Bilateral
                </p>
                <div className="space-y-1.5">
                  {symResults.map(s => {
                    const isGood = s.pct >= 95;
                    return (
                      <div key={s.label} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-secondary/30">
                        <span className="text-muted-foreground">{s.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Δ {s.diff} cm</span>
                          <span className={`font-bold ${isGood ? 'text-green-400' : 'text-amber-400'}`}>{s.pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!prevLatest && deltas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Sin datos del mes anterior para comparar. Registra medidas el próximo mes para ver tendencias.
              </p>
            )}

            {!heightCm && (
              <p className="text-xs text-amber-400 text-center">
                Añade tu altura en el perfil para ver el IMC y más índices.
              </p>
            )}

            <p className="text-center text-[9px] text-muted-foreground/40 font-mono pt-2">GymTracker</p>
          </div>

          <div className="flex gap-2 mt-4">
            <Button className="flex-1 gradient-primary text-primary-foreground border-0 rounded-xl" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />Descargar
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl border-border" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />Compartir
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function IndexBox({ icon, label, value, unit, delta, status }: {
  icon: React.ReactNode; label: string; value: string; unit?: string;
  delta?: number; status?: 'good' | 'warning';
}) {
  const statusClass = status === 'good'
    ? 'bg-green-400/10 border-green-400/20 text-green-400'
    : status === 'warning'
    ? 'bg-amber-400/10 border-amber-400/20 text-amber-400'
    : 'bg-secondary/30 border-border text-muted-foreground';

  return (
    <div className={`rounded-xl border p-3 ${statusClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-black">
        {value}
        {unit && <span className="text-xs font-normal ml-1">{unit}</span>}
      </p>
      {delta != null && delta !== 0 && (
        <p className="text-[10px] font-mono">
          {delta > 0 ? '+' : ''}{delta}
        </p>
      )}
    </div>
  );
}

function DeltaBadge({ diff, unit }: { diff: number; unit: string }) {
  if (diff === 0) return <span className="text-[10px] text-muted-foreground font-mono"><Minus className="h-3 w-3 inline" /></span>;
  const isUp = diff > 0;
  return (
    <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{diff}
    </span>
  );
}
