import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Ruler, Plus, TrendingUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Measurement {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  notes: string | null;
  created_at: string;
}

const FIELDS = [
  { key: 'weight_kg', label: 'Peso (kg)', placeholder: 'kg', color: 'hsl(20, 100%, 60%)' },
  { key: 'body_fat_pct', label: 'Grasa (%)', placeholder: '%', color: 'hsl(40, 90%, 55%)' },
  { key: 'chest_cm', label: 'Pecho (cm)', placeholder: 'cm', color: 'hsl(200, 80%, 55%)' },
  { key: 'waist_cm', label: 'Cintura (cm)', placeholder: 'cm', color: 'hsl(340, 80%, 55%)' },
  { key: 'arm_cm', label: 'Brazo (cm)', placeholder: 'cm', color: 'hsl(130, 60%, 50%)' },
  { key: 'thigh_cm', label: 'Muslo (cm)', placeholder: 'cm', color: 'hsl(270, 60%, 60%)' },
] as const;

export default function Measurements() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [chartField, setChartField] = useState<string>('weight_kg');

  const { data: measurements } = useQuery({
    queryKey: ['measurements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Measurement[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const row: any = { user_id: user.id, date: form.date || format(new Date(), 'yyyy-MM-dd') };
      for (const f of FIELDS) {
        if (form[f.key]?.trim()) row[f.key] = Number(form[f.key]);
      }
      if (form.notes?.trim()) row.notes = form.notes;
      const { error } = await supabase.from('body_measurements').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      setForm({});
      setShowForm(false);
      toast.success('Medida registrada');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('body_measurements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      toast.success('Medida eliminada');
    },
  });

  const selectedField = FIELDS.find(f => f.key === chartField)!;
  const chartData = [...(measurements ?? [])]
    .filter(m => (m as any)[chartField] != null)
    .reverse()
    .map(m => ({ date: m.date.slice(5), value: (m as any)[chartField] }));

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-4 flex items-center gap-2">
        <Ruler className="h-5 w-5 text-primary" />
        Medidas Corporales
      </h1>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold">Evolución</h3>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {FIELDS.map(f => (
              <button
                key={f.key}
                onClick={() => setChartField(f.key)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                  chartField === f.key ? 'gradient-primary text-primary-foreground glow-primary' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {f.label.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-card border border-border p-3">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 12% 16%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(225 12% 16%)', background: 'hsl(225 14% 11%)' }}
                  formatter={(v: number) => [`${v}`, selectedField.label]}
                />
                <Line type="monotone" dataKey="value" stroke={selectedField.color} strokeWidth={2} dot={{ r: 3, fill: selectedField.color }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="p-4 rounded-xl bg-card border border-border space-y-3 mb-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Fecha</Label>
            <Input
              type="date"
              value={form.date || format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="rounded-lg bg-secondary/50 border-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-xs font-semibold text-muted-foreground">{f.label}</Label>
                <Input
                  inputMode="decimal"
                  placeholder={f.placeholder}
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="rounded-lg bg-secondary/50 border-border"
                />
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Notas</Label>
            <Textarea
              placeholder="Notas opcionales..."
              value={form.notes ?? ''}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="rounded-lg bg-secondary/50 border-border min-h-[50px]"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => addMutation.mutate()}>
              Guardar
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setForm({}); }}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button className="w-full mb-4 rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />Registrar medida
        </Button>
      )}

      {/* History */}
      <div className="space-y-2">
        {(measurements ?? []).map(m => (
          <div key={m.id} className="p-3 rounded-xl bg-card border border-border">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-primary">{m.date}</span>
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
                    <AlertDialogAction onClick={() => deleteMutation.mutate(m.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {FIELDS.map(f => {
                const val = (m as any)[f.key];
                if (val == null) return null;
                return (
                  <div key={f.key} className="bg-secondary/50 rounded-lg px-2 py-1.5">
                    <p className="text-[9px] text-muted-foreground">{f.label.split(' ')[0]}</p>
                    <p className="text-xs font-mono font-bold">{val} {f.placeholder}</p>
                  </div>
                );
              })}
            </div>
            {m.notes && <p className="text-xs text-muted-foreground mt-1.5">{m.notes}</p>}
          </div>
        ))}
        {(measurements ?? []).length === 0 && !showForm && (
          <p className="text-center text-muted-foreground text-sm py-8">Sin medidas aún. Registra tu primera medida.</p>
        )}
      </div>
    </div>
  );
}
