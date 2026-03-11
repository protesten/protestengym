import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from the magic link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
    });

    // Also check if we already have a session (user clicked link and got auto-signed in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true);
      } else {
        // Give a moment for the auth event to fire
        setTimeout(() => {
          setValidSession(prev => prev === null ? false : prev);
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
    }
  };

  if (validSession === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (validSession === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center space-y-4">
        <p className="text-muted-foreground">Este enlace ha expirado o no es válido.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate('/auth')}>
          Ir a iniciar sesión
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black mb-2">Contraseña actualizada</h1>
            <p className="text-muted-foreground text-sm">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          </div>
          <Button className="w-full rounded-xl" onClick={() => navigate('/')}>
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 gradient-primary blur-[120px]" />

      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4 glow-primary">
          <Dumbbell className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-black">Nueva contraseña</h1>
        <p className="text-muted-foreground text-sm mt-1">Introduce tu nueva contraseña</p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-sm space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="rounded-xl h-12" />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className="rounded-xl h-12" />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
        </div>
        <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={submitting}>
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {submitting ? 'Guardando...' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  );
}
