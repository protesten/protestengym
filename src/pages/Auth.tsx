import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type Mode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const clearForm = () => {
    setPassword('');
    setConfirmPassword('');
    setErrors({});
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (mode === 'forgot') {
      const parsed = z.string().trim().email('Email inválido').safeParse(email);
      if (!parsed.success) {
        setErrors({ email: parsed.error.errors[0].message });
        return;
      }
      setSigningIn(true);
      const { error } = await resetPassword(email);
      setSigningIn(false);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Si el email está registrado, recibirás un enlace para restablecer tu contraseña.');
        setMode('login');
        clearForm();
      }
      return;
    }

    if (mode === 'signup') {
      const result = signupSchema.safeParse({ email, password, confirmPassword });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
        setErrors(fieldErrors);
        return;
      }
      setSigningIn(true);
      const { error, needsConfirmation } = await signUp(email, password);
      setSigningIn(false);
      if (error) {
        toast.error(error);
      } else if (needsConfirmation) {
        setShowConfirmation(true);
      }
      return;
    }

    // login
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }
    setSigningIn(true);
    const { error } = await signInWithEmail(email, password);
    setSigningIn(false);
    if (error) {
      toast.error(error);
    }
  };

  const handleGoogleClick = () => {
    setSigningIn(true);
    signInWithGoogle().catch(() => setSigningIn(false));
  };

  if (showConfirmation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black mb-2">Revisa tu correo</h1>
            <p className="text-muted-foreground text-sm">
              Hemos enviado un enlace de confirmación a <strong className="text-foreground">{email}</strong>. Confirma tu email para poder iniciar sesión.
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => { setShowConfirmation(false); setMode('login'); clearForm(); }}>
            Volver a iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10 gradient-primary blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-5 gradient-accent blur-[100px]" />

      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-6 glow-primary">
          <Dumbbell className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Protesten<span className="text-gradient">Gym</span></h1>
        <p className="text-muted-foreground text-lg">Registra y analiza tu progreso</p>
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-5">
        {/* Tabs */}
        {mode !== 'forgot' && (
          <div className="flex rounded-xl bg-muted p-1 gap-1">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => { setMode('login'); clearForm(); }}
            >
              Iniciar sesión
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => { setMode('signup'); clearForm(); }}
            >
              Registrarse
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setMode('login'); clearForm(); }}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="rounded-xl h-12"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="rounded-xl h-12"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="rounded-xl h-12"
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>
          )}

          {mode === 'login' && (
            <button type="button" className="text-xs text-muted-foreground hover:text-primary transition-colors" onClick={() => { setMode('forgot'); clearForm(); }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={signingIn}>
            {signingIn && <Loader2 className="h-5 w-5 animate-spin" />}
            {mode === 'login' && (signingIn ? 'Entrando...' : 'Iniciar sesión')}
            {mode === 'signup' && (signingIn ? 'Registrando...' : 'Crear cuenta')}
            {mode === 'forgot' && (signingIn ? 'Enviando...' : 'Enviar enlace de recuperación')}
          </Button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="relative flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-xs text-muted-foreground">o</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl text-base gap-3"
              onClick={handleGoogleClick}
              disabled={signingIn}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
