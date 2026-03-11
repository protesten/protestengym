import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { isAdmin, getAdminUsers, approveUser, transferUserData } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Users, ArrowRightLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TRANSFER_TABLES = [
  { key: 'exercises', label: 'Ejercicios' },
  { key: 'routines', label: 'Rutinas' },
  { key: 'sessions', label: 'Sesiones (con sets)' },
  { key: 'programs', label: 'Programas' },
  { key: 'measurements', label: 'Medidas corporales' },
];

export default function Admin() {
  const queryClient = useQueryClient();
  const { data: admin, isLoading: adminLoading } = useQuery({ queryKey: ['isAdmin'], queryFn: isAdmin });
  const { data: users, isLoading } = useQuery({ queryKey: ['adminUsers'], queryFn: getAdminUsers, enabled: !!admin });

  const [rejectTarget, setRejectTarget] = useState<{ userId: string; name: string } | null>(null);
  const [sourceUser, setSourceUser] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const approveMutation = useMutation({
    mutationFn: approveUser,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); queryClient.invalidateQueries({ queryKey: ['pendingUsers'] }); toast.success('Usuario aprobado'); },
    onError: () => toast.error('Error al aprobar'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'reject', user_id: userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); queryClient.invalidateQueries({ queryKey: ['pendingUsers'] }); toast.success('Usuario eliminado'); setRejectTarget(null); },
    onError: (e: any) => { toast.error('Error: ' + (e.message || 'desconocido')); setRejectTarget(null); },
  });

  const transferMutation = useMutation({
    mutationFn: () => transferUserData(sourceUser, targetUser, selectedTables),
    onSuccess: (data) => {
      const lines = Object.entries(data.summary).map(([k, v]) => `${k}: ${v}`).join(', ');
      toast.success(`Transferencia completada: ${lines}`);
      setConfirmTransfer(false);
    },
    onError: (e: any) => { toast.error('Error: ' + (e.message || 'desconocido')); setConfirmTransfer(false); },
  });

  if (adminLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!admin) return <Navigate to="/" replace />;

  const toggleTable = (key: string) => setSelectedTables(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]);
  const sourceName = users?.find(u => u.user_id === sourceUser)?.display_name || '';
  const targetName = users?.find(u => u.user_id === targetUser)?.display_name || '';

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        Panel de Administración
      </h1>

      <Tabs defaultValue="users">
        <TabsList className="w-full">
          <TabsTrigger value="users" className="flex-1 gap-1"><Users className="h-4 w-4" />Usuarios</TabsTrigger>
          <TabsTrigger value="transfer" className="flex-1 gap-1"><ArrowRightLeft className="h-4 w-4" />Transferir</TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !users?.length ? (
            <p className="text-sm text-muted-foreground">No hay usuarios.</p>
          ) : (
            users.map((user) => {
              const initials = (user.display_name || '?').slice(0, 2).toUpperCase();
              return (
                <Card key={user.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-secondary text-foreground">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{user.display_name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {user.is_approved ? (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">Aprobado</Badge>
                      ) : (
                        <>
                          <Button size="sm" className="rounded-lg h-8" onClick={() => approveMutation.mutate(user.id)} disabled={approveMutation.isPending}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => setRejectTarget({ userId: user.user_id, name: user.display_name || 'Sin nombre' })}>
                            <XCircle className="h-3.5 w-3.5 mr-1" />Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── TRANSFER TAB ── */}
        <TabsContent value="transfer" className="space-y-4 mt-4">
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Usuario origen</label>
              <Select value={sourceUser} onValueChange={setSourceUser}>
                <SelectTrigger><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                <SelectContent>
                  {users?.filter(u => u.user_id !== targetUser).map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email || u.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Usuario destino</label>
              <Select value={targetUser} onValueChange={setTargetUser}>
                <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                <SelectContent>
                  {users?.filter(u => u.user_id !== sourceUser).map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email || u.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Datos a transferir</label>
              <div className="space-y-2">
                {TRANSFER_TABLES.map(t => (
                  <div key={t.key} className="flex items-center gap-2">
                    <Checkbox id={t.key} checked={selectedTables.includes(t.key)} onCheckedChange={() => toggleTable(t.key)} />
                    <label htmlFor={t.key} className="text-sm cursor-pointer">{t.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!sourceUser || !targetUser || !selectedTables.length || transferMutation.isPending}
              onClick={() => setConfirmTransfer(true)}
            >
              {transferMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Transfiriendo…</> : 'Transferir datos'}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la cuenta de <strong>{rejectTarget?.name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rejectTarget && rejectMutation.mutate(rejectTarget.userId)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer confirm dialog */}
      <AlertDialog open={confirmTransfer} onOpenChange={setConfirmTransfer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar transferencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Se copiarán {selectedTables.length} tipo(s) de datos de <strong>{sourceName || 'origen'}</strong> a <strong>{targetName || 'destino'}</strong>. Los datos originales no se eliminarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => transferMutation.mutate()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
