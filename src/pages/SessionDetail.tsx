import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  getSession, getSessionExercises, getAllExercises, getSetsBySession,
  updateSession, deleteSession as deleteSessionApi, addSessionExercise,
  createSet, updateSet as updateSetApi, deleteSet as deleteSetApi,
  deleteSessionExercise as deleteSeApi, updateSessionExercise,
  createSession, getRoutineExercises, getPreviousSetsForExercise, getRoutineTrainingGoal,
  type WorkoutSet, type AnyExercise, type PreviousSessionData,
} from '@/lib/api';
import { getSessionSummary, checkForPR, type SessionSummary } from '@/db/calculations';
import { SET_TYPE_LABELS, RPE_OPTIONS, type SetType, type TrackingType, type PlannedSet, type TrainingGoal } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ExerciseSearchSelect from '@/components/ExerciseSearchSelect';
import { ExerciseNotePopover } from '@/components/ExerciseNotePopover';

import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { WeightSuggestion, TargetWeightBadge } from '@/components/WeightSuggestion';
import { RPEFeedback, RPEBadge } from '@/components/RPEFeedback';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AIInsightCard } from '@/components/AIInsightCard';
import { Plus, Trash2, ArrowLeft, ChevronUp, ChevronDown, CalendarIcon, Share2, Video, MoreHorizontal, Copy, Download, CheckCircle2, Flag } from 'lucide-react';
import { exportElementAsImage, shareElementAsImage, exportAsCSV } from '@/lib/export-utils';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SessionExportCard } from '@/components/SessionExportCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PreviousSessionReference } from '@/components/PreviousSessionReference';

/* ── Sanitize numeric input ── */
const sanitize = (raw: string): number | null => {
  const cleaned = raw.trim().replace(',', '.');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function NumericInput({ value, placeholder, className, onSave }: { value: number | null; placeholder: string; className?: string; onSave: (v: number | null) => void }) {
  const [local, setLocal] = useState(value?.toString() ?? '');
  useEffect(() => { setLocal(value?.toString() ?? ''); }, [value]);
  return (
    <Input
      inputMode="decimal" placeholder={placeholder}
      className={cn("rounded-md bg-secondary/50 border-border text-center", className)}
      value={local} onChange={e => setLocal(e.target.value)}
      onBlur={() => { const parsed = sanitize(local); if (parsed !== value) onSave(parsed); }}
    />
  );
}

/* ── Set type chip (tap to cycle) ── */
const SET_TYPE_CHIPS: Record<SetType, { label: string; color: string }> = {
  work: { label: 'T', color: 'bg-primary/20 text-primary' },
  warmup: { label: 'C', color: 'bg-orange-400/20 text-orange-400' },
  approach: { label: 'A', color: 'bg-blue-400/20 text-blue-400' },
};
const SET_TYPE_ORDER: SetType[] = ['work', 'warmup', 'approach'];

function SetTypeChip({ type, onChange }: { type: SetType; onChange: (t: SetType) => void }) {
  const chip = SET_TYPE_CHIPS[type] ?? SET_TYPE_CHIPS.work;
  const cycle = () => {
    const idx = SET_TYPE_ORDER.indexOf(type);
    onChange(SET_TYPE_ORDER[(idx + 1) % SET_TYPE_ORDER.length]);
  };
  return (
    <button
      onClick={cycle}
      className={cn("w-7 h-7 rounded-md text-[11px] font-black shrink-0 transition-colors", chip.color)}
      title={SET_TYPE_LABELS[type]}
    >
      {chip.label}
    </button>
  );
}

/* ── Set row: ultra compact ── */
function SetRow({ set, trackingType, plannedSet, prevSet, onUpdate, onDelete }: { set: WorkoutSet; trackingType: TrackingType; plannedSet?: PlannedSet; prevSet?: WorkoutSet; onUpdate: (s: Partial<WorkoutSet>) => void; onDelete: () => void }) {
  const rpeValue = set.rpe as number | null;

  const repsPlaceholder = plannedSet && plannedSet.min_reps != null && plannedSet.max_reps != null
    ? `${plannedSet.min_reps}-${plannedSet.max_reps}`
    : 'reps';
  const timePlaceholder = plannedSet && plannedSet.min_time_seconds != null && plannedSet.max_time_seconds != null
    ? `${plannedSet.min_time_seconds}-${plannedSet.max_time_seconds}`
    : 'seg';
  const distancePlaceholder = plannedSet && plannedSet.min_distance_meters != null && plannedSet.max_distance_meters != null
    ? `${plannedSet.min_distance_meters}-${plannedSet.max_distance_meters}`
    : 'm';

  // Comparison border
  const getComparison = (): 'up' | 'down' | 'equal' | null => {
    if (!prevSet) return null;
    if (trackingType === 'weight_reps') {
      if (set.weight == null || set.reps == null || prevSet.weight == null || prevSet.reps == null) return null;
      const cur = set.weight * set.reps, prev = prevSet.weight * prevSet.reps;
      return cur > prev ? 'up' : cur < prev ? 'down' : 'equal';
    }
    if (trackingType === 'reps_only') {
      if (set.reps == null || prevSet.reps == null) return null;
      return set.reps > prevSet.reps ? 'up' : set.reps < prevSet.reps ? 'down' : 'equal';
    }
    if (trackingType === 'time_only') {
      if (set.duration_seconds == null || prevSet.duration_seconds == null) return null;
      return set.duration_seconds > prevSet.duration_seconds ? 'up' : set.duration_seconds < prevSet.duration_seconds ? 'down' : 'equal';
    }
    if (trackingType === 'distance_time') {
      if (set.distance_meters == null || prevSet.distance_meters == null) return null;
      return set.distance_meters > prevSet.distance_meters ? 'up' : set.distance_meters < prevSet.distance_meters ? 'down' : 'equal';
    }
    return null;
  };
  const cmp = getComparison();
  const borderClass = cmp === 'up' ? 'border-l-2 border-l-green-400' : cmp === 'down' ? 'border-l-2 border-l-red-400' : cmp === 'equal' ? 'border-l-2 border-l-muted-foreground/30' : '';

  return (
    <div className={cn("flex items-center gap-1.5 py-1 px-1.5 rounded-lg bg-secondary/20", borderClass)}>
      <SetTypeChip type={set.set_type as SetType} onChange={v => onUpdate({ set_type: v })} />

      {trackingType === 'weight_reps' && (
        <>
          <NumericInput value={set.weight} placeholder="kg" className="w-[60px] h-8 text-xs" onSave={v => onUpdate({ weight: v })} />
          <span className="text-muted-foreground/40 text-xs">×</span>
          <NumericInput value={set.reps} placeholder={repsPlaceholder} className="w-[52px] h-8 text-xs" onSave={v => onUpdate({ reps: v })} />
        </>
      )}
      {trackingType === 'reps_only' && (
        <NumericInput value={set.reps} placeholder={repsPlaceholder} className="w-20 h-8 text-xs" onSave={v => onUpdate({ reps: v })} />
      )}
      {trackingType === 'time_only' && (
        <NumericInput value={set.duration_seconds} placeholder={timePlaceholder} className="w-20 h-8 text-xs" onSave={v => onUpdate({ duration_seconds: v })} />
      )}
      {trackingType === 'distance_time' && (
        <>
          <NumericInput value={set.duration_seconds} placeholder={timePlaceholder} className="w-16 h-8 text-xs" onSave={v => onUpdate({ duration_seconds: v })} />
          <NumericInput value={set.distance_meters} placeholder={distancePlaceholder} className="w-16 h-8 text-xs" onSave={v => onUpdate({ distance_meters: v })} />
        </>
      )}

      <div className="flex items-center gap-1">
        <Select value={rpeValue?.toString() ?? ''} onValueChange={v => onUpdate({ rpe: v ? Number(v) : null })}>
          <SelectTrigger className="w-16 h-8 text-xs rounded-md bg-card border-border">
            <SelectValue placeholder={plannedSet?.rpe != null ? `@${plannedSet.rpe}` : 'RPE'} />
          </SelectTrigger>
          <SelectContent>{RPE_OPTIONS.map(r => <SelectItem key={r} value={r.toString()}>@{r}</SelectItem>)}</SelectContent>
        </Select>
        <RPEBadge rpe={rpeValue} />
      </div>

      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 ml-auto" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive/70" /></Button>
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionId = id!;
  
  const { enqueue: enqueueOffline, hasPending: hasOfflinePending } = useOfflineQueue();

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

  const { data: trainingGoal } = useQuery({
    queryKey: ['routine_training_goal', routineId],
    queryFn: () => getRoutineTrainingGoal(routineId!),
    enabled: !!routineId,
  });

  const exerciseIds = useMemo(() => [...new Set(sessionExercises?.map(se => se.exercise_id) ?? [])], [sessionExercises]);

  const { data: prevSetsMap } = useQuery({
    queryKey: ['prev_sets', sessionId, exerciseIds],
    queryFn: async () => {
      const map = new Map<string, PreviousSessionData>();
      const results = await Promise.all(exerciseIds.map(async (eid) => ({ eid, result: await getPreviousSetsForExercise(eid, sessionId) })));
      for (const { eid, result } of results) map.set(eid, result);
      return map;
    },
    enabled: exerciseIds.length > 0,
  });

  const plannedSetsMap = useMemo(() => {
    const map = new Map<string, PlannedSet[]>();
    if (!routineExercises) return map;
    for (const re of routineExercises) {
      const raw = re.planned_sets;
      const ps: PlannedSet[] = Array.isArray(raw) ? (raw as PlannedSet[]) : [];
      map.set(re.exercise_id, ps);
    }
    return map;
  }, [routineExercises]);

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [addExId, setAddExId] = useState('');
  const [notes, setNotes] = useState('');
  const [showExportCard, setShowExportCard] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const exportCardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => { if (session) setNotes(session.notes ?? ''); }, [session]);
  useEffect(() => { getSessionSummary(sessionId).then(setSummary); }, [sessionId, allSets]);

  const invalidateSession = () => {
    queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['session_exercises', sessionId] });
    queryClient.invalidateQueries({ queryKey: ['sets', sessionId] });
  };

  const saveNotesMutation = useMutation({ mutationFn: () => updateSession(sessionId, { notes }), onSuccess: () => { toast.success('Notas guardadas'); invalidateSession(); } });
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
        id: `temp-${Date.now()}`, session_exercise_id: seId, set_type: 'work',
        weight: null, reps: null, duration_seconds: null, distance_meters: null, rpe: null, created_at: new Date().toISOString(),
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
      queryClient.setQueryData<WorkoutSet[]>(setsQueryKey, old => (old ?? []).map(s => s.id === setId ? { ...s, ...data } : s));
      return { prev };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(setsQueryKey, ctx.prev);
      enqueueOffline(vars.setId, vars.data as Record<string, unknown>);
      toast.info('Sin conexión — cambios guardados localmente');
    },
    onSuccess: async (_res, { setId, data, exerciseId }) => {
      if (exerciseId && (data.weight != null || data.reps != null || data.duration_seconds != null || data.distance_meters != null)) {
        const currentSet = allSets?.find(s => s.id === setId);
        if (currentSet) {
          const merged = { ...currentSet, ...data } as WorkoutSet;
          const ex = getExercise(exerciseId);
          if (ex) {
            const result = await checkForPR(exerciseId, ex.tracking_type as TrackingType, merged);
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

  const handleApplyWeight = (seId: string, weight: number) => {
    const sets = getSets(seId);
    const emptySet = sets.find(s => s.weight == null);
    if (emptySet) {
      updateSetMutation.mutate({ setId: emptySet.id, data: { weight } });
      toast.success(`${weight} kg aplicado`);
    } else {
      toast(`Peso sugerido: ${weight} kg`, { description: 'Todas las series ya tienen peso' });
    }
  };

  // ── Exercise grouping ──
  const exercisesGrouped = useMemo(() => {
    if (!sessionExercises) return { withSets: [] as typeof sessionExercises, upcoming: [] as typeof sessionExercises };
    const withSets = sessionExercises.filter(se => getSets(se.id).length > 0);
    const upcoming = sessionExercises.filter(se => getSets(se.id).length === 0);
    return { withSets, upcoming };
  }, [sessionExercises, allSets]);

  // Progress
  const totalExercises = sessionExercises?.length ?? 0;
  const completedExercises = exercisesGrouped.withSets.length;
  const progressPct = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  // Auto-select first active exercise
  useEffect(() => {
    if (!activeExerciseId && sessionExercises?.length) {
      const firstUpcoming = exercisesGrouped.upcoming[0];
      const firstWithSets = exercisesGrouped.withSets[0];
      setActiveExerciseId(firstUpcoming?.id ?? firstWithSets?.id ?? null);
    }
  }, [sessionExercises, activeExerciseId, exercisesGrouped]);

  if (!session) return <div className="p-4 text-muted-foreground">Cargando...</div>;

  const renderExerciseContent = (se: { exercise_id: string; id: string; order_index: number; session_id: string }) => {
    const ex = getExercise(se.exercise_id);
    const sets = getSets(se.id);
    const plannedSets = plannedSetsMap.get(se.exercise_id) ?? [];
    const prevData = prevSetsMap?.get(se.exercise_id);
    const prevSets = prevData?.sets ?? [];
    const prevDate = prevData?.date ?? null;
    const idx = sessionExercises!.indexOf(se);
    const isFirst = idx === 0;
    const isLast = idx === (sessionExercises!.length - 1);

    return (
      <div key={se.id} className={cn(
        "rounded-xl border bg-card transition-all",
        activeExerciseId === se.id ? "border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.1)]" : "border-border"
      )}>
        {/* Exercise header */}
        <div
          className="flex items-center gap-1.5 px-3 py-2.5 cursor-pointer"
          onClick={() => setActiveExerciseId(activeExerciseId === se.id ? null : se.id)}
        >
          <div className="flex flex-col">
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={isFirst} onClick={e => { e.stopPropagation(); moveExMutation.mutate({ seId: se.id, direction: 'up' }); }}><ChevronUp className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={isLast} onClick={e => { e.stopPropagation(); moveExMutation.mutate({ seId: se.id, direction: 'down' }); }}><ChevronDown className="h-3 w-3" /></Button>
          </div>
          <span className="text-sm font-bold flex-1 truncate">{ex?.name ?? 'Ejercicio'}</span>
          {/* Collapsed badge - show target when not active */}
          {activeExerciseId !== se.id && sets.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {sets.length} series
            </span>
          )}
          <div className="flex items-center gap-0" onClick={e => e.stopPropagation()}>
            {ex?.video_url && (
              <a href={ex.video_url} target="_blank" rel="noopener noreferrer" title="Ver video">
                <Video className="h-4 w-4 text-primary mx-1" />
              </a>
            )}
            <ExerciseNotePopover exerciseId={se.exercise_id} exerciseNotes={ex?.notes ?? null} source={ex?.source ?? 'personal'} />
            {ex?.tracking_type === 'weight_reps' && (
              <WeightSuggestion exerciseId={se.exercise_id} exerciseName={ex?.name ?? ''} trainingGoal={(trainingGoal as TrainingGoal) ?? null} onApply={(w) => handleApplyWeight(se.id, w)} />
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive/70"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border rounded-2xl">
                <AlertDialogHeader><AlertDialogTitle>¿Eliminar {ex?.name}?</AlertDialogTitle><AlertDialogDescription>Se borrarán todas las series.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteSeMutation.mutate(se.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Expanded content */}
        {activeExerciseId === se.id && (
          <div className="px-3 pb-3">
            {/* Target weight badge */}
            {ex?.tracking_type === 'weight_reps' && (
              <div className="mb-2">
                <TargetWeightBadge exerciseId={se.exercise_id} exerciseName={ex?.name ?? ''} trainingGoal={(trainingGoal as TrainingGoal) ?? null} />
              </div>
            )}

            {/* Previous session */}
            <PreviousSessionReference sets={prevSets} date={prevDate} trackingType={ex?.tracking_type ?? 'weight_reps'} />

            {/* Sets label */}
            {sets.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2 mb-1.5">Registro de series</p>
            )}

            {/* Sets */}
            <div className="space-y-1">
              {sets.map((s, setIdx) => (
                <div key={s.id}>
                  <SetRow
                    set={s}
                    trackingType={(ex?.tracking_type ?? 'weight_reps') as TrackingType}
                    plannedSet={plannedSets[setIdx]}
                    prevSet={prevSets[setIdx]}
                    onUpdate={data => updateSetMutation.mutate({ setId: s.id, data, exerciseId: se.exercise_id })}
                    onDelete={() => deleteSetMutation.mutate(s.id)}
                  />
                  <RPEFeedback rpe={s.rpe as number | null} weight={s.weight} />
                </div>
              ))}
            </div>

            {/* Add set button - prominent */}
            <Button
              size="sm"
              className="mt-2 w-full rounded-lg gradient-primary text-primary-foreground border-0 h-9 text-xs font-bold"
              onClick={() => addSetMutation.mutate(se.id)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />Serie
            </Button>

            {/* Complete & next button */}
            {sets.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-1.5 w-full rounded-lg h-8 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10"
                onClick={async () => {
                  // Find next exercise in the full list
                  const allSes = sessionExercises ?? [];
                  const currentIdx = allSes.findIndex(s => s.id === se.id);
                  const nextSe = allSes[currentIdx + 1];
                  if (nextSe) {
                    setActiveExerciseId(nextSe.id);
                    // Auto-add first set if upcoming exercise has none
                    if (getSets(nextSe.id).length === 0) {
                      addSetMutation.mutate(nextSe.id);
                    }
                  } else {
                    // Last exercise — mark session as completed
                    setActiveExerciseId(null);
                    await updateSession(sessionId, { is_completed: true } as any);
                    invalidateSession();
                    queryClient.invalidateQueries({ queryKey: ['sessions'] });
                    toast.success('🎉 ¡Sesión completada!');
                  }
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {(() => {
                  const allSes = sessionExercises ?? [];
                  const currentIdx = allSes.findIndex(s => s.id === se.id);
                  const nextSe = allSes[currentIdx + 1];
                  const nextEx = nextSe ? getExercise(nextSe.exercise_id) : null;
                  return nextEx ? `Completar → ${nextEx.name}` : 'Completar ejercicio';
                })()}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3 pb-24 max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Progreso</span>
          <span className="text-[10px] font-mono text-muted-foreground">{completedExercises}/{totalExercises}</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Simplified header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-base font-black px-2 h-auto py-1 gap-1.5 hover:bg-secondary/50">
                {session.date}
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border rounded-xl pointer-events-auto" align="start" sideOffset={4}>
              <Calendar mode="single" selected={parseISO(session.date)} onSelect={async (date) => { if (date) { const newDate = format(date, 'yyyy-MM-dd'); await updateSession(sessionId, { date: newDate }); invalidateSession(); toast.success('Fecha actualizada'); setDatePopoverOpen(false); } }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-0.5 items-center">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShareSession} title="Compartir"><Share2 className="h-3.5 w-3.5" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border rounded-xl">
              <DropdownMenuItem onClick={handleExportSession}><Download className="h-3.5 w-3.5 mr-2" />Descargar imagen</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}><span className="text-[9px] font-mono font-bold mr-2">CSV</span>Exportar CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateMutation.mutate()}><Copy className="h-3.5 w-3.5 mr-2" />Duplicar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border rounded-2xl">
              <AlertDialogHeader><AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle><AlertDialogDescription>Se borrarán todos los ejercicios y series.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteSessionMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Inline notes */}
      <Input
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={() => { if (notes !== (session.notes ?? '')) saveNotesMutation.mutate(); }}
        placeholder="Notas..."
        className="mb-3 h-8 text-xs rounded-lg bg-secondary/30 border-border"
      />

      {/* Exercises with sets (active + collapsed) */}
      <div className="space-y-2">
        {exercisesGrouped.withSets.map(se => renderExerciseContent(se))}
      </div>

      {/* Upcoming exercises */}
      {exercisesGrouped.upcoming.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Siguientes ejercicios</p>
          <div className="space-y-1.5">
            {exercisesGrouped.upcoming.map(se => renderExerciseContent(se))}
          </div>
        </div>
      )}

      {/* Add exercise */}
      <div className="flex gap-2 mt-4">
        <ExerciseSearchSelect exercises={exercises} value={addExId} onChange={setAddExId} />
        <Button size="icon" className="gradient-primary text-primary-foreground border-0 rounded-lg shrink-0" onClick={() => addExMutation.mutate()} disabled={!addExId}><Plus className="h-4 w-4" /></Button>
      </div>

      {/* Finalize session button */}
      {!(session as any).is_completed && (
        <Button
          className="mt-4 w-full h-11 rounded-xl gradient-primary text-primary-foreground border-0 font-bold text-sm gap-2 glow-primary"
          onClick={async () => {
            await updateSession(sessionId, { is_completed: true } as any);
            invalidateSession();
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            toast.success('🎉 ¡Sesión completada!');
          }}
        >
          <Flag className="h-4 w-4" />
          Finalizar sesión
        </Button>
      )}
      {(session as any).is_completed && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            Sesión completada
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7">
                Reabrir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>¿Reabrir sesión?</AlertDialogTitle>
                <AlertDialogDescription>La sesión dejará de contar en tus estadísticas y análisis hasta que la finalices de nuevo.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  await updateSession(sessionId, { is_completed: false } as any);
                  invalidateSession();
                  queryClient.invalidateQueries({ queryKey: ['sessions'] });
                  toast.info('Sesión reabierta');
                }}>Reabrir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mt-4 p-3 rounded-xl bg-card border border-border space-y-1.5">
          <h3 className="font-bold text-xs mb-1 text-primary">Resumen</h3>
          {summary.strengthTotal > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fuerza total</span><span className="font-mono font-bold">{summary.strengthTotal.toLocaleString()}</span></div>}
          {summary.isometricTotal > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Isométricos</span><span className="font-mono font-bold">{Math.floor(summary.isometricTotal / 60)}m {summary.isometricTotal % 60}s</span></div>}
          {summary.cardioTime > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Cardio</span><span className="font-mono font-bold">{Math.floor(summary.cardioTime / 60)}m{summary.cardioDistance > 0 ? ` · ${summary.cardioDistance}m` : ''}</span></div>}
        </div>
      )}

      {/* AI Session Feedback */}
      {(session as any).is_completed && summary && (
        <div className="mt-3">
          <AIInsightCard
            context="session_feedback"
            data={{
              date: session.date,
              strengthTotal: summary.strengthTotal,
              isometricTotal: summary.isometricTotal,
              cardioTime: summary.cardioTime,
              exerciseCount: sessionExercises?.length ?? 0,
              totalSets: allSets?.filter(s => s.set_type === 'work').length ?? 0,
              avgRPE: allSets?.filter(s => s.rpe).reduce((sum, s) => sum + (s.rpe ?? 0), 0)! / Math.max(1, allSets?.filter(s => s.rpe).length ?? 1),
            }}
            cacheKey={`session-${sessionId}`}
            label="✨ Feedback de sesión"
          />
        </div>
      )}

      {hasOfflinePending && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-lg">
          ⏳ Datos pendientes de sincronizar
        </div>
      )}

      {showExportCard && (
        <div className="fixed left-[-9999px] top-0">
          <SessionExportCard ref={exportCardRef} date={session.date} exercises={buildExportData()} summary={{ strengthTotal: summary?.strengthTotal ?? 0, isometricTotal: summary?.isometricTotal ?? 0, cardioTime: summary?.cardioTime ?? 0 }} />
        </div>
      )}
    </div>
  );
}
