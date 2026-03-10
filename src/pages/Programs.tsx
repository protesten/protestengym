import { useState, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getRoutines, type Routine } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, CalendarIcon, Plus, Trash2, CheckCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ProgramHistory } from '@/components/ProgramHistory';
import { AIInsightCard } from '@/components/AIInsightCard';

interface Program {
  id: string;
  user_id: string;
  name: string;
  weeks: number;
  deload_week: number | null;
  is_active: boolean;
  created_at: string;
  start_date: string | null;
}

interface ProgramWeek {
  id: string;
  program_id: string;
  week_number: number;
  routine_id: string | null;
  notes: string | null;
  order_index: number;
}

export default function Programs() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [deloadWeek, setDeloadWeek] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Program[];
    },
  });

  const { data: routines } = useQuery({ queryKey: ['routines'], queryFn: getRoutines });

  const { data: programWeeks } = useQuery({
    queryKey: ['program_weeks', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data, error } = await supabase.from('program_weeks').select('*').eq('program_id', selectedProgramId).order('week_number').order('order_index');
      if (error) throw error;
      return data as unknown as ProgramWeek[];
    },
    enabled: !!selectedProgramId,
  });

  // Group program weeks by day number
  const dayGroups = useMemo(() => {
    if (!programWeeks) return [];
    const map = new Map<number, ProgramWeek[]>();
    for (const pw of programWeeks) {
      const arr = map.get(pw.week_number) || [];
      arr.push(pw);
      map.set(pw.week_number, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [programWeeks]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const numWeeks = Math.max(1, Math.min(30, Number(weeks) || 4));
      const dl = deloadWeek ? Number(deloadWeek) : null;
      const { data: prog, error } = await supabase.from('programs')
        .insert({ user_id: user.id, name, weeks: numWeeks, deload_week: dl, start_date: format(startDate, 'yyyy-MM-dd') } as any)
        .select().single();
      if (error) throw error;
      // Create one entry per day (no routine assigned yet)
      const weekRows = Array.from({ length: numWeeks }, (_, i) => ({
        program_id: (prog as any).id,
        week_number: i + 1,
        order_index: 0,
      }));
      const { error: wErr } = await supabase.from('program_weeks').insert(weekRows);
      if (wErr) throw wErr;
      return (prog as any).id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setShowCreate(false);
      setName('');
      setWeeks('4');
      setDeloadWeek('');
      setSelectedProgramId(id);
      toast.success('Programa creado');
    },
  });

  const assignRoutineMutation = useMutation({
    mutationFn: async ({ weekId, routineId }: { weekId: string; routineId: string | null }) => {
      const { error } = await supabase.from('program_weeks').update({ routine_id: routineId }).eq('id', weekId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['program_weeks', selectedProgramId] }),
  });

  const addRoutineToDayMutation = useMutation({
    mutationFn: async (weekNumber: number) => {
      if (!selectedProgramId) return;
      const dayEntries = programWeeks?.filter(pw => pw.week_number === weekNumber) ?? [];
      const maxOrder = dayEntries.length > 0 ? Math.max(...dayEntries.map(e => e.order_index)) : -1;
      const { error } = await supabase.from('program_weeks').insert({
        program_id: selectedProgramId,
        week_number: weekNumber,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program_weeks', selectedProgramId] });
      toast.success('Rutina añadida al día');
    },
  });

  const removeRoutineEntryMutation = useMutation({
    mutationFn: async ({ weekId, weekNumber }: { weekId: string; weekNumber: number }) => {
      // Don't allow removing the last entry for a day
      const dayEntries = programWeeks?.filter(pw => pw.week_number === weekNumber) ?? [];
      if (dayEntries.length <= 1) {
        // Just clear the routine_id instead
        const { error } = await supabase.from('program_weeks').update({ routine_id: null }).eq('id', weekId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from('program_weeks').delete().eq('id', weekId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program_weeks', selectedProgramId] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (programId: string) => {
      const program = programs?.find(p => p.id === programId);
      if (!program) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      await supabase.from('programs').update({ is_active: false }).eq('user_id', user.id);
      if (!program.is_active) {
        await supabase.from('programs').update({ is_active: true }).eq('id', programId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Programa actualizado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      if (selectedProgramId) setSelectedProgramId(null);
      toast.success('Programa eliminado');
    },
  });

  const updateStartDateMutation = useMutation({
    mutationFn: async (date: Date) => {
      const { error } = await supabase.from('programs').update({ start_date: format(date, 'yyyy-MM-dd') }).eq('id', selectedProgramId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Fecha de inicio actualizada');
    },
  });

  const selectedProgram = programs?.find(p => p.id === selectedProgramId);

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        Programas
      </h1>

      {/* Detail view */}
      {selectedProgram && programWeeks ? (
        <div className="space-y-3">
          <button onClick={() => setSelectedProgramId(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            ← Volver
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{selectedProgram.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedProgram.weeks} días{selectedProgram.deload_week ? ` · Deload día ${selectedProgram.deload_week}` : ''}</p>
            </div>
            <Button
              variant={selectedProgram.is_active ? 'default' : 'outline'}
              size="sm"
              className={selectedProgram.is_active ? 'gradient-primary text-primary-foreground border-0 rounded-lg' : 'rounded-lg'}
              onClick={() => toggleActiveMutation.mutate(selectedProgram.id)}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              {selectedProgram.is_active ? 'Activo' : 'Activar'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Inicio:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg bg-secondary/50 border-border justify-start font-normal">
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {selectedProgram.start_date
                    ? format(new Date(selectedProgram.start_date + 'T00:00:00'), "PPP", { locale: es })
                    : 'Sin fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedProgram.start_date ? new Date(selectedProgram.start_date + 'T00:00:00') : undefined}
                  onSelect={(d) => d && updateStartDateMutation.mutate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {(() => {
            const sd = selectedProgram.start_date;
            const currentWeek = sd ? Math.floor(differenceInDays(new Date(), new Date(sd + 'T00:00:00')) / 7) + 1 : null;
            const isValid = currentWeek && currentWeek >= 1 && currentWeek <= selectedProgram.weeks;
            const isFinished = currentWeek && currentWeek > selectedProgram.weeks;
            return (
              <div className={`p-2.5 rounded-xl border text-center text-xs font-bold ${isFinished ? 'bg-muted/50 border-border text-muted-foreground' : isValid ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}>
                {isFinished ? '✅ Programa completado' : isValid ? `📍 Semana actual: ${currentWeek}` : sd ? 'Aún no ha comenzado' : 'Sin fecha de inicio'}
              </div>
            );
          })()}

          {(() => {
            const sd = selectedProgram.start_date;
            const currentWeek = sd ? Math.floor(differenceInDays(new Date(), new Date(sd + 'T00:00:00')) / 7) + 1 : null;
            const progressValue = currentWeek && sd ? Math.min(100, (currentWeek / selectedProgram.weeks) * 100) : 0;
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                  <span>Progreso</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            );
          })()}

          <div className="space-y-1.5">
            {dayGroups.map(([dayNumber, entries]) => {
              const isDeload = selectedProgram.deload_week === dayNumber;
              const sd = selectedProgram.start_date;
              const currentWeek = sd ? Math.floor(differenceInDays(new Date(), new Date(sd + 'T00:00:00')) / 7) + 1 : null;
              const isCurrent = currentWeek === dayNumber;
              return (
                <div key={dayNumber} className={`p-3 rounded-xl border ${isCurrent ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : isDeload ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-card border-border'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold">
                      Día {dayNumber}
                      {isCurrent && <span className="ml-2 text-[10px] text-primary font-semibold">← ACTUAL</span>}
                      {isDeload && <span className="ml-2 text-[10px] text-yellow-500 font-semibold">DELOAD</span>}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {entries.map((pw, idx) => {
                      const routine = routines?.find(r => r.id === pw.routine_id);
                      return (
                        <div key={pw.id} className="flex items-center gap-1.5">
                          <Select
                            value={pw.routine_id ?? ''}
                            onValueChange={v => assignRoutineMutation.mutate({ weekId: pw.id, routineId: v || null })}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg bg-secondary/50 border-border flex-1">
                              <SelectValue placeholder="Asignar rutina..." />
                            </SelectTrigger>
                            <SelectContent>
                              {routines?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {routine && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => navigate(`/routines/${routine.id}`)}
                            >
                              <ChevronRight className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                          {entries.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => removeRoutineEntryMutation.mutate({ weekId: pw.id, weekNumber: dayNumber })}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1.5 w-full text-[10px] h-6 rounded-lg border-dashed border-border hover:border-primary/30"
                    onClick={() => addRoutineToDayMutation.mutate(dayNumber)}
                  >
                    <Plus className="h-3 w-3 mr-1" />Añadir rutina
                  </Button>
                </div>
              );
            })}
          </div>

          {/* AI Program Review */}
          <AIInsightCard
            context="program_review"
            data={{
              name: selectedProgram.name,
              totalDays: selectedProgram.weeks,
              deloadDay: selectedProgram.deload_week,
              startDate: selectedProgram.start_date,
              isActive: selectedProgram.is_active,
              dayGroups: dayGroups.map(([num, entries]) => ({
                day: num,
                routines: entries.map(e => routines?.find(r => r.id === e.routine_id)?.name ?? 'Sin asignar'),
              })),
            }}
            cacheKey={`program-${selectedProgramId}`}
            label="✨ Evaluar programa"
          />
        </div>
      ) : (
        <>
          {/* Create form */}
          {showCreate ? (
            <div className="p-4 rounded-xl bg-card border border-border space-y-3 mb-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Nombre del programa</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Fuerza 5x5" className="rounded-lg bg-secondary/50 border-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Días de entrenamiento</Label>
                  <Input inputMode="numeric" value={weeks} onChange={e => setWeeks(e.target.value)} placeholder="4" className="rounded-lg bg-secondary/50 border-border" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">Día deload (opc.)</Label>
                  <Input inputMode="numeric" value={deloadWeek} onChange={e => setDeloadWeek(e.target.value)} placeholder="Ej: 4" className="rounded-lg bg-secondary/50 border-border" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Fecha de inicio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal rounded-lg bg-secondary/50 border-border", !startDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => createMutation.mutate()} disabled={!name.trim()}>
                  Crear
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button className="w-full mb-4 rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Crear programa
            </Button>
          )}

          {/* Program list */}
          <div className="space-y-2">
            {(programs ?? []).map(p => (
              <div key={p.id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <button onClick={() => setSelectedProgramId(p.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{p.name}</span>
                    {p.is_active && <span className="text-[10px] font-semibold gradient-primary text-primary-foreground px-2 py-0.5 rounded-full">Activo</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.weeks} días{p.deload_week ? ` · Deload día ${p.deload_week}` : ''}</p>
                </button>
                <div className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => e.stopPropagation()}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border rounded-2xl">
                      <AlertDialogHeader><AlertDialogTitle>¿Eliminar programa?</AlertDialogTitle><AlertDialogDescription>Se eliminará permanentemente.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {(programs ?? []).length === 0 && !showCreate && (
              <p className="text-center text-muted-foreground text-sm py-8">Sin programas. Crea tu primer bloque de entrenamiento.</p>
            )}
          </div>

          {programs && programs.length > 0 && (
            <ProgramHistory programs={programs.map(p => ({ ...p, start_date: p.start_date ?? null }))} />
          )}
        </>
      )}
    </div>
  );
}