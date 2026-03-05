import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { toast } from 'sonner';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = useCallback(async () => {
    try {
      console.log('[Auth] Starting Google sign-in, origin:', window.location.origin);
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      console.log('[Auth] Sign-in result:', JSON.stringify(result));
      if (result?.error) {
        console.error('[Auth] Sign-in error:', result.error);
      }
    } catch (err) {
      console.error('[Auth] Sign-in exception:', err);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT' && user) {
        // Unexpected sign-out while user was active
        toast.error('Tu sesión ha expirado', {
          action: {
            label: 'Reconectar',
            onClick: () => signInWithGoogle(),
          },
          duration: 15000,
        });
      }

      if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh failed
        toast.error('Error al renovar sesión', {
          action: {
            label: 'Reconectar',
            onClick: () => signInWithGoogle(),
          },
          duration: 15000,
        });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [signInWithGoogle, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
