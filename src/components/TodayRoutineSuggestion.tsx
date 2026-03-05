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

      // 2. Calculate current week
      const startDate = new Date(program.start_date ?? program.created_at);
      startDate.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentWeek = Math.floor(diffDays / 7) + 1;

      if (currentWeek < 1 || currentWeek > program.weeks) return null;

      // 3. Get ALL routines for this day (multiple entries possible)
      const { data: weeks, error: wErr } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('program_id', program.id)
        .eq('week_number', currentWeek)
        .order('order_index');
      if (wErr || !weeks?.length) return null;

      const routineIds = weeks.map(w => w.routine_id).filter(Boolean) as string[];
      if (!routineIds.length) return null;

      // 4.5 Check which routines already have a session today
      const today = now.toISOString().slice(0, 10);
      const { data: todaySessions } = await supabase
        .from('sessions')
        .select('routine_id, is_completed')
        .eq('date', today)
        .eq('is_completed', true);
      const completedIds = new Set(todaySessions?.map(s => s.routine_id).filter(Boolean));
      const pendingIds = routineIds.filter(id => !completedIds.has(id));
      const allCompleted = pendingIds.length === 0;

      if (allCompleted) {
        return {
          programName: program.name,
          routines: [],
          currentWeek,
          totalWeeks: program.weeks,
          isDeload: program.deload_week === currentWeek,
          allCompleted: true,
        };
      }

      // 4. Get routine names
      const { data: routinesData, error: rErr } = await supabase
        .from('routines')
        .select('id, name')
        .in('id', pendingIds);
      if (rErr || !routinesData?.length) return null;

      // Maintain order
      const routineMap = new Map(routinesData.map(r => [r.id, r]));
      const routines: TodayRoutine[] = pendingIds
        .map(id => routineMap.get(id))
        .filter(Boolean)
        .map(r => ({ routineId: r!.id, routineName: r!.name }));

      const isDeload = program.deload_week === currentWeek;

      return {
        programName: program.name,
        routines,
        currentWeek,
        totalWeeks: program.weeks,
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
              {data.programName} · Sem. {data.currentWeek}/{data.totalWeeks}
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
          Sem. {data.currentWeek}/{data.totalWeeks}
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