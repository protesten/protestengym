import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  getSession, getSessionExercises, getAllExercises, getSetsBySession,
  updateSession, deleteSession as deleteSessionApi, addSessionExercise,
  createSet, updateSet as updateSetApi, deleteSet as deleteSetApi,
  deleteSessionExercise as deleteSeApi, updateSessionExercise,
  createSession, getRoutineExercises, getPreviousSetsForExercise,
  type WorkoutSet, type AnyExercise, type PreviousSessionData,
} from '@/lib/api';
import { getSessionSummary, checkForPR, type SessionSummary } from '@/db/calculations';
import { SET_TYPE_LABELS, RPE_OPTIONS, type SetType, type TrackingType, type PlannedSet } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExerciseSearchSelect from '@/components/ExerciseSearchSelect';
import { ExerciseNotePopover } from '@/components/ExerciseNotePopover';
import { RestTimer } from '@/components/RestTimer';
import { WarmupCalculator } from '@/components/WarmupCalculator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, ArrowLeft, StickyNote, ChevronUp, ChevronDown, Copy, CalendarIcon, Download, Share2, TrendingUp, TrendingDown, Equal } from 'lucide-react';
import { exportElementAsImage, shareElementAsImage, exportAsCSV } from '@/lib/export-utils';
import { SessionExportCard } from '@/components/SessionExportCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PreviousSessionReference } from '@/components/PreviousSessionReference';

function NumericInput({ value, placeholder, className, onSave, hint }: { value: number | null; placeholder: string; className?: string; onSave: (v: number | null) => void; hint?: string }) {
  const [local, setLocal] = useState(value?.toString() ?? '');
  useEffect(() => { setLocal(value?.toString() ?? ''); }, [value]);
  return (
    <div className="flex flex-col">
      <Input
        inputMode="decimal" placeholder={placeholder}
        className={cn("rounded-md bg-secondary/50 border-border", className)}
        value={local} onChange={e => setLocal(e.target.value)}
        onBlur={() => { const parsed = local.trim() === '' ? null : Number(local); if (parsed !== value) onSave(parsed); }}
      />
      {hint && <span className="text-[9px] text-muted-foreground/60 font-mono mt-0.5 px-0.5 truncate">{hint}</span>}
    </div>
  );
}

function PlannedRangeBadge({ plannedSet, trackingType }: { plannedSet?: PlannedSet; trackingType: TrackingType }) {
  if (!plannedSet) return null;

  const badges: { range: string; unit: string }[] = [];

  if ((trackingType === 'weight_reps' || trackingType === 'reps_only') && (plannedSet.min_reps != null || plannedSet.max_reps != null)) {
    const range = plannedSet.min_reps != null && plannedSet.max_reps != null
      ? `${plannedSet.min_reps}-${plannedSet.max_reps}`
      : plannedSet.min_reps != null ? `${plannedSet.min_reps}+` : `≤${plannedSet.max_reps}`;
    badges.push({ range, unit: 'r' });
  }

  if ((trackingType === 'time_only' || trackingType === 'distance_time') && (plannedSet.min_time_seconds != null || plannedSet.max_time_seconds != null)) {
    const range = plannedSet.min_time_seconds != null && plannedSet.max_time_seconds != null
      ? `${plannedSet.min_time_seconds}-${plannedSet.max_time_seconds}`
      : plannedSet.min_time_seconds != null ? `${plannedSet.min_time_seconds}+` : `≤${plannedSet.max_time_seconds}`;
    badges.push({ range, unit: 's' });
  }

  if (trackingType === 'distance_time' && (plannedSet.min_distance_meters != null || plannedSet.max_distance_meters != null)) {
    const range = plannedSet.min_distance_meters != null && plannedSet.max_distance_meters != null
      ? `${plannedSet.min_distance_meters}-${plannedSet.max_distance_meters}`
      : plannedSet.min_distance_meters != null ? `${plannedSet.min_distance_meters}+` : `≤${plannedSet.max_distance_meters}`;
    badges.push({ range, unit: 'm' });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex gap-1 shrink-0">
      {badges.map((b, i) => (
        <span key={i} className="text-[10px] font-mono text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded" title="Rango pautado">
          {b.range}{b.unit}
        </span>
      ))}
    </div>
  );
}

function rpeColor(rpe: number | null | undefined): string {
  if (rpe == null) return 'text-primary/70 bg-primary/10';
  if (rpe <= 4) return 'text-green-400 bg-green-400/15';
  if (rpe <= 6) return 'text-yellow-400 bg-yellow-400/15';
  if (rpe <= 8) return 'text-orange-400 bg-orange-400/15';
  return 'text-red-400 bg-red-400/15';
}

function DeltaBadge({ current, previous }: { current: number | null; previous: number | null | undefined }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (diff === 0) return <Equal className="h-3 w-3 text-muted-foreground/50" />;
  if (diff > 0) return <TrendingUp className="h-3 w-3 text-green-400" />;
  return <TrendingDown className="h-3 w-3 text-red-400" />;
}

function SetRow({ set, trackingType, plannedSet, prevSet, onUpdate, onDelete }: { set: WorkoutSet; trackingType: TrackingType; plannedSet?: PlannedSet; prevSet?: WorkoutSet; onUpdate: (s: Partial<WorkoutSet>) => void; onDelete: () => void }) {
  const rpeValue = (set as any).rpe;
  
  const repsPlaceholder = plannedSet && plannedSet.min_reps != null && plannedSet.max_reps != null
    ? `${plannedSet.min_reps}-${plannedSet.max_reps}`
    : 'reps';
  const timePlaceholder = plannedSet && (plannedSet as any).min_time_seconds != null && (plannedSet as any).max_time_seconds != null
    ? `${(plannedSet as any).min_time_seconds}-${(plannedSet as any).max_time_seconds}`
    : 'seg';
  const distancePlaceholder = plannedSet && (plannedSet as any).min_distance_meters != null && (plannedSet as any).max_distance_meters != null
    ? `${(plannedSet as any).min_distance_meters}-${(plannedSet as any).max_distance_meters}`
    : 'm';

  // Build hints from previous session
  const weightHint = prevSet?.weight != null ? `${prevSet.weight}` : undefined;
  const repsHint = prevSet?.reps != null ? `${prevSet.reps}` : undefined;
  const durationHint = prevSet?.duration_seconds != null ? `${prevSet.duration_seconds}` : undefined;
  const distanceHint = prevSet?.distance_meters != null ? `${prevSet.distance_meters}` : undefined;

  // Compute overall comparison for the set
  const getSetComparison = (): 'up' | 'down' | 'equal' | null => {
    if (!prevSet) return null;
    if (trackingType === 'weight_reps') {
      if (set.weight == null || set.reps == null) return null;
      if (prevSet.weight == null || prevSet.reps == null) return null;
      const curVol = set.weight * set.reps;
      const prevVol = prevSet.weight * prevSet.reps;
      if (curVol > prevVol) return 'up';
      if (curVol < prevVol) return 'down';
      return 'equal';
    }
    if (trackingType === 'reps_only') {
      if (set.reps == null || prevSet.reps == null) return null;
      if (set.reps > prevSet.reps) return 'up';
      if (set.reps < prevSet.reps) return 'down';
      return 'equal';
    }
    if (trackingType === 'time_only') {
      if (set.duration_seconds == null || prevSet.duration_seconds == null) return null;
      if (set.duration_seconds > prevSet.duration_seconds) return 'up';
      if (set.duration_seconds < prevSet.duration_seconds) return 'down';
      return 'equal';
    }
    if (trackingType === 'distance_time') {
      if (set.distance_meters == null || prevSet.distance_meters == null) return null;
      if (set.distance_meters > prevSet.distance_meters) return 'up';
      if (set.distance_meters < prevSet.distance_meters) return 'down';
      return 'equal';
    }
    return null;
  };

  const comparison = getSetComparison();
  const borderClass = comparison === 'up' ? 'border-l-2 border-l-green-400' : comparison === 'down' ? 'border-l-2 border-l-red-400' : comparison === 'equal' ? 'border-l-2 border-l-muted-foreground/30' : '';

  return (
    <div className={cn("flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-secondary/20 flex-wrap", borderClass)}>
      <Select value={set.set_type} onValueChange={v => onUpdate({ set_type: v as SetType })}>
        <SelectTrigger className="w-24 h-8 text-xs rounded-md bg-card border-border"><SelectValue /></SelectTrigger>
        <SelectContent>{Object.entries(SET_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
      </Select>
      {(trackingType === 'weight_reps') && (
        <>
          <NumericInput value={set.weight} placeholder="kg" className="w-16 h-8 text-xs" onSave={v => onUpdate({ weight: v })} hint={weightHint} />
          <DeltaBadge current={set.weight} previous={prevSet?.weight} />
          <NumericInput value={set.reps} placeholder={repsPlaceholder} className="w-16 h-8 text-xs" onSave={v => onUpdate({ reps: v })} hint={repsHint} />
          <DeltaBadge current={set.reps} previous={prevSet?.reps} />
        </>
      )}
      {trackingType === 'reps_only' && (
        <>
          <NumericInput value={set.reps} placeholder={repsPlaceholder} className="w-20 h-8 text-xs" onSave={v => onUpdate({ reps: v })} hint={repsHint} />
          <DeltaBadge current={set.reps} previous={prevSet?.reps} />
        </>
      )}
      {trackingType === 'time_only' && (
        <>
          <NumericInput value={set.duration_seconds} placeholder={timePlaceholder} className="w-20 h-8 text-xs" onSave={v => onUpdate({ duration_seconds: v })} hint={durationHint} />
          <DeltaBadge current={set.duration_seconds} previous={prevSet?.duration_seconds} />
        </>
      )}
      {trackingType === 'distance_time' && (
        <>
          <NumericInput value={set.duration_seconds} placeholder={timePlaceholder} className="w-16 h-8 text-xs" onSave={v => onUpdate({ duration_seconds: v })} hint={durationHint} />
          <DeltaBadge current={set.duration_seconds} previous={prevSet?.duration_seconds} />
          <NumericInput value={set.distance_meters} placeholder={distancePlaceholder} className="w-16 h-8 text-xs" onSave={v => onUpdate({ distance_meters: v })} hint={distanceHint} />
          <DeltaBadge current={set.distance_meters} previous={prevSet?.distance_meters} />
        </>
      )}
      <div className="flex items-center gap-1">
        <Select value={rpeValue?.toString() ?? ''} onValueChange={v => onUpdate({ rpe: v ? Number(v) : null } as any)}>
          <SelectTrigger className={cn("w-20 h-8 text-xs rounded-md bg-card border-border", plannedSet?.rpe != null && rpeValue == null && "border-primary/30")}><SelectValue placeholder={plannedSet?.rpe != null ? `@${plannedSet.rpe}` : 'RPE'} /></SelectTrigger>
          <SelectContent>{RPE_OPTIONS.map(r => <SelectItem key={r} value={r.toString()}>RPE {r}</SelectItem>)}</SelectContent>
        </Select>
        {plannedSet?.rpe != null && (
          <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0", rpeColor(plannedSet.rpe))} title="RPE pautado">
            @{plannedSet.rpe}
          </span>
        )}
      </div>
      <PlannedRangeBadge plannedSet={plannedSet} trackingType={trackingType} />
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
  
  const routineId = session?.routine_id;
  const { data: routineExercises } = useQuery({
    queryKey: ['routine_exercises', routineId],
    queryFn: () => getRoutineExercises(routineId!),
    enabled: !!routineId,
  });

  // Fetch previous sets for each exercise in this session
  const exerciseIds = useMemo(() => {
    return [...new Set(sessionExercises?.map(se => se.exercise_id) ?? [])];
  }, [sessionExercises]);

  const { data: prevSetsMap } = useQuery({
    queryKey: ['prev_sets', sessionId, exerciseIds],
    queryFn: async () => {
      const map = new Map<string, PreviousSessionData>();
      const results = await Promise.all(
        exerciseIds.map(async (eid) => {
          const result = await getPreviousSetsForExercise(eid, sessionId);
          return { eid, result };
        })
      );
      for (const { eid, result } of results) {
        map.set(eid, result);
      }
      return map;
    },
    enabled: exerciseIds.length > 0,
  });

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
  const [showExportCard, setShowExportCard] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const exportCardRef = React.useRef<HTMLDivElement>(null);

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

  const setsQueryKey = ['sets', sessionId];

  const addSetMutation = useMutation({
    mutationFn: (seId: string) => createSet(seId),
    onMutate: async (seId: string) => {
      await queryClient.cancelQueries({ queryKey: setsQueryKey });
      const prev = queryClient.getQueryData<WorkoutSet[]>(setsQueryKey);
      const optimisticSet: WorkoutSet = {
        id: `temp-${Date.now()}`,
        session_exercise_id: seId,
        set_type: 'work',
        weight: null,
        reps: null,
        duration_seconds: null,
        distance_meters: null,
        rpe: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<WorkoutSet[]>(setsQueryKey, old => [...(old ?? []), optimisticSet]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(setsQueryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: setsQueryKey }),
  });

  const [prSets, setPrSets] = useState<Set<string>>(new Set());
  const updateSetMutation = useMutation({
    mutationFn: ({ setId, data }: { setId: string; data: Partial<WorkoutSet>; exerciseId?: string }) => updateSetApi(setId, data),
    onMutate: async ({ setId, data }) => {
      await queryClient.cancelQueries({ queryKey: setsQueryKey });
      const prev = queryClient.getQueryData<WorkoutSet[]>(setsQueryKey);
      queryClient.setQueryData<WorkoutSet[]>(setsQueryKey, old =>
        (old ?? []).map(s => s.id === setId ? { ...s, ...data } : s)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(setsQueryKey, ctx.prev); },
    onSuccess: async (_res, { setId, data, exerciseId }) => {
      // Check for PR in onSuccess (non-blocking)
      if (exerciseId && (data.weight != null || data.reps != null || data.duration_seconds != null || data.distance_meters != null)) {
        const currentSet = allSets?.find(s => s.id === setId);
        if (currentSet) {
          const merged = { ...currentSet, ...data } as WorkoutSet;
          const ex = getExercise(exerciseId);
          if (ex) {
            const result = await checkForPR(exerciseId, ex.tracking_type as any, merged);
            if (result.isPR) {
              setPrSets(prev => new Set(prev).add(setId));
              const labels: Record<string, string> = { weight: '¡Nuevo PR de peso!', '1rm': '¡Nuevo PR de 1RM estimado!', reps: '¡Nuevo PR de reps!', volume: '¡Nuevo PR de volumen!', time: '¡Nuevo PR de tiempo!', distance: '¡Nuevo PR de distancia!' };
              toast.success(`🏆 ${labels[result.prType!] ?? '¡Nuevo PR!'} ${result.newValue}`, { duration: 5000 });
            }
          }
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: setsQueryKey }),
  });

  const deleteSetMutation = useMutation({
    mutationFn: deleteSetApi,
    onMutate: async (setId: string) => {
      await queryClient.cancelQueries({ queryKey: setsQueryKey });
      const prev = queryClient.getQueryData<WorkoutSet[]>(setsQueryKey);
      queryClient.setQueryData<WorkoutSet[]>(setsQueryKey, old => (old ?? []).filter(s => s.id !== setId));
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(setsQueryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey: setsQueryKey }),
  });

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

  const getExercise = (exId: string) => exercises?.find(e => e.id === exId) as (AnyExercise & { notes?: string | null }) | undefined;
  const getSets = (seId: string) => allSets?.filter(s => s.session_exercise_id === seId) ?? [];

  const buildExportData = () => {
    if (!sessionExercises) return [];
    return sessionExercises.map(se => {
      const ex = getExercise(se.exercise_id);
      return { name: ex?.name ?? 'Ejercicio', sets: getSets(se.id), trackingType: ex?.tracking_type ?? 'weight_reps' };
    });
  };

  const handleExportSession = async () => {
    setShowExportCard(true);
    await new Promise(r => setTimeout(r, 100));
    if (exportCardRef.current) {
      await exportElementAsImage(exportCardRef.current, `sesion-${session.date}.png`);
      toast.success('Imagen descargada');
    }
    setShowExportCard(false);
  };

  const handleShareSession = async () => {
    setShowExportCard(true);
    await new Promise(r => setTimeout(r, 100));
    if (exportCardRef.current) {
      await shareElementAsImage(exportCardRef.current, `Sesión ${session.date}`);
    }
    setShowExportCard(false);
  };

  const handleExportCSV = () => {
    const headers = ['Ejercicio', 'Serie', 'Tipo', 'Peso (kg)', 'Reps', 'Duración (s)', 'Distancia (m)', 'RPE'];
    const rows: string[][] = [];
    sessionExercises?.forEach(se => {
      const ex = getExercise(se.exercise_id);
      getSets(se.id).forEach((s, i) => {
        rows.push([ex?.name ?? '', String(i + 1), s.set_type, String(s.weight ?? ''), String(s.reps ?? ''), String(s.duration_seconds ?? ''), String(s.distance_meters ?? ''), String(s.rpe ?? '')]);
      });
    });
    exportAsCSV(headers, rows, `sesion-${session.date}.csv`);
    toast.success('CSV exportado');
  };

  if (!session) return <div className="p-4 text-muted-foreground">Cargando...</div>;

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm font-medium hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Inicio
      </button>

      <div className="flex items-center justify-between mb-2">
        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="text-xl font-black px-2 h-auto py-1 gap-2 hover:bg-secondary/50">
              Sesión {session.date}
              <CalendarIcon className="h-4 w-4 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border rounded-xl pointer-events-auto" align="start" sideOffset={4}>
            <Calendar mode="single" selected={parseISO(session.date)} onSelect={async (date) => { if (date) { const newDate = format(date, 'yyyy-MM-dd'); await updateSession(sessionId, { date: newDate }); invalidateSession(); toast.success('Fecha actualizada'); setDatePopoverOpen(false); } }} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExportSession} title="Descargar imagen"><Download className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShareSession} title="Compartir"><Share2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExportCSV} title="Exportar CSV"><span className="text-[10px] font-mono font-bold">CSV</span></Button>
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
          const prevData = prevSetsMap?.get(se.exercise_id);
          const prevSets = prevData?.sets ?? [];
          const prevDate = prevData?.date ?? null;
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
                <ExerciseNotePopover
                  exerciseId={se.exercise_id}
                  exerciseNotes={(ex as any)?.notes ?? null}
                  source={ex?.source ?? 'personal'}
                />
                {ex?.tracking_type === 'weight_reps' && (
                  <WarmupCalculator exerciseName={ex?.name ?? 'Ejercicio'} />
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={e => e.stopPropagation()}><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border rounded-2xl">
                    <AlertDialogHeader><AlertDialogTitle>¿Eliminar {ex?.name}?</AlertDialogTitle><AlertDialogDescription>Se borrarán todas las series de este ejercicio.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteSeMutation.mutate(se.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <AccordionContent>
                <PreviousSessionReference sets={prevSets} date={prevDate} trackingType={ex?.tracking_type ?? 'weight_reps'} />
                <div className="space-y-1.5">
                  {sets.map((s, setIdx) => (
                    <SetRow
                      key={s.id}
                      set={s}
                      trackingType={(ex?.tracking_type ?? 'weight_reps') as TrackingType}
                      plannedSet={plannedSets[setIdx]}
                      prevSet={prevSets[setIdx]}
                      onUpdate={data => updateSetMutation.mutate({ setId: s.id, data, exerciseId: se.exercise_id })}
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

      {/* Rest Timer */}
      <RestTimer />

      {/* Hidden export card */}
      {showExportCard && (
        <div className="fixed left-[-9999px] top-0">
          <SessionExportCard
            ref={exportCardRef}
            date={session.date}
            exercises={buildExportData()}
            summary={{ strengthTotal: summary?.strengthTotal ?? 0, isometricTotal: summary?.isometricTotal ?? 0, cardioTime: summary?.cardioTime ?? 0 }}
          />
        </div>
      )}
    </div>
  );
}
