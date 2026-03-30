'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';

interface AuthContextType {
  user: any;
  loading: boolean;
  onboardingCompleted: boolean | null;
  isBypass: boolean;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [isBypass, setIsBypass] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const refreshAuth = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const bypass = localStorage.getItem('ADMIN_BYPASS') === 'true';
    setIsBypass(bypass);
    
    if (bypass) {
      try {
        const profile = await supabaseService.getProfile('admin-bypass-id');
        const mockUser = {
          id: 'admin-bypass-id',
          email: 'admin@test.com',
          user_metadata: { 
            full_name: profile?.display_name || 'Administrador de Teste', 
            onboarding_completed: profile?.onboarding_completed ?? true 
          }
        };
        setUser(mockUser);
        setOnboardingCompleted(profile?.onboarding_completed ?? true);
      } catch (e) {
        setUser({ id: 'admin-bypass-id', email: 'admin@test.com' });
        setOnboardingCompleted(true);
      }
      setLoading(false);
      return;
    }

    let currentUser = session?.user ?? null;

    // Silent Login for Admin if no session exists and not in bypass
    if (!currentUser && sessionStorage.getItem('SKIP_SILENT_LOGIN') !== 'true') {
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'word.intelligence@gmail.com',
          password: '24Oliveir@'
        });
        if (!signInError && signInData.user) {
          currentUser = signInData.user;
        } else if (signInError) {
          console.error('Oráculo: Silent login failed:', signInError);
        }
      } catch (e) {
        console.error('Silent login exception:', e);
      }
    }

    setUser(currentUser);
    
    if (currentUser) {
      sessionStorage.removeItem('SKIP_SILENT_LOGIN');
      try {
        const profile = await supabaseService.getProfile(currentUser.id);
        const isAdmin = currentUser.email === 'word.intelligence@gmail.com' || currentUser.email === 'yoelzayithivaldut@gmail.com';
        
        if (profile) {
          setOnboardingCompleted(isAdmin ? true : (profile.onboarding_completed ?? false));
        } else {
          setOnboardingCompleted(isAdmin ? true : (currentUser.user_metadata?.onboarding_completed ?? false));
        }
      } catch (e) {
        const isAdmin = currentUser.email === 'word.intelligence@gmail.com' || currentUser.email === 'yoelzayithivaldut@gmail.com';
        setOnboardingCompleted(isAdmin ? true : (currentUser.user_metadata?.onboarding_completed ?? false));
      }
    } else {
      setOnboardingCompleted(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const handleAuthStateChange = async (session: any) => {
      if (!isMounted) return;
      
      const bypass = localStorage.getItem('ADMIN_BYPASS') === 'true';
      setIsBypass(bypass);
      
      if (bypass) {
        try {
          const profile = await supabaseService.getProfile('admin-bypass-id');
          const mockUser = {
            id: 'admin-bypass-id',
            email: 'admin@test.com',
            user_metadata: { 
              full_name: profile?.display_name || 'Administrador de Teste', 
              onboarding_completed: profile?.onboarding_completed ?? true 
            }
          };
          setUser(mockUser);
          setOnboardingCompleted(profile?.onboarding_completed ?? true);
        } catch (e) {
          setUser({ id: 'admin-bypass-id', email: 'admin@test.com' });
          setOnboardingCompleted(true);
        }
        setLoading(false);
        return;
      }

      let currentUser = session?.user ?? null;

      // Silent Login for Admin if no session exists and not in bypass
      if (!currentUser && sessionStorage.getItem('SKIP_SILENT_LOGIN') !== 'true') {
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'word.intelligence@gmail.com',
            password: '24Oliveir@'
          });
          if (!signInError && signInData.user) {
            currentUser = signInData.user;
          } else if (signInError) {
            console.error('Oráculo: Silent login failed:', signInError);
          }
        } catch (e) {
          console.error('Silent login exception:', e);
        }
      }

      setUser(currentUser);
      
      if (currentUser) {
        sessionStorage.removeItem('SKIP_SILENT_LOGIN');
        try {
          const profile = await supabaseService.getProfile(currentUser.id);
          const isAdmin = currentUser.email === 'word.intelligence@gmail.com' || currentUser.email === 'yoelzayithivaldut@gmail.com';
          
          if (profile) {
            setOnboardingCompleted(isAdmin ? true : (profile.onboarding_completed ?? false));
          } else {
            setOnboardingCompleted(isAdmin ? true : (currentUser.user_metadata?.onboarding_completed ?? false));
          }
        } catch (e) {
          const isAdmin = currentUser.email === 'word.intelligence@gmail.com' || currentUser.email === 'yoelzayithivaldut@gmail.com';
          setOnboardingCompleted(isAdmin ? true : (currentUser.user_metadata?.onboarding_completed ?? false));
        }
      } else {
        setOnboardingCompleted(false);
      }
      setLoading(false);
    };

    // Initial check and subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleAuthStateChange(session);
    });

    // Background connection test - don't block
    (async () => {
      try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST204') {
            supabaseService.handleSchemaError('users');
          } else {
            console.warn('Oráculo: Connection check warning:', error.message);
          }
        }
      } catch (e) {}
    })();

    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      const isPublicPath = pathname === '/login' || pathname === '/auth/callback';
      const isOnboardingPath = pathname === '/onboarding';

      if (!user && !isPublicPath) {
        router.push('/login');
      } else if (user && isPublicPath) {
        const isCompleted = onboardingCompleted ?? user.user_metadata?.onboarding_completed ?? false;
        router.push(isCompleted ? '/' : '/onboarding');
      } else if (user && onboardingCompleted === false && !isOnboardingPath && !isPublicPath) {
        router.push('/onboarding');
      }
    }
  }, [user, loading, onboardingCompleted, pathname, router]);

  const signOut = async () => {
    sessionStorage.setItem('SKIP_SILENT_LOGIN', 'true');
    if (isBypass) {
      localStorage.removeItem('ADMIN_BYPASS');
      window.location.href = '/login';
      return;
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  const value = {
    user,
    loading,
    onboardingCompleted,
    isBypass,
    refreshAuth,
    signOut
  };

  if (loading || (user && onboardingCompleted === null)) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
