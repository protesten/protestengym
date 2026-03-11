import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LogOut, Clock } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: !!user,
  });

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (profile && !(profile as any).is_approved) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-black mb-2">Cuenta pendiente de aprobación</h1>
            <p className="text-muted-foreground text-sm">
              Tu cuenta ha sido creada correctamente y se ha notificado al administrador. Recibirás acceso cuando apruebe tu solicitud.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
