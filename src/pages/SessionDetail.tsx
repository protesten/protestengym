import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  getSession, getSessionExercises, getAllExercises, getSetsBySession,
  updateSession, deleteSession as deleteSessionApi, addSessionExercise,
  createSet, updateSet as updateSetApi, deleteSet as deleteSetApi,
  deleteSessionExercise as deleteSeApi, updateSessionExercise,
  createSession, getRoutineExercises, type WorkoutSet, type AnyExercise,
} from '@/lib/api';
import { getSessionSummary, type SessionSummary } from '@/db/calculations';
import { SET_TYPE_LABELS, RPE_OPTIONS, type SetType, type TrackingType, type PlannedSet } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExerciseSearchSelect from '@/components/ExerciseSearchSelect';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, ArrowLeft, StickyNote, ChevronUp, ChevronDown, Copy, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function NumericInput({ value, placeholder, className, onSave }: { value: number | null; placeholder: string; className?: string; onSave: (v: number | null) => void }) {
  const [local, setLocal] = useState(value?.toString() ?? '');
  useEffect(() => { setLocal(value?.toString() ?? ''); }, [value]);
  return (
    <Input
      inputMode="decimal" placeholder={placeholder}
      className={cn("rounded-md bg-secondary/50 border-border", className)}
      value={local} onChange={e => setLocal(e.target.value)}
      onBlur={() => { const parsed = local.trim() === '' ? null : Number(local); if (parsed !== value) onSave(parsed); }}
    />
  );
}

function RepRangeBadge({ plannedSet }: { plannedSet?: PlannedSet }) {
  if (!plannedSet || (plannedSet.min_reps == null && plannedSet.max_reps == null)) return null;
  const range = plannedSet.min_reps != null && plannedSet.max_reps != null
    ? `${plannedSet.min_reps}-${plannedSet.max_reps}`
    : plannedSet.min_reps != null ? `${plannedSet.min_reps}+` : `≤${plannedSet.max_reps}`;
  return (
    <span className="text-[10px] font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded shrink-0" title="Rango pautado">
      {range}r
    </span>
  );
}

function SetRow({ set, trackingType, plannedSet, onUpdate, onDelete }: { set: WorkoutSet; trackingType: TrackingType; plannedSet?: PlannedSet; onUpdate: (s: Partial<WorkoutSet>) => void; onDelete: () => void }) {
  const rpeValue = (set as any).rpe;
  
  // Build reps placeholder with range info
  const repsPlaceholder = plannedSet && plannedSet.min_reps != null && plannedSet.max_reps != null
    ? `${plannedSet.min_reps}-${plannedSet.max_reps}`
    : 'reps';

  return (
    <div className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-secondary/20 flex-wrap">
      <Select value={set.set_type} onValueChange={v => onUpdate({ set_type: v as SetType })}>
        <SelectTrigger className="w-24 h-8 text-xs rounded-md bg-card border-border"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(SET_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
      </Select>
      {(trackingType === 'weight_reps') && (
        <>
          <NumericInput value={set.weight} placeholder="kg" className="w-16 h-8 text-xs" onSave={v => onUpdate({ weight: v })} />
          <NumericInput value={set.reps} placeholder={repsPlaceholder} className="w-16 h-8 text-xs" onSave={v => onUpdate({ reps: v })} />
        </>
      )}
      {trackingType === 'reps_only' && <NumericInput value={set.reps} placeholder={repsPlaceholder} className="w-20 h-8 text-xs" onSave={v => onUpdate({ reps: v })} />}
      {trackingType === 'time_only' && <NumericInput value={set.duration_seconds} placeholder="seg" className="w-20 h-8 text-xs" onSave={v => onUpdate({ duration_seconds: v })} />}
      {trackingType === 'distance_time' && (
        <>
          <NumericInput value={set.duration_seconds} placeholder="seg" className="w-16 h-8 text-xs" onSave={v => onUpdate({ duration_seconds: v })} />
          <NumericInput value={set.distance_meters} placeholder="m" className="w-16 h-8 text-xs" onSave={v => onUpdate({ distance_meters: v })} />
        </>
      )}
      <div className="flex items-center gap-1">
        <Select value={rpeValue?.toString() ?? ''} onValueChange={v => onUpdate({ rpe: v ? Number(v) : null } as any)}>
          <SelectTrigger className={cn("w-20 h-8 text-xs rounded-md bg-card border-border", plannedSet?.rpe != null && rpeValue == null && "border-primary/30")}><SelectValue placeholder={plannedSet?.rpe != null ? `@${plannedSet.rpe}` : 'RPE'} /></SelectTrigger>
          <SelectContent>{RPE_OPTIONS.map(r => <SelectItem key={r} value={r.toString()}>RPE {r}</SelectItem>)}</SelectContent>
        </Select>
        {plannedSet?.rpe != null && (
          <span className="text-[10px] font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded shrink-0" title="RPE pautado">
            @{plannedSet.rpe}
          </span>
        )}
      </div>
      <RepRangeBadge plannedSet={plannedSet} />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionId = id!;

  const { data: session } = useQuery({ queryKey: ['session', sessionId], queryFn: () => getSession(sessionId) });
  const { data: sessionExercises } = useQuery({ queryKey: ['session_exercises', sessionId], queryFn: () => getSessionExercises(sessionId) });
  const { data: exercises } = useQuery({ queryKey: ['all_exercises'], queryFn: getAllExercises });
  const { data: allSets } = useQuery({ queryKey: ['sets', sessionId], queryFn: () => getSetsBySession(sessionId) });
  
  // Fetch routine planned sets when session comes from a routine
  const routineId = session?.routine_id;
  const { data: routineExercises } = useQuery({
    queryKey: ['routine_exercises', routineId],
    queryFn: () => getRoutineExercises(routineId!),
    enabled: !!routineId,
  });

  // Build a map: exercise_id → PlannedSet[]
  const plannedSetsMap = useMemo(() => {
    const map = new Map<string, PlannedSet[]>();
    if (!routineExercises) return map;
    for (const re of routineExercises) {
      const ps = Array.isArray((re as any).planned_sets) ? (re as any).planned_sets : [];
      map.set(re.exercise_id, ps);
    }
    return map;
  }, [routineExercises]);

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [addExId, setAddExId] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => { if (session) setNotes(session.notes ?? ''); }, [session]);
  useEffect(() => { getSessionSummary(sessionId).then(setSummary); }, [sessionId, allSets]);

  const invalidateSession = () => {
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['session_exercises', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['sets', sessionId] });
  };

  const saveNotesMutation = useMutation({ mutationFn: () => updateSession(sessionId, { notes }), onSuccess: () => { setEditingNotes(false); toast.success('Notas guardadas'); invalidateSession(); } });
  const deleteSessionMutation = useMutation({ mutationFn: () => deleteSessionApi(sessionId), onSuccess: () => { toast.success('Sesión eliminada'); navigate('/'); } });
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const newSession = await createSession({ date: today, routine_id: session?.routine_id, notes: session?.notes });
      if (sessionExercises) {
        for (const se of sessionExercises) {
          const newSe = await addSessionExercise(newSession.id, se.exercise_id, se.order_index);
          const sets = allSets?.filter(s => s.session_exercise_id === se.id) ?? [];
          for (const s of sets) await createSet(newSe.id, s.set_type);
        }
      }
      return newSession.id;
    },
    onSuccess: (newId) => { toast.success('Sesión duplicada'); navigate(`/session/${newId}`); },
  });

  const addExMutation = useMutation({
    mutationFn: async () => { if (!addExId) return; const maxOrder = sessionExercises?.length ? Math.max(...sessionExercises.map(se => se.order_index)) : -1; await addSessionExercise(sessionId, addExId, maxOrder + 1); },
    onSuccess: () => { setAddExId(''); invalidateSession(); },
  });

  const addSetMutation = useMutation({ mutationFn: (seId: string) => createSet(seId), onSuccess: () => invalidateSession() });
  const updateSetMutation = useMutation({ mutationFn: ({ setId, data }: { setId: string; data: Partial<WorkoutSet> }) => updateSetApi(setId, data), onSuccess: () => invalidateSession() });
  const deleteSetMutation = useMutation({ mutationFn: deleteSetApi, onSuccess: () => invalidateSession() });
  const deleteSeMutation = useMutation({ mutationFn: deleteSeApi, onSuccess: () => { toast.success('Ejercicio eliminado'); invalidateSession(); } });

  const moveExMutation = useMutation({
    mutationFn: async ({ seId, direction }: { seId: string; direction: 'up' | 'down' }) => {
      if (!sessionExercises) return;
      const idx = sessionExercises.findIndex(se => se.id === seId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sessionExercises.length) return;
      const a = sessionExercises[idx]; const b = sessionExercises[swapIdx];
      await updateSessionExercise(a.id, { order_index: b.order_index });
      await updateSessionExercise(b.id, { order_index: a.order_index });
    },
    onSuccess: () => invalidateSession(),
  });

  const getExercise = (exId: string) => exercises?.find(e => e.id === exId) as AnyExercise | undefined;
  const getSets = (seId: string) => allSets?.filter(s => s.session_exercise_id === seId) ?? [];

  if (!session) return <div className="p-4 text-muted-foreground">Cargando...</div>;

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm font-medium hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Inicio
      </button>

      <div className="flex items-center justify-between mb-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="text-xl font-black px-2 h-auto py-1 gap-2 hover:bg-secondary/50">
              Sesión {session.date}
              <CalendarIcon className="h-4 w-4 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border rounded-xl" align="start">
            <Calendar mode="single" selected={parseISO(session.date)} onSelect={async (date) => { if (date) { const newDate = format(date, 'yyyy-MM-dd'); await updateSession(sessionId, { date: newDate }); invalidateSession(); toast.success('Fecha actualizada'); } }} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateMutation.mutate()} title="Duplicar sesión"><Copy className="h-4 w-4" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border rounded-2xl">
              <AlertDialogHeader><AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle><AlertDialogDescription>Se borrarán todos los ejercicios y series. No se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteSessionMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mb-4">
        {editingNotes ? (
          <div className="space-y-2">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas de la sesión..." className="text-sm min-h-[60px] rounded-xl bg-secondary/30 border-border" />
            <div className="flex gap-2">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0 rounded-lg" onClick={() => saveNotesMutation.mutate()}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingNotes(false); setNotes(session.notes ?? ''); }}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingNotes(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <StickyNote className="h-3.5 w-3.5" />
            {session.notes ? <span className="text-foreground">{session.notes}</span> : <span>Añadir notas...</span>}
          </button>
        )}
      </div>

      <Accordion type="multiple" className="space-y-2">
        {sessionExercises?.map((se, idx) => {
          const ex = getExercise(se.exercise_id);
          const sets = getSets(se.id);
          const plannedSets = plannedSetsMap.get(se.exercise_id) ?? [];
          const isFirst = idx === 0;
          const isLast = idx === (sessionExercises.length - 1);
          return (
            <AccordionItem key={se.id} value={se.id} className="border border-border rounded-xl px-3 bg-card">
              <div className="flex items-center">
                <div className="flex flex-col mr-1">
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={isFirst} onClick={() => moveExMutation.mutate({ seId: se.id, direction: 'up' })}><ChevronUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={isLast} onClick={() => moveExMutation.mutate({ seId: se.id, direction: 'down' })}><ChevronDown className="h-3 w-3" /></Button>
                </div>
                <AccordionTrigger className="py-3 text-sm font-bold flex-1">{ex?.name ?? 'Ejercicio'}</AccordionTrigger>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={e => e.stopPropagation()}><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border rounded-2xl">
                    <AlertDialogHeader><AlertDialogTitle>¿Eliminar {ex?.name}?</AlertDialogTitle><AlertDialogDescription>Se borrarán todas las series de este ejercicio.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteSeMutation.mutate(se.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <AccordionContent>
                <div className="space-y-1.5">
                  {sets.map((s, setIdx) => (
                    <SetRow
                      key={s.id}
                      set={s}
                      trackingType={(ex?.tracking_type ?? 'weight_reps') as TrackingType}
                      plannedSet={plannedSets[setIdx]}
                      onUpdate={data => updateSetMutation.mutate({ setId: s.id, data })}
                      onDelete={() => deleteSetMutation.mutate(s.id)}
                    />
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2 w-full rounded-lg border-dashed border-border hover:border-primary/30" onClick={() => addSetMutation.mutate(se.id)}>
                  <Plus className="h-3 w-3 mr-1" />Serie
                </Button>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="flex gap-2 mt-4">
        <ExerciseSearchSelect exercises={exercises} value={addExId} onChange={setAddExId} />
        <Button size="icon" className="gradient-primary text-primary-foreground border-0 rounded-lg shrink-0" onClick={() => addExMutation.mutate()} disabled={!addExId}><Plus className="h-4 w-4" /></Button>
      </div>

      {summary && (
        <div className="mt-6 p-4 rounded-xl bg-card border border-border space-y-2">
          <h3 className="font-bold text-sm mb-2 text-primary">Resumen</h3>
          {summary.strengthTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fuerza total</span><span className="font-mono font-bold">{summary.strengthTotal.toLocaleString()}</span></div>}
          {summary.isometricTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Isométricos</span><span className="font-mono font-bold">{Math.floor(summary.isometricTotal / 60)}m {summary.isometricTotal % 60}s</span></div>}
          {summary.cardioTime > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cardio</span><span className="font-mono font-bold">{Math.floor(summary.cardioTime / 60)}m{summary.cardioDistance > 0 ? ` · ${summary.cardioDistance}m` : ''}</span></div>}
        </div>
      )}
    </div>
  );
}
