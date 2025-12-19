// src/react-app/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'receptionist';
  full_name: string;
  department?: string;
  specialty?: string;
  phone?: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  role: string | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
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

  useEffect(() => {
    // Check localStorage for existing session on mount
    const storedAuth = localStorage.getItem('medicare_auth');
    
    if (storedAuth) {
      try {
        const userData = JSON.parse(storedAuth);
        
        // Check if session is still valid (less than 24 hours old)
        const sessionAge = Date.now() - (userData.timestamp || 0);
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge < maxSessionAge) {
          setUser(userData);
        } else {
          // Session expired
          localStorage.removeItem('medicare_auth');
          localStorage.removeItem('medicare_remember');
        }
      } catch (error) {
        console.error('Error parsing stored auth:', error);
        localStorage.removeItem('medicare_auth');
        localStorage.removeItem('medicare_remember');
      }
    }
    
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    const userWithTimestamp = {
      ...userData,
      timestamp: Date.now()
    };
    setUser(userWithTimestamp);
    localStorage.setItem('medicare_auth', JSON.stringify(userWithTimestamp));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('medicare_auth');
    // Don't remove remember me email
  };

  const value = {
    user,
    isAuthenticated: !!user,
    role: user?.role || null,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};