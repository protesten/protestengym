import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getSessions, deleteSession as deleteSessionApi } from '@/lib/api';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AIInsightCard } from '@/components/AIInsightCard';
import { ArrowLeft, Trash2, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SessionCalendar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ['sessions'], queryFn: getSessions });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const sessionDates = useMemo(() => {
    if (!sessions) return new Set<string>();
    return new Set(sessions.map(s => s.date));
  }, [sessions]);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const daySessions = useMemo(() => {
    return sessions?.filter(s => s.date === selectedDateStr) ?? [];
  }, [sessions, selectedDateStr]);

  const deleteMutation = useMutation({
    mutationFn: deleteSessionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Sesión eliminada');
    },
  });

  // Highlight days that have sessions
  const modifiers = useMemo(() => ({
    hasSession: (date: Date) => sessionDates.has(format(date, 'yyyy-MM-dd')),
  }), [sessionDates]);

  const modifiersStyles = {
    hasSession: {
      fontWeight: 800,
      color: 'hsl(var(--primary))',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    },
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm font-medium hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Atrás
      </button>

      <h1 className="text-xl font-black mb-4">Calendario de Sesiones</h1>

      <div className="rounded-xl bg-card border border-border p-2 mb-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={es}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className={cn("p-3 pointer-events-auto w-full")}
          classNames={{
            months: "flex flex-col w-full",
            month: "space-y-4 w-full",
            table: "w-full border-collapse space-y-1",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
            row: "flex w-full mt-2",
            cell: "flex-1 h-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn("h-9 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md"),
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
          }}
        />
      </div>

      {selectedDate && (
        <div>
          <h2 className="text-sm font-bold mb-2 text-muted-foreground">
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          {daySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">Sin sesiones este día</p>
          ) : (
            <div className="space-y-2">
              {daySessions.map(s => (
                <div key={s.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between gap-2">
                  <Link to={`/session/${s.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {new Date(s.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${(s as any).is_completed ? 'bg-green-500/15 text-green-500' : 'bg-yellow-500/15 text-yellow-500'}`}>
                        {(s as any).is_completed ? '✓' : 'Pend.'}
                      </span>
                    </div>
                    {s.notes && <p className="text-xs text-muted-foreground truncate">{s.notes}</p>}
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link to={`/session/${s.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
                          <AlertDialogDescription>Se borrarán todos los ejercicios y series. No se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteMutation.mutate(s.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Calendar Patterns */}
      {sessions && sessions.length >= 5 && (
        <div className="mt-4">
          <AIInsightCard
            context="calendar_patterns"
            data={{
              totalSessions: sessions.length,
              dates: sessions.slice(0, 30).map(s => s.date),
              completedCount: sessions.filter((s: any) => s.is_completed).length,
            }}
            cacheKey={`calendar-${sessions.length}`}
            label="✨ Analizar patrones"
          />
        </div>
      )}
    </div>
  );
}