// src/react-app/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/react-app/lib/supabase'; // Fix import path

// Define proper types
interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  isAuthenticated: boolean; // Add this property
  login: (email: string, password: string) => Promise<{ error: any; role: string | null }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Add isAuthenticated computed property
  const isAuthenticated = !!user;

  // Check for existing session
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch user role from profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            setUser(null);
            setRole(null);
          } else {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              role: profile?.role || 'patient'
            });
            setRole(profile?.role || 'patient');
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => { // Fix parameter types
        if (session?.user) {
          // Fetch user role from profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (!error && profile) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              role: profile.role
            });
            setRole(profile.role);
          }
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error, role: null };
      }

      if (data.user) {
        // Fetch user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          return { error: profileError, role: null };
        }

        const userRole = profile?.role || 'patient';
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          role: userRole
        });
        setRole(userRole);

        return { error: null, role: userRole };
      }

      return { error: new Error('Login failed'), role: null };
    } catch (error: any) {
      return { error, role: null };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    navigate('/login');
  };

  const value = {
    user,
    role,
    isAuthenticated,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};