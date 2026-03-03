import { Link, useLocation } from 'react-router-dom';
import { Home, Dumbbell, ListChecks, BarChart3, User, Ruler, Calendar } from 'lucide-react';
import { useState } from 'react';

const mainItems = [
  { to: '/', icon: Home, label: 'Inicio' },
  { to: '/exercises', icon: Dumbbell, label: 'Ejercicios' },
  { to: '/routines', icon: ListChecks, label: 'Rutinas' },
  { to: '/analysis', icon: BarChart3, label: 'Análisis' },
  { to: '/profile', icon: User, label: 'Perfil' },
];

const moreItems = [
  { to: '/measurements', icon: Ruler, label: 'Medidas' },
  { to: '/programs', icon: Calendar, label: 'Programas' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const allItems = [...mainItems, ...moreItems];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {allItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== '/' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative ${active ? 'drop-shadow-[0_0_6px_hsl(20_100%_60%/0.5)]' : ''}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
