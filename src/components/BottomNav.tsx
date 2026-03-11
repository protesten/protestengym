import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Home, Dumbbell, ListChecks, BarChart3, User, Ruler, Calendar, FileText, MoreHorizontal, X, CalendarDays, LogOut, Flame, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, isAdmin, getPendingUsers } from '@/lib/api';
import { getAppFeatures } from '@/lib/ai-insights';

const mainItems = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/exercises', icon: Dumbbell, label: 'Ejercicios' },
  { to: '/routines', icon: ListChecks, label: 'Rutinas' },
  { to: '/analysis', icon: BarChart3, label: 'Análisis' },
];

const allMoreItems = [
  { to: '/coach', icon: Brain, label: 'Coach IA', featureKey: 'nav_coach' as const },
  { to: '/fatigue', icon: Flame, label: 'Fatiga', featureKey: 'nav_fatigue' as const },
  { to: '/measurements', icon: Ruler, label: 'Medidas', featureKey: 'nav_measurements' as const },
  { to: '/programs', icon: Calendar, label: 'Programas', featureKey: 'nav_programs' as const },
  { to: '/calendar', icon: CalendarDays, label: 'Calendario', featureKey: 'nav_calendar' as const },
  { to: '/report', icon: FileText, label: 'Informe', featureKey: 'nav_report' as const },
  { to: '/profile', icon: User, label: 'Perfil', featureKey: null },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: admin } = useQuery({ queryKey: ['isAdmin'], queryFn: isAdmin });
  const { data: pendingUsers } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: getPendingUsers,
    enabled: !!admin,
    refetchInterval: 60000,
  });
  const pendingCount = admin && pendingUsers?.length ? pendingUsers.length : 0;

  const feat = useMemo(() => getAppFeatures((profile?.preferences as any)), [profile]);

  const moreItems = useMemo(() =>
    allMoreItems.filter(item => item.featureKey === null || feat[item.featureKey]),
    [feat]
  );

  const moreActive = moreItems.some(({ to }) => pathname === to || (to !== '/' && pathname.startsWith(to)));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
      )}

      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2">
          <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl p-3 shadow-lg space-y-1">
            {moreItems.map(({ to, icon: Icon, label }) => {
              const active = pathname === to || (to !== '/' && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-semibold">{label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => { setMoreOpen(false); signOut(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-destructive hover:bg-destructive/10 w-full"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-semibold">Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {mainItems.map(({ to, icon: Icon, label }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`relative ${active ? 'drop-shadow-[0_0_6px_hsl(20_100%_60%/0.5)]' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(prev => !prev)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
              moreOpen || moreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className={`relative ${moreOpen || moreActive ? 'drop-shadow-[0_0_6px_hsl(20_100%_60%/0.5)]' : ''}`}>
              {moreOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
            </div>
            <span className="text-[10px] font-semibold">Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
