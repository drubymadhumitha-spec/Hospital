import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "@/react-app/context/AuthContext";
import Layout from "@/react-app/components/Layout";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import PatientHistoryList from "./pages/PatientHistoryList";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("@/react-app/pages/Dashboard"));
const Doctors = lazy(() => import("@/react-app/pages/Doctors"));
const Patients = lazy(() => import("@/react-app/pages/Patients"));
const Appointments = lazy(() => import("@/react-app/pages/Appointments"));
const Medicines = lazy(() => import("@/react-app/pages/Medicines"));
const Prescriptions = lazy(() => import("@/react-app/pages/Prescriptions"));
const Payments = lazy(() => import("@/react-app/pages/Payments"));
const PatientHistoryDetail = lazy(() => import("@/react-app/pages/PatientHistory"));
const UserProfile = lazy(() => import("@/react-app/pages/UserProfile"));

// Create simple dashboard components inline since files might not exist
const AdminDashboard = lazy(() =>
  import("./pages/dashboards/AdminDashboard").catch(() => ({
    default: () => <div className="p-6"><h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1><p>System Administration</p></div>
  }))
);

const DoctorDashboard = lazy(() =>
  import("./pages/dashboards/DoctorDashboard").catch(() => ({
    default: () => <div className="p-6"><h1 className="text-3xl font-bold text-gray-800 mb-2">Doctor Dashboard</h1><p>Medical Practice</p></div>
  }))
);

const ReceptionistDashboard = lazy(() =>
  import("./pages/dashboards/ReceptionistDashboard").catch(() => ({
    default: () => <div className="p-6"><h1 className="text-3xl font-bold text-gray-800 mb-2">Receptionist Dashboard</h1><p>Front Desk</p></div>
  }))
);

const PatientDashboard = lazy(() =>
  import("./pages/dashboards/PatientDashboard").catch(() => ({
    default: () => <div className="p-6"><h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Dashboard</h1><p>Health Portal</p></div>
  }))
);

// Loading Components
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

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );
}

// Protected Route Wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'doctor' | 'receptionist' | 'patient')[];
  requireAuth?: boolean;
}

function ProtectedRoute({
  children,
  allowedRoles = [],
  requireAuth = true
}: ProtectedRouteProps) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authentication is not required and user is authenticated, redirect to dashboard
  if (!requireAuth && isAuthenticated) {
    // Redirect to role-specific dashboard
    switch (role) {
      case 'admin':
        return <Navigate to="/admin-dashboard" replace />;
      case 'doctor':
        return <Navigate to="/doctor-dashboard" replace />;
      case 'receptionist':
        return <Navigate to="/receptionist-dashboard" replace />;
      case 'patient':
        return <Navigate to="/patient-dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles.length > 0 && role) {
    // Ensure role matches one of the allowed types
    const userRole = role as 'admin' | 'doctor' | 'receptionist' | 'patient';

    if (!allowedRoles.includes(userRole)) {
      // Redirect to role-specific dashboard
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
}

// Layout Wrapper Component
function LayoutWrapper() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </Layout>
  );
}

// Role-specific dashboard wrapper
function RoleDashboardWrapper() {
  const { role } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      {role === 'admin' && <AdminDashboard />}
      {role === 'doctor' && <DoctorDashboard />}
      {role === 'receptionist' && <ReceptionistDashboard />}
      {role === 'patient' && <PatientDashboard />}
      {!['admin', 'doctor', 'receptionist', 'patient'].includes(role || '') && <Dashboard />}
    </Suspense>
  );
}

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Routes (No Layout) */}
            <Route path="/login" element={
              <ProtectedRoute requireAuth={false}>
                <LoginForm />
              </ProtectedRoute>
            } />

            <Route path="/signup" element={
              <ProtectedRoute requireAuth={false}>
                <SignupForm />
              </ProtectedRoute>
            } />

            {/* Direct role-based redirects */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Navigate to="/admin-dashboard" replace />
              </ProtectedRoute>
            } />

            <Route path="/doctor" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <Navigate to="/doctor-dashboard" replace />
              </ProtectedRoute>
            } />

            <Route path="/receptionist" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <Navigate to="/receptionist-dashboard" replace />
              </ProtectedRoute>
            } />

            <Route path="/patient" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <Navigate to="/patient-dashboard" replace />
              </ProtectedRoute>
            } />

            {/* Role-specific dashboards */}
            <Route path="/admin-dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LayoutWrapper />
              </ProtectedRoute>
            }>
              <Route index element={<RoleDashboardWrapper />} />
            </Route>

            <Route path="/doctor-dashboard" element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <LayoutWrapper />
              </ProtectedRoute>
            }>
              <Route index element={<RoleDashboardWrapper />} />
            </Route>

            <Route path="/receptionist-dashboard" element={
              <ProtectedRoute allowedRoles={['receptionist']}>
                <LayoutWrapper />
              </ProtectedRoute>
            }>
              <Route index element={<RoleDashboardWrapper />} />
            </Route>

            <Route path="/patient-dashboard" element={
              <ProtectedRoute allowedRoles={['patient']}>
                <LayoutWrapper />
              </ProtectedRoute>
            }>
              <Route index element={<RoleDashboardWrapper />} />
            </Route>

            {/* Admin Portal Route */}
            <Route path="/admin-portal" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Navigate to="/admin-dashboard" replace />
              </ProtectedRoute>
            } />

            {/* Main Layout Routes */}
            <Route element={
              <ProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist', 'patient']}>
                <LayoutWrapper />
              </ProtectedRoute>
            }>
              {/* Dashboard - redirects to role-specific dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<RoleDashboardWrapper />} />

              {/* Patients routes */}
              <Route path="/patients" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist']}>
                  <Patients />
                </ProtectedRoute>
              } />

              {/* Appointments routes */}
              <Route path="/appointments" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist', 'patient']}>
                  <Appointments />
                </ProtectedRoute>
              } />

              {/* Doctors routes */}
              <Route path="/doctors" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist', 'patient']}>
                  <Doctors />
                </ProtectedRoute>
              } />

              {/* Prescriptions routes */}
              <Route path="/prescriptions" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'patient']}>
                  <Prescriptions />
                </ProtectedRoute>
              } />

              {/* Payments routes */}
              <Route path="/payments" element={
                <ProtectedRoute allowedRoles={['admin', 'receptionist', 'patient']}>
                  <Payments />
                </ProtectedRoute>
              } />

              {/* Medicines routes (Admin & Doctor only) */}
              <Route path="/medicines" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor']}>
                  <Medicines />
                </ProtectedRoute>
              } />

              {/* Patient History routes (Doctor & Admin only) */}
          // In your App.tsx or routing configuration:
              <Route path="/patient-history" element={<PatientHistoryList />} />
              <Route path="/patient-history/:patientId" element={<PatientHistoryDetail />} />

              {/* User Profile */}
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist', 'patient']}>
                  <UserProfile />
                </ProtectedRoute>
              } />
            </Route>

            {/* Catch all route - redirect to login */}
            <Route path="*" element={
              <ProtectedRoute requireAuth={false}>
                <Navigate to="/login" replace />
              </ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}