import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingUsers, approveUser, isAdmin } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUserApproval() {
  const queryClient = useQueryClient();

  const { data: admin } = useQuery({ queryKey: ['isAdmin'], queryFn: isAdmin });
  const { data: pending, isLoading } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: getPendingUsers,
    enabled: !!admin,
  });

  const approveMutation = useMutation({
    mutationFn: approveUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast.success('Usuario aprobado');
    },
    onError: () => toast.error('Error al aprobar usuario'),
  });

  if (!admin) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <h2 className="text-base font-bold mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Usuarios pendientes de aprobación
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !pending?.length ? (
        <p className="text-sm text-muted-foreground">No hay usuarios pendientes.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((user) => {
            const initials = (user.display_name || '?').slice(0, 2).toUpperCase();
            return (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs font-bold bg-secondary text-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{user.display_name || 'Sin nombre'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-lg"
                  onClick={() => approveMutation.mutate(user.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprobar
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
