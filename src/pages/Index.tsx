import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dumbbell, ListChecks, BarChart3, Play } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Workout Tracker</h1>
        <p className="text-muted-foreground">Registra y analiza tu progreso</p>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <Link to="/session/new" className="col-span-2">
          <Button className="w-full h-16 text-lg gap-3" size="lg">
            <Play className="h-6 w-6" />
            Iniciar sesión
          </Button>
        </Link>
        <Link to="/analysis">
          <Button variant="secondary" className="w-full h-14 flex-col gap-1">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Análisis</span>
          </Button>
        </Link>
        <Link to="/routines">
          <Button variant="secondary" className="w-full h-14 flex-col gap-1">
            <ListChecks className="h-5 w-5" />
            <span className="text-xs">Rutinas</span>
          </Button>
        </Link>
        <Link to="/exercises" className="col-span-2">
          <Button variant="outline" className="w-full h-12 gap-2">
            <Dumbbell className="h-5 w-5" />
            Ejercicios
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
