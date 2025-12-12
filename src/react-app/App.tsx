import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import Layout from "@/react-app/components/Layout";
import Dashboard from "@/react-app/pages/Dashboard";
import Doctors from "@/react-app/pages/Doctors";
import Patients from "@/react-app/pages/Patients";
import Appointments from "@/react-app/pages/Appointments";
import Medicines from "@/react-app/pages/Medicines";
import Prescriptions from "@/react-app/pages/Prescriptions";
import Payments from "@/react-app/pages/Payments";
import PatientHistory from "@/react-app/pages/PatientHistory";
import Login from "@/react-app/pages/Login";
import Signup from "@/react-app/pages/Signup";
import UserProfile from "@/react-app/pages/UserProfile";

// Types
interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
}

type UserRole = 'patient' | 'doctor' | 'admin' | 'guest';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  login: (userData: User, userRole: UserRole, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('guest');

  useEffect(() => {
    // Check for stored authentication
    const storedUser = localStorage.getItem('medicare_user');
    const storedRole = localStorage.getItem('medicare_role') as UserRole;
    const storedToken = localStorage.getItem('medicare_token');

    if (storedUser && storedRole && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setRole(storedRole);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('medicare_user');
        localStorage.removeItem('medicare_role');
        localStorage.removeItem('medicare_token');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User, userRole: UserRole, token: string) => {
    setUser(userData);
    setRole(userRole);
    localStorage.setItem('medicare_user', JSON.stringify(userData));
    localStorage.setItem('medicare_role', userRole);
    localStorage.setItem('medicare_token', token);
  };

  const logout = () => {
    setUser(null);
    setRole('guest');
    localStorage.removeItem('medicare_user');
    localStorage.removeItem('medicare_role');
    localStorage.removeItem('medicare_token');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('medicare_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Loading Component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-lg font-semibold text-gray-700">Loading...</p>
      </div>
    </div>
  );
}

// Protected Route Wrapper
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Wrapper (only accessible when not logged in)
interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Layout Wrapper Component
function LayoutWrapper() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes (No Layout) */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />

          {/* Protected Routes (With Layout) */}
          <Route element={
            <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
              <LayoutWrapper />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Patient routes (accessible to patients, doctors, and admins) */}
            <Route path="/patients" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                <Patients />
              </ProtectedRoute>
            } />
            
            <Route path="/appointments" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                <Appointments />
              </ProtectedRoute>
            } />
            
            <Route path="/prescriptions" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                <Prescriptions />
              </ProtectedRoute>
            } />
            
            <Route path="/payments" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                <Payments />
              </ProtectedRoute>
            } />

            {/* Doctor and Admin only routes */}
            <Route path="/doctors" element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <Doctors />
              </ProtectedRoute>
            } />
            
            <Route path="/medicines" element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <Medicines />
              </ProtectedRoute>
            } />
            
            <Route path="/patient-history/:patientId" element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <PatientHistory />
              </ProtectedRoute>
            } />
            
            {/* User Profile */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}>
                <UserProfile />
              </ProtectedRoute>
            } />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}