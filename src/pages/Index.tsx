import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProfile, getRoutines, getSessions } from '@/lib/api';
import { getAllSessionSummaries, type SessionSummary } from '@/db/calculations';
import { Button } from '@/components/ui/button';
import { StreakCard } from '@/components/StreakCard';
import { Play, Zap, Calendar, TrendingUp, Dumbbell } from 'lucide-react';
import { useState, useEffect } from 'react';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function Index() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: routines } = useQuery({ queryKey: ['routines'], queryFn: getRoutines });
  const { data: sessions } = useQuery({ queryKey: ['sessions'], queryFn: getSessions });
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);

  useEffect(() => {
    getAllSessionSummaries().then(setSummaries);
  }, []);

  const displayName = profile?.display_name || 'Atleta';
  const firstName = displayName.split(' ')[0];

  // Weekly activity
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const weekSessions = sessions?.filter(s => {
    const d = new Date(s.date);
    return d >= startOfWeek;
  }) ?? [];

  const weekDays = WEEKDAYS.map((label, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const active = weekSessions.some(s => s.date === dateStr);
    const isToday = dateStr === now.toISOString().slice(0, 10);
    return { label, active, isToday };
  });

  const weekCount = weekSessions.length;
  const totalSessions = sessions?.length ?? 0;

  // Recent volume
  const last7 = summaries.filter(s => {
    const d = new Date(s.date);
    const diff = now.getTime() - d.getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });
  const weekVolume = last7.reduce((sum, s) => sum + s.strengthTotal, 0);

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="pt-2">
        <p className="text-muted-foreground text-sm font-medium">Bienvenido de vuelta</p>
        <h1 className="text-2xl font-black tracking-tight">¡Hola, {firstName}! 💪</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-2xl font-black text-primary">{weekCount}</div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Esta semana</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-2xl font-black text-foreground">{totalSessions}</div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Total sesiones</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-2xl font-black text-foreground">{weekVolume > 0 ? `${(weekVolume / 1000).toFixed(1)}k` : '0'}</div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Vol. semanal</p>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Actividad Semanal</h3>
        </div>
        <div className="flex justify-between">
          {weekDays.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  d.active
                    ? 'gradient-primary text-primary-foreground glow-primary'
                    : d.isToday
                    ? 'border-2 border-primary text-primary'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <Link to="/session/new">
        <Button className="w-full h-14 text-lg font-bold gap-3 rounded-xl gradient-primary text-primary-foreground border-0 glow-primary hover:opacity-90 transition-opacity">
          <Play className="h-6 w-6" />
          Iniciar Entrenamiento
        </Button>
      </Link>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/routines">
          <div className="rounded-xl bg-card border border-border p-4 hover:border-primary/30 transition-colors">
            <Zap className="h-5 w-5 text-primary mb-2" />
            <h3 className="text-sm font-bold">Mis Rutinas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{routines?.length ?? 0} rutinas</p>
          </div>
        </Link>
        <Link to="/analysis">
          <div className="rounded-xl bg-card border border-border p-4 hover:border-primary/30 transition-colors">
            <TrendingUp className="h-5 w-5 text-primary mb-2" />
            <h3 className="text-sm font-bold">Análisis</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tu progreso</p>
          </div>
        </Link>
      </div>

      {/* Streak Card */}
      <StreakCard />

      {/* Recent Sessions */}
      {sessions && sessions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Sesiones Recientes
          </h3>
          <div className="space-y-2">
            {sessions.slice(0, 3).map(s => (
              <Link key={s.id} to={`/session/${s.id}`} className="block">
                <div className="rounded-xl bg-card border border-border p-3 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">{s.date}</span>
                    <span className="text-xs text-muted-foreground">{s.notes ? s.notes.slice(0, 30) : 'Sin notas'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
