import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingUsers, approveUser, isAdmin } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminUserApproval() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<{ id: string; userId: string; name: string } | null>(null);

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

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'reject', user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      toast.success('Usuario rechazado y eliminado');
      setRejectTarget(null);
    },
    onError: (err: any) => {
      toast.error('Error al rechazar usuario: ' + (err.message || 'desconocido'));
      setRejectTarget(null);
    },
  });

  if (!admin) return null;

  return (
    <>
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
            {pending.map((user: any) => {
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
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={() => approveMutation.mutate(user.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setRejectTarget({ id: user.id, userId: user.user_id, name: user.display_name || 'Sin nombre' })}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Rechazar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la cuenta de <strong>{rejectTarget?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rejectTarget && rejectMutation.mutate(rejectTarget.userId)}
            >
              Eliminar cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
