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

  const checkAuth = async () => {
    try {
      const bypass = localStorage.getItem('ADMIN_BYPASS') === 'true';
      setIsBypass(bypass);
      
      if (bypass) {
        const profile = await supabaseService.getProfile();
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
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // Try to get profile from database for more accurate onboarding status
        try {
          const profile = await supabaseService.getProfile();
          if (profile) {
            setOnboardingCompleted(profile.onboarding_completed ?? false);
          } else {
            // Fallback to metadata if profile doesn't exist yet
            setOnboardingCompleted(currentUser.user_metadata?.onboarding_completed ?? false);
          }
        } catch (e) {
          // Fallback to metadata on error
          setOnboardingCompleted(currentUser.user_metadata?.onboarding_completed ?? false);
        }
      } else {
        setOnboardingCompleted(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setOnboardingCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (localStorage.getItem('ADMIN_BYPASS') === 'true') return;
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // When auth state changes, we should also re-verify onboarding status from DB if possible
        try {
          const profile = await supabaseService.getProfile();
          if (profile) {
            setOnboardingCompleted(profile.onboarding_completed ?? false);
          } else {
            setOnboardingCompleted(currentUser.user_metadata?.onboarding_completed ?? false);
          }
        } catch (e) {
          setOnboardingCompleted(currentUser.user_metadata?.onboarding_completed ?? false);
        }
      } else {
        setOnboardingCompleted(false);
      }
      setLoading(false);
    });

    return () => {
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
    refreshAuth: checkAuth,
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
