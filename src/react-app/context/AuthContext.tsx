// context/AuthContext.tsx (or your existing auth file)
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase'; // Your singleton Supabase client

interface AuthContextType {
  user: User | null;
  role: 'patient' | 'doctor' | 'admin' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any; role: string }>;
  signup: (email: string, password: string, fullName: string, phone: string, userRole: 'patient' | 'doctor') => Promise<{ error: any }>;
  logout: () => Promise<void>;
  updateUserRole: (userId: string, role: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session and user role
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          
          // Get user role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setRole(profile?.role || null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        
        if (session?.user) {
          // Get user role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          setRole(profile?.role || null);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      return { error: null, role: profile?.role || 'patient' };
    } catch (error: any) {
      return { error, role: null };
    }
  };

  const signup = async (email: string, password: string, fullName: string, phone: string, userRole: 'patient' | 'doctor') => {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: userRole,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('No user created');

      // 2. Create profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: email,
            full_name: fullName,
            phone: phone,
            role: userRole,
            created_at: new Date().toISOString(),
          }
        ]);

      if (profileError) throw profileError;

      // 3. If patient, also create entry in patients table
      if (userRole === 'patient') {
        const { error: patientError } = await supabase
          .from('patients')
          .insert([
            {
              email: email,
              name: fullName,
              phone: phone,
              user_id: authData.user.id,
              created_at: new Date().toISOString(),
            }
          ]);

        if (patientError) {
          console.error('Error creating patient record:', patientError);
          // Continue anyway - patient can fill details later
        }
      }

      // 4. If doctor, also create entry in doctors table
      if (userRole === 'doctor') {
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert([
            {
              email: email,
              name: fullName,
              phone: phone,
              user_id: authData.user.id,
              status: 'pending', // Admin needs to approve
              created_at: new Date().toISOString(),
            }
          ]);

        if (doctorError) {
          console.error('Error creating doctor record:', doctorError);
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setRole(newRole as any);
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, signup, logout, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}