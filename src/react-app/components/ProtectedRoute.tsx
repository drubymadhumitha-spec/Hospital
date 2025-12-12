// src/react-app/components/ProtectedRoute.tsx
import { Navigate } from 'react-router';
import { useAuth } from '@/react-app/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'doctor' | 'receptionist' | 'patient')[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authentication is not required and user is authenticated, redirect to dashboard
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles.length > 0 && role) {
    // Ensure role matches one of the allowed types
    const userRole = role as 'admin' | 'doctor' | 'receptionist' | 'patient';
    
    if (!allowedRoles.includes(userRole)) {
      // Redirect to unauthorized or dashboard based on role
      switch (userRole) {
        case 'patient':
          return <Navigate to="/patient-dashboard" replace />;
        case 'doctor':
          return <Navigate to="/doctor-dashboard" replace />;
        case 'admin':
          return <Navigate to="/admin-dashboard" replace />;
        case 'receptionist':
          return <Navigate to="/receptionist-dashboard" replace />;
        default:
          return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;