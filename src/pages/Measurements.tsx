import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getProfile } from '@/lib/api';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Ruler, Plus, Trash2, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MeasurementChart } from '@/components/measurements/MeasurementChart';
import { MeasurementCard } from '@/components/measurements/MeasurementCard';
import { FIELD_SECTIONS, ALL_FIELDS } from '@/components/measurements/fields';
import { ChevronDown } from 'lucide-react';
import { AnthropometricAnalysis } from '@/components/measurements/AnthropometricAnalysis';
import { estimateBodyFatNavy } from '@/lib/body-fat';

export default function Measurements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ upper: true, core: true, lower: true });

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const { data: measurements } = useQuery({
    queryKey: ['measurements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const row: any = { user_id: user.id, date: form.date || format(new Date(), 'yyyy-MM-dd') };
      for (const f of ALL_FIELDS) {
        if (form[f.key]?.trim()) row[f.key] = Number(form[f.key]);
      }
      // Auto-calculate body fat if not manually entered
      if (!form.body_fat_pct?.trim()) {
        const heightCm = (profile as any)?.height_cm as number | null;
        const sex = (profile as any)?.sex as string | null;
        const neck = row.neck_cm;
        const waist = row.waist_cm;
        const hip = row.hip_cm;
        if (heightCm && neck && waist) {
          const estimated = estimateBodyFatNavy({ sex: sex || 'male', heightCm, neckCm: neck, waistCm: waist, hipCm: hip });
          if (estimated !== null) {
            row.body_fat_pct = estimated;
          }
        }
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

  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          Medidas Corporales
        </h1>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/measurements-report')}>
          <FileBarChart className="h-4 w-4" />Informe
        </Button>
      </div>

      {/* Anthropometric Analysis */}
      <AnthropometricAnalysis latestMeasurement={measurements?.[0] ?? null} />

      {/* Chart */}
      <MeasurementChart measurements={measurements} />

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

          {/* Weight & body fat */}
          <div className="grid grid-cols-2 gap-2">
            {ALL_FIELDS.filter(f => f.key === 'weight_kg' || f.key === 'body_fat_pct').map(f => (
              <div key={f.key}>
                <Label className="text-xs font-semibold text-muted-foreground">{f.label}</Label>
                <Input
                  inputMode="decimal"
                  placeholder={f.unit}
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="rounded-lg bg-secondary/50 border-border"
                />
              </div>
            ))}
          </div>

          {/* Sections */}
          {FIELD_SECTIONS.map(section => (
            <Collapsible key={section.key} open={openSections[section.key]} onOpenChange={() => toggleSection(section.key)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5">
                <span className="text-xs font-bold text-primary">{section.title}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${openSections[section.key] ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {section.fields.map(f => (
                    <div key={f.key}>
                      <Label className="text-xs font-semibold text-muted-foreground">{f.label}</Label>
                      <Input
                        inputMode="decimal"
                        placeholder={f.unit}
                        value={form[f.key] ?? ''}
                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="rounded-lg bg-secondary/50 border-border"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

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
          <MeasurementCard key={m.id} measurement={m} onDelete={(id) => deleteMutation.mutate(id)} />
        ))}
        {(measurements ?? []).length === 0 && !showForm && (
          <p className="text-center text-muted-foreground text-sm py-8">Sin medidas aún. Registra tu primera medida.</p>
        )}
      </div>
    </div>
  );
}
