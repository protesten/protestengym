import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const [displayName, setDisplayName] = useState('');
  const [units, setUnits] = useState('kg');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      const prefs = profile.preferences as any;
      setUnits(prefs?.units ?? 'kg');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({
      display_name: displayName,
      preferences: { units },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil actualizado');
    },
  });

  const initials = (displayName || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Perfil</h1>

      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{displayName || 'Sin nombre'}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Nombre</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label>Unidades de peso</Label>
          <Select value={units} onValueChange={setUnits}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilogramos (kg)</SelectItem>
              <SelectItem value="lb">Libras (lb)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={() => saveMutation.mutate()}>Guardar</Button>
      </div>

      <div className="mt-8 pt-6 border-t">
        <Button variant="outline" className="w-full text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
