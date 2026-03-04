import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Dumbbell, CalendarDays, ListChecks } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  weeks: number;
  deload_week: number | null;
  start_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProgramWeek {
  program_id: string;
  routine_id: string | null;
}

interface ProgramHistoryProps {
  programs: Program[];
}

export function ProgramHistory({ programs }: ProgramHistoryProps) {
  const completedPrograms = useMemo(() => {
    const now = new Date();
    return programs.filter(p => {
      if (!p.start_date) return false;
      const start = new Date(p.start_date + 'T00:00:00');
      const end = addDays(start, p.weeks * 7);
      return end <= now;
    });
  }, [programs]);

  const programIds = completedPrograms.map(p => p.id);

  const { data: allWeeks } = useQuery({
    queryKey: ['program_weeks_history', programIds],
    queryFn: async () => {
      if (!programIds.length) return [];
      const { data, error } = await supabase
        .from('program_weeks')
        .select('program_id, routine_id')
        .in('program_id', programIds);
      if (error) throw error;
      return data as ProgramWeek[];
    },
    enabled: programIds.length > 0,
  });

  // Get all unique routine IDs from completed programs
  const routineIds = useMemo(() => {
    if (!allWeeks) return [];
    return [...new Set(allWeeks.filter(w => w.routine_id).map(w => w.routine_id!))];
  }, [allWeeks]);

  // Get sessions that used any of these routines during the program period
  const { data: sessions } = useQuery({
    queryKey: ['program_history_sessions', programIds],
    queryFn: async () => {
      if (!completedPrograms.length) return [];
      // Fetch all sessions for the user within any completed program's date range
      const earliest = completedPrograms.reduce((min, p) => {
        return p.start_date! < min ? p.start_date! : min;
      }, completedPrograms[0].start_date!);
      const latest = completedPrograms.reduce((max, p) => {
        const end = format(addDays(new Date(p.start_date! + 'T00:00:00'), p.weeks * 7), 'yyyy-MM-dd');
        return end > max ? end : max;
      }, '2000-01-01');

      const { data, error } = await supabase
        .from('sessions')
        .select('id, date, routine_id')
        .gte('date', earliest)
        .lte('date', latest);
      if (error) throw error;
      return data;
    },
    enabled: completedPrograms.length > 0,
  });

  // Get session exercise counts
  const sessionIds = sessions?.map(s => s.id) ?? [];
  const { data: sessionExercises } = useQuery({
    queryKey: ['program_history_exercises', sessionIds],
    queryFn: async () => {
      if (!sessionIds.length) return [];
      const { data, error } = await supabase
        .from('session_exercises')
        .select('session_id')
        .in('session_id', sessionIds);
      if (error) throw error;
      return data;
    },
    enabled: sessionIds.length > 0,
  });

  // Build stats per program
  const stats = useMemo(() => {
    if (!completedPrograms.length) return [];
    return completedPrograms.map(program => {
      const start = new Date(program.start_date! + 'T00:00:00');
      const end = addDays(start, program.weeks * 7);
      const startStr = program.start_date!;
      const endStr = format(end, 'yyyy-MM-dd');

      // Routines assigned to this program
      const programRoutineIds = (allWeeks ?? [])
        .filter(w => w.program_id === program.id && w.routine_id)
        .map(w => w.routine_id!);

      // Sessions in date range that match program routines (or all if no routines assigned)
      const programSessions = (sessions ?? []).filter(s => {
        if (s.date < startStr || s.date > endStr) return false;
        if (programRoutineIds.length === 0) return true;
        return programRoutineIds.includes(s.routine_id ?? '');
      });

      const programSessionIds = new Set(programSessions.map(s => s.id));
      const exerciseCount = (sessionExercises ?? []).filter(se => programSessionIds.has(se.session_id)).length;

      return {
        program,
        sessionCount: programSessions.length,
        exerciseCount,
        startDate: startStr,
        endDate: endStr,
      };
    });
  }, [completedPrograms, allWeeks, sessions, sessionExercises]);

  if (!completedPrograms.length) return null;

  return (
    <div className="space-y-3 mt-6">
      <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-1.5">
        <CheckCircle className="h-4 w-4" />
        Programas completados
      </h2>
      {stats.map(({ program, sessionCount, exerciseCount, startDate, endDate }) => (
        <div key={program.id} className="p-3 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{program.name}</span>
            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              Completado
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {format(new Date(startDate + 'T00:00:00'), 'd MMM', { locale: es })} — {format(new Date(endDate + 'T00:00:00'), 'd MMM yyyy', { locale: es })}
            <span className="ml-1">· {program.weeks} sem.</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/50">
              <ListChecks className="h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-xs font-bold">{sessionCount}</p>
                <p className="text-[10px] text-muted-foreground">Sesiones</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-secondary/50">
              <Dumbbell className="h-3.5 w-3.5 text-primary" />
              <div>
                <p className="text-xs font-bold">{exerciseCount}</p>
                <p className="text-[10px] text-muted-foreground">Ejercicios</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
