// src/react-app/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase'; // Remove App import

// User interface
export interface User {
  date_of_birth?: string;
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'patient';
  full_name: string;
  department?: string;
  specialty?: string;
  phone?: string;
  token?: string;
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  role: string | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {

    try {
      // Check localStorage for session
      const storedAuth = localStorage.getItem('medicare_auth');

      if (storedAuth) {
        const userData = JSON.parse(storedAuth);

        // Validate session age (24 hours)
        const sessionAge = Date.now() - (userData.timestamp || 0);
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge < maxSessionAge) {
          // Verify user still exists in database (optional)
          try {
            const { data, error } = await supabase
              .from('hospital_staff')
              .select('*')
              .eq('id', userData.id)
              .eq('email', userData.email)
              .single();


            if (!error && data) {
              // Update user data from database
              const updatedUser = {
                ...userData,
                ...data,
                timestamp: Date.now() // Refresh timestamp
              };
              setUser(updatedUser);
              localStorage.setItem('medicare_auth', JSON.stringify(updatedUser));
            } else {
              // User not found in database, clear session
              clearSession();
            }
          } catch (dbError) {
            // Database error, but still keep session (offline mode)
            console.warn('Database check failed, using cached session:', dbError);
            setUser(userData);
          }
        } else {
          // Session expired
          clearSession();
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Session check error:', error);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('medicare_auth');
    localStorage.removeItem('medicare_remember');
  };

  const login = (userData: User) => {
    const userWithTimestamp = {
      ...userData,
      timestamp: Date.now()
    };
    setUser(userWithTimestamp);
    localStorage.setItem('medicare_auth', JSON.stringify(userWithTimestamp));

    // Update last login in database (async, don't wait for it)
    supabase
      .from('hospital_staff')
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id)
      .then(null, (error) => console.warn('Failed to update last login:', error));
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear session
      clearSession();

      // Sign out from Supabase auth if exists
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('hospital_staff')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUser({
          ...user,
          ...data,
        });
      }

    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  // Listen for storage changes (for multi-tab support)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'medicare_auth') {
        if (e.newValue) {
          try {
            const userData = JSON.parse(e.newValue);
            setUser(userData);
          } catch (error) {
            console.error('Storage change parse error:', error);
          }
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-logout after 24 hours
  useEffect(() => {
    if (!user) return;

    const checkSessionTimeout =async  () => {
      const storedAuth = localStorage.getItem('medicare_auth');
      if (storedAuth) {
        const userData = JSON.parse(storedAuth);

        const sessionAge = Date.now() - (userData.timestamp || 0);
        const maxSessionAge = 24 * 60 * 60 * 1000;

        if (sessionAge < maxSessionAge) {
          try {
            const { data, error } = await supabase
              .from('hospital_staff')
              .select('*')
              .eq('id', userData.id)
              .eq('email', userData.email)
              .single();

            if (!error && data) {
              const updatedUser = {
                ...userData,
                ...data,
                timestamp: Date.now(),
              };

              setUser(updatedUser);
              localStorage.setItem('medicare_auth', JSON.stringify(updatedUser));
            } else {
              clearSession();
            }
          } catch (dbError) {
            console.warn('Database check failed, using cached session:', dbError);
            setUser(userData);
          }
        } else {
          clearSession();
        }
      } else {
        setLoading(false);
      }

    };

    // Check every minute
    const interval = setInterval(checkSessionTimeout, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const value = {
    user,
    isAuthenticated: !!user,
    role: user?.role || null,
    loading,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Optional: Hook to check specific roles
export const useRole = () => {
  const { role } = useAuth();

  return {
    isAdmin: role === 'admin',
    isDoctor: role === 'doctor',
    isReceptionist: role === 'receptionist',
    isPatient: role === 'patient',
    hasRole: (requiredRole: string) => role === requiredRole,
    hasAnyRole: (roles: string[]) => roles.includes(role || ''),
  };
};

// Optional: Hook to get user-specific redirect
export const useUserRedirect = () => {
  const { role } = useAuth();

  const getRedirectPath = () => {
    switch (role) {
      case 'admin':
        return '/admin-dashboard';
      case 'doctor':
        return '/doctor-dashboard';
      case 'receptionist':
        return '/receptionist-dashboard';
      case 'patient':
        return '/patient-dashboard';
      default:
        return '/dashboard';
    }
  };

  return { getRedirectPath };
};