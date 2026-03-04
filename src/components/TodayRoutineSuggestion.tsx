import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { CalendarCheck, ChevronRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

      // 3. Get routine for this week
      const { data: weeks, error: wErr } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('program_id', program.id)
        .eq('week_number', currentWeek)
        .limit(1);
      if (wErr || !weeks?.length || !weeks[0].routine_id) return null;

      // 4. Get routine name
      const { data: routine, error: rErr } = await supabase
        .from('routines')
        .select('id, name')
        .eq('id', weeks[0].routine_id)
        .single();
      if (rErr || !routine) return null;

      const isDeload = program.deload_week === currentWeek;

      return {
        programName: program.name,
        routineId: routine.id,
        routineName: routine.name,
        currentWeek,
        totalWeeks: program.weeks,
        isDeload,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Rutina de hoy</h3>
        <span className="ml-auto text-[10px] text-muted-foreground font-medium">
          Sem. {data.currentWeek}/{data.totalWeeks}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold">{data.routineName}</p>
          <p className="text-[10px] text-muted-foreground">
            {data.programName}
            {data.isDeload && <span className="ml-1.5 text-yellow-500 font-semibold">· DELOAD</span>}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link to={`/routines/${data.routineId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={`/session/new?routine=${data.routineId}`}>
            <Button size="icon" className="h-9 w-9 rounded-xl gradient-primary text-primary-foreground border-0 glow-primary">
              <Play className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
