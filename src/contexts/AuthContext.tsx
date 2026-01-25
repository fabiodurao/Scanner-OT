import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role_in_company: string;
  is_approved: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    console.log('Fetching profile for user:', userId);
    
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.error('Profile fetch timeout after 10 seconds');
        resolve(null);
      }, 10000);
    });
    
    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error.message, error.code);
          return null;
        }
        
        console.log('Profile fetched successfully:', data);
        return data as Profile;
      } catch (err) {
        console.error('Exception in fetchProfile:', err);
        return null;
      }
    })();
    
    // Race between fetch and timeout
    return Promise.race([fetchPromise, timeoutPromise]);
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      console.log('Initializing auth...');
      
      // Add overall timeout for initialization
      const initTimeout = setTimeout(() => {
        console.error('Auth initialization timeout after 15 seconds');
        if (mounted) {
          setLoading(false);
        }
      }, 15000);
      
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) setLoading(false);
          clearTimeout(initTimeout);
          return;
        }

        if (!mounted) {
          clearTimeout(initTimeout);
          return;
        }

        console.log('Initial session:', initialSession ? 'exists' : 'null');

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          const profileData = await fetchProfile(initialSession.user.id);
          if (mounted) {
            setProfile(profileData);
            setLoading(false);
            clearTimeout(initTimeout);
          }
        } else {
          if (mounted) {
            setLoading(false);
            clearTimeout(initTimeout);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          clearTimeout(initTimeout);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Small delay to ensure the session is fully established
          setTimeout(async () => {
            if (!mounted) return;
            const profileData = await fetchProfile(newSession.user.id);
            if (mounted) {
              setProfile(profileData);
              setLoading(false);
            }
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
        } else if (event === 'INITIAL_SESSION') {
          // Already handled in initializeAuth
          console.log('Initial session event received');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};