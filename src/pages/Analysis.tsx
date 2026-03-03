import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { getExerciseComparisons, getMuscleComparisons, getAllSessionSummaries, type MuscleVolume, type SessionSummary, type Comparison } from '@/db/calculations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComparisonRow } from '@/components/ComparisonRow';

function ArrowBadge({ c }: { c: Comparison }) {
  const cls = c.arrow === '↑' ? 'arrow-up' : c.arrow === '↓' ? 'arrow-down' : 'arrow-equal';
  return <span className={`text-xs font-mono ${cls}`}>{c.current} {c.arrow}</span>;
}

export default function Analysis() {
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [selectedExId, setSelectedExId] = useState('');
  const [exComps, setExComps] = useState<{ week: any; month: any; lastSession: any } | null>(null);
  const [muscleData, setMuscleData] = useState<{ week: MuscleVolume[]; month: MuscleVolume[] }>({ week: [], month: [] });
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [musclePeriod, setMusclePeriod] = useState<'7d' | 'month'>('7d');

  useEffect(() => {
    if (!selectedExId) return;
    const ex = exercises?.find(e => e.id === Number(selectedExId));
    if (!ex) return;
    getExerciseComparisons(ex.id!, ex.tracking_type).then(setExComps);
  }, [selectedExId, exercises]);

  useEffect(() => {
    getMuscleComparisons('7d').then(w => setMuscleData(prev => ({ ...prev, week: w })));
    getMuscleComparisons('month').then(m => setMuscleData(prev => ({ ...prev, month: m })));
    getAllSessionSummaries().then(setSessions);
  }, []);

  const selectedEx = exercises?.find(e => e.id === Number(selectedExId));
  const unitLabel = selectedEx ? (selectedEx.tracking_type === 'time_only' || selectedEx.tracking_type === 'distance_time' ? 's' : '') : '';
  const currentMuscleData = musclePeriod === '7d' ? muscleData.week : muscleData.month;

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Análisis</h1>
      <Tabs defaultValue="exercise">
        <TabsList className="w-full">
          <TabsTrigger value="exercise" className="flex-1">Ejercicio</TabsTrigger>
          <TabsTrigger value="muscle" className="flex-1">Músculo</TabsTrigger>
          <TabsTrigger value="session" className="flex-1">Sesión</TabsTrigger>
        </TabsList>

        <TabsContent value="exercise" className="space-y-4 mt-4">
          <Select value={selectedExId} onValueChange={setSelectedExId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar ejercicio" /></SelectTrigger>
            <SelectContent>
              {exercises?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {exComps && (
            <div className="space-y-2">
              <ComparisonRow label="Última sesión" comparison={exComps.lastSession} unit={unitLabel} />
              <ComparisonRow label="Últimos 7 días" comparison={exComps.week} unit={unitLabel} />
              <ComparisonRow label="Mes actual" comparison={exComps.month} unit={unitLabel} />
              {selectedEx?.tracking_type === 'distance_time' && <p className="text-xs text-muted-foreground">Distancia mostrada como dato secundario</p>}
            </div>
          )}
          {!selectedExId && <p className="text-center text-muted-foreground text-sm py-8">Selecciona un ejercicio</p>}
        </TabsContent>

        <TabsContent value="muscle" className="mt-4">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMusclePeriod('7d')} className={`text-sm px-3 py-1 rounded-full ${musclePeriod === '7d' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>7 días</button>
            <button onClick={() => setMusclePeriod('month')} className={`text-sm px-3 py-1 rounded-full ${musclePeriod === 'month' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Mes</button>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1 text-xs text-muted-foreground font-medium">
              <span>Músculo</span><span className="w-24 text-center">Fuerza</span><span className="w-24 text-center">Isométrico</span>
            </div>
            {currentMuscleData.map(m => (
              <div key={m.muscleId} className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 rounded-md bg-card border items-center">
                <span className="text-sm font-medium">{m.muscleName}</span>
                <div className="w-24 text-center"><ArrowBadge c={m.strength} /></div>
                <div className="w-24 text-center"><ArrowBadge c={m.isometric} /></div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="session" className="mt-4">
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.sessionId} className="p-3 rounded-lg bg-card border">
                <div className="font-medium text-sm mb-1">{s.date}</div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {s.strengthTotal > 0 && <span>Fuerza: <span className="font-mono text-foreground">{s.strengthTotal.toLocaleString()}</span></span>}
                  {s.isometricTotal > 0 && <span>Iso: <span className="font-mono text-foreground">{Math.floor(s.isometricTotal / 60)}m</span></span>}
                  {s.cardioTime > 0 && <span>Cardio: <span className="font-mono text-foreground">{Math.floor(s.cardioTime / 60)}m</span></span>}
                </div>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Sin sesiones</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
