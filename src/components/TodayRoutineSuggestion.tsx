import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TodayRoutine {
  routineId: string;
  routineName: string;
}

export function TodayRoutineSuggestion() {
  const { data } = useQuery({
    queryKey: ['today-routine-suggestion'],
    queryFn: async () => {
      // 1. Get active program
      const { data: programs, error: pErr } = await supabase
        .from('programs')
        .select('*')
        .eq('is_active', true)
        .limit(1);
      if (pErr || !programs?.length) return null;
      const program = programs[0];

      const startDate = new Date(program.start_date ?? program.created_at);
      startDate.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Program hasn't started yet
      if (now < startDate) return null;

      // 2. Get ALL program_weeks ordered by week_number, order_index
      const { data: allWeeks, error: wErr } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('program_id', program.id)
        .order('week_number')
        .order('order_index');
      if (wErr || !allWeeks?.length) return null;

      // Group by week_number (each week_number = one training day)
      const dayMap = new Map<number, string[]>();
      for (const w of allWeeks) {
        if (!w.routine_id) continue;
        const arr = dayMap.get(w.week_number) || [];
        arr.push(w.routine_id);
        dayMap.set(w.week_number, arr);
      }
      const trainingDays = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
      if (!trainingDays.length) return null;

      // 3. Get all completed sessions since program start
      const startStr = startDate.toISOString().slice(0, 10);
      const { data: completedSessions } = await supabase
        .from('sessions')
        .select('routine_id, date')
        .gte('date', startStr)
        .eq('is_completed', true);

      const completedList = completedSessions ?? [];

      // 4. Walk through training days, find first incomplete one
      // For each day, we need ALL its routines to have been completed.
      // If a routine appears in multiple days, we need enough completions to cover all prior days.
      // Track how many times each routine_id has been "consumed" by prior completed days.
      const consumedRoutines: string[] = []; // flat list of consumed routine_ids

      let currentDayNumber: number | null = null;
      let currentDayRoutineIds: string[] = [];

      for (const [dayNum, routineIds] of trainingDays) {
        // Check if all routines for this day are covered by completions not yet consumed
        const availableCompletions = completedList
          .filter(s => s.routine_id != null)
          .map(s => s.routine_id as string);

        // Remove already consumed from available
        const remaining = [...availableCompletions];
        for (const consumed of consumedRoutines) {
          const idx = remaining.indexOf(consumed);
          if (idx !== -1) remaining.splice(idx, 1);
        }

        // Check if this day's routines are all in remaining
        const tempConsumed: string[] = [];
        let allFound = true;
        for (const rid of routineIds) {
          const idx = remaining.indexOf(rid);
          if (idx !== -1) {
            remaining.splice(idx, 1);
            tempConsumed.push(rid);
          } else {
            allFound = false;
            break;
          }
        }

        if (allFound) {
          // This day is complete, consume the routines
          consumedRoutines.push(...tempConsumed);
        } else {
          // This is the current day
          currentDayNumber = dayNum;
          currentDayRoutineIds = routineIds;
          break;
        }
      }

      const totalDays = trainingDays.length;
      const isDeload = program.deload_week != null && currentDayNumber === program.deload_week;

      // All days completed
      if (currentDayNumber === null) {
        return {
          programName: program.name,
          routines: [],
          currentDay: totalDays,
          totalDays,
          isDeload: false,
          allCompleted: true,
        };
      }

      // 5. For the current day, filter out routines already completed TODAY
      const todayStr = now.toISOString().slice(0, 10);
      const todayCompletedRoutineIds = completedList
        .filter(s => s.date === todayStr && s.routine_id != null)
        .map(s => s.routine_id as string);

      // Remove today's completions from pending (handle duplicates)
      const todayCopy = [...todayCompletedRoutineIds];
      const pendingIds = currentDayRoutineIds.filter(rid => {
        const idx = todayCopy.indexOf(rid);
        if (idx !== -1) {
          todayCopy.splice(idx, 1);
          return false;
        }
        return true;
      });

      if (pendingIds.length === 0) {
        return {
          programName: program.name,
          routines: [],
          currentDay: currentDayNumber,
          totalDays,
          isDeload,
          allCompleted: true,
        };
      }

      // 6. Get routine names
      const { data: routinesData, error: rErr } = await supabase
        .from('routines')
        .select('id, name')
        .in('id', pendingIds);
      if (rErr || !routinesData?.length) return null;

      const routineMap = new Map(routinesData.map(r => [r.id, r]));
      const routines: TodayRoutine[] = pendingIds
        .map(id => routineMap.get(id))
        .filter(Boolean)
        .map(r => ({ routineId: r!.id, routineName: r!.name }));

      return {
        programName: program.name,
        routines,
        currentDay: currentDayNumber,
        totalDays,
        isDeload,
        allCompleted: false,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  if (data.allCompleted) {
    return (
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold">¡Todo completado! 🎉</p>
            <p className="text-[10px] text-muted-foreground">
              {data.programName} · Día {data.currentDay}/{data.totalDays}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">{data.routines.length > 1 ? 'Rutinas de hoy' : 'Rutina de hoy'}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground font-medium">
          Día {data.currentDay}/{data.totalDays}
        </span>
      </div>

      {data.routines.map((r, i) => (
        <div key={r.routineId} className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold">{r.routineName}</p>
            {i === 0 && (
              <p className="text-[10px] text-muted-foreground">
                {data.programName}
                {data.isDeload && <span className="ml-1.5 text-yellow-500 font-semibold">· DELOAD</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link to={`/routines/${r.routineId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={`/session/new?routine=${r.routineId}`}>
              <Button size="icon" className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground border-0 glow-primary">
                <Play className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
