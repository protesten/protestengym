import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminUserApproval from '@/components/AdminUserApproval';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User } from 'lucide-react';
import { AIInsightCard } from '@/components/AIInsightCard';
import { toast } from 'sonner';

export default function Profile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const [displayName, setDisplayName] = useState('');
  const [units, setUnits] = useState('kg');
  const [heightCm, setHeightCm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      const prefs = profile.preferences as any;
      setUnits(prefs?.units ?? 'kg');
      setHeightCm((profile as any).height_cm?.toString() ?? '');
      setBirthDate((profile as any).birth_date ?? '');
      setSex((profile as any).sex ?? '');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Not authenticated');
      const updateData: any = {
        display_name: displayName,
        preferences: { units },
      };
      if (heightCm.trim()) updateData.height_cm = Number(heightCm);
      else updateData.height_cm = null;
      if (birthDate.trim()) updateData.birth_date = birthDate;
      else updateData.birth_date = null;
      updateData.sex = sex || null;
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', u.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); toast.success('Perfil actualizado'); },
  });

  const initials = (displayName || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="p-4 pb-20 max-w-lg mx-auto">
      <h1 className="text-xl font-black mb-6 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Perfil
      </h1>

      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-card border border-border">
        <Avatar className="h-16 w-16 border-2 border-primary/30">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-lg font-bold bg-secondary text-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-lg">{displayName || 'Sin nombre'}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Nombre</Label>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-lg bg-card border-border" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Altura (cm)</Label>
            <Input inputMode="decimal" placeholder="175" value={heightCm} onChange={e => setHeightCm(e.target.value)} className="rounded-lg bg-card border-border" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">Fecha de nacimiento</Label>
            <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="rounded-lg bg-card border-border" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Sexo</Label>
          <Select value={sex} onValueChange={setSex}>
            <SelectTrigger className="rounded-lg bg-card border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Masculino</SelectItem>
              <SelectItem value="female">Femenino</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">Unidades de peso</Label>
          <Select value={units} onValueChange={setUnits}>
            <SelectTrigger className="rounded-lg bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">Kilogramos (kg)</SelectItem>
              <SelectItem value="lb">Libras (lb)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full rounded-xl gradient-primary text-primary-foreground border-0 font-bold" onClick={() => saveMutation.mutate()}>Guardar</Button>
      </div>

      <AdminUserApproval />

      <div className="mt-8 pt-6 border-t border-border">
        <Button variant="outline" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
