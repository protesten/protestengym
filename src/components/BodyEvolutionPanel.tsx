import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ALL_FIELDS, FIELD_SECTIONS, type MeasurementField } from '@/components/measurements/fields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUp, ArrowDown, Minus, Ruler } from 'lucide-react';
import type { DateRange } from '@/db/calculations';

interface Props {
  dateRange?: DateRange;
}

export function BodyEvolutionPanel({ dateRange }: Props) {
  const [selectedField, setSelectedField] = useState('weight_kg');
  const [compareField, setCompareField] = useState<string>('');

  const { data: measurements } = useQuery({
    queryKey: ['bodyMeasurements'],
    queryFn: async () => {
      const { data } = await supabase
        .from('body_measurements')
        .select('*')
        .order('date', { ascending: false });
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!measurements) return [];
    let list = [...measurements];
    if (dateRange) {
      list = list.filter(m => m.date >= dateRange.from && m.date <= dateRange.to);
    }
    return list;
  }, [measurements, dateRange]);

  const field = ALL_FIELDS.find(f => f.key === selectedField)!;
  const compField = compareField ? ALL_FIELDS.find(f => f.key === compareField) : null;

  const chartData = useMemo(() => {
    return [...filtered]
      .filter(m => (m as any)[selectedField] != null)
      .reverse()
      .map(m => ({
        date: (m.date as string).slice(5),
        value: (m as any)[selectedField] as number,
        ...(compField ? { compare: (m as any)[compField.key] as number } : {}),
      }));
  }, [filtered, selectedField, compField]);

  // Summary stats
  const stats = useMemo(() => {
    const values = filtered
      .filter(m => (m as any)[selectedField] != null)
      .map(m => (m as any)[selectedField] as number);
    if (values.length === 0) return null;
    const latest = values[0];
    const oldest = values[values.length - 1];
    const diff = latest - oldest;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { latest, oldest, diff, min, max, count: values.length };
  }, [filtered, selectedField]);

  // Recent changes table
  const recentChanges = useMemo(() => {
    const relevant = filtered.filter(m => (m as any)[selectedField] != null);
    return relevant.slice(0, 5).map((m, i) => {
      const prev = relevant[i + 1];
      const val = (m as any)[selectedField] as number;
      const prevVal = prev ? (prev as any)[selectedField] as number : null;
      const delta = prevVal != null ? val - prevVal : null;
      return { date: m.date, value: val, delta };
    });
  }, [filtered, selectedField]);

  return (
    <div className="space-y-4">
      {/* Field selectors */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Medida principal</label>
          <Select value={selectedField} onValueChange={v => { setSelectedField(v); if (v === compareField) setCompareField(''); }}>
            <SelectTrigger className="rounded-lg bg-card border-border text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_SECTIONS.map(s => (
                <div key={s.key}>
                  <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground">{s.title}</div>
                  {s.fields.map(f => (
                    <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>
                  ))}
                </div>
              ))}
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground">General</div>
              <SelectItem value="weight_kg" className="text-xs">Peso (kg)</SelectItem>
              <SelectItem value="body_fat_pct" className="text-xs">Grasa (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground font-semibold mb-1 block">Comparar con</label>
          <Select value={compareField} onValueChange={setCompareField}>
            <SelectTrigger className="rounded-lg bg-card border-border text-xs h-8">
              <SelectValue placeholder="Ninguno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Ninguno</SelectItem>
              {ALL_FIELDS.filter(f => f.key !== selectedField).map(f => (
                <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="rounded-xl bg-card border border-border p-3">
          <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Evolución — {field.label}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin - 1', 'dataMax + 1']} />
              {compField && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin - 1', 'dataMax + 1']} />
              )}
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                formatter={(v: number, name: string) => [v, name === 'value' ? field.label : compField?.label ?? '']}
              />
              <Line yAxisId="left" type="monotone" dataKey="value" name={field.label} stroke={field.color} strokeWidth={2} dot={{ r: 3, fill: field.color }} />
              {compField && (
                <Line yAxisId="right" type="monotone" dataKey="compare" name={compField.label} stroke={compField.color} strokeWidth={2} dot={{ r: 3, fill: compField.color }} strokeDasharray="5 5" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-center text-muted-foreground text-sm py-6">
          Se necesitan al menos 2 registros de "{field.label}" para mostrar la evolución.
        </p>
      )}

      {/* Stats summary */}
      {stats && stats.count >= 2 && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground">Actual</p>
            <p className="text-sm font-mono font-black text-primary">{stats.latest}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground">Cambio</p>
            <p className={`text-sm font-mono font-black flex items-center justify-center gap-0.5 ${stats.diff > 0 ? 'text-green-400' : stats.diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
              {stats.diff > 0 ? <ArrowUp className="h-3 w-3" /> : stats.diff < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(Math.round(stats.diff * 10) / 10)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground">Mín</p>
            <p className="text-sm font-mono font-bold">{stats.min}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-muted-foreground">Máx</p>
            <p className="text-sm font-mono font-bold">{stats.max}</p>
          </div>
        </div>
      )}

      {/* Recent changes */}
      {recentChanges.length > 0 && (
        <div>
          <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-primary" />
            Últimos registros — {field.label}
          </h3>
          <div className="space-y-1">
            {recentChanges.map((r, i) => (
              <div key={i} className="flex justify-between items-center px-3 py-2 rounded-lg bg-card border border-border">
                <span className="text-xs text-muted-foreground">{r.date}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold">{r.value} {field.unit}</span>
                  {r.delta != null && (
                    <span className={`text-[10px] font-mono flex items-center gap-0.5 ${r.delta > 0 ? 'text-green-400' : r.delta < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {r.delta > 0 ? '+' : ''}{Math.round(r.delta * 10) / 10}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
