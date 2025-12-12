import { ReactNode, useContext } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Activity, 
  Users, 
  Calendar, 
  Pill, 
  FileText, 
  LayoutDashboard, 
  Menu, 
  X, 
  DollarSign,
  User,
  LogOut,
  Shield,
  Stethoscope
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/react-app/App';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role, logout } = useAuth();

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Define navigation items based on role
  const getNavItems = () => {
    switch (role) {
      case 'patient':
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/patients', icon: User, label: 'My Profile' },
          { path: '/appointments', icon: Calendar, label: 'Appointments' },
          { path: '/prescriptions', icon: FileText, label: 'Prescriptions' },
          { path: '/payments', icon: DollarSign, label: 'Payments' },
        ];
      
      case 'doctor':
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/patients', icon: Users, label: 'Patients' },
          { path: '/appointments', icon: Calendar, label: 'Appointments' },
          { path: '/prescriptions', icon: FileText, label: 'Prescriptions' },
          { path: '/medicines', icon: Pill, label: 'Medicines' },
        ];
      
      case 'admin':
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/doctors', icon: Stethoscope, label: 'Doctors' },
          { path: '/patients', icon: Users, label: 'Patients' },
          { path: '/appointments', icon: Calendar, label: 'Appointments' },
          { path: '/medicines', icon: Pill, label: 'Medicines' },
          { path: '/prescriptions', icon: FileText, label: 'Prescriptions' },
          { path: '/payments', icon: DollarSign, label: 'Payments' },
        ];
      
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleColor = () => {
    switch (role) {
      case 'patient': return 'from-blue-600 to-cyan-600';
      case 'doctor': return 'from-emerald-600 to-teal-600';
      case 'admin': return 'from-purple-600 to-pink-600';
      default: return 'from-blue-600 to-purple-600';
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'patient': return 'Patient Portal';
      case 'doctor': return 'Doctor Portal';
      case 'admin': return 'Admin Portal';
      default: return 'Portal';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and User Info */}
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-br ${getRoleColor()} p-2 rounded-xl shadow-lg`}>
                {role === 'patient' && <User className="w-6 h-6 text-white" />}
                {role === 'doctor' && <Stethoscope className="w-6 h-6 text-white" />}
                {role === 'admin' && <Shield className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MediCare Plus
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{getRoleLabel()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${getRoleColor()}`}>
                    {role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* User Profile and Logout */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Link
                to="/profile"
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                title="Profile"
              >
                <User className="w-5 h-5 text-gray-600" />
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{user.fullName}</p>
              </div>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex gap-1 py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive(item.path)
                    ? `bg-gradient-to-r ${getRoleColor()} text-white shadow-lg`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
            {/* Mobile User Info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="p-2 bg-gray-100 rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-2 bg-red-100 text-red-600 rounded-lg"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive(item.path)
                      ? `bg-gradient-to-r ${getRoleColor()} text-white shadow-lg`
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-2xl p-6 border border-blue-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user.fullName}!
                </h2>
                <p className="text-gray-600 mt-1">
                  You are logged in as <span className="font-semibold capitalize">{role}</span>
                </p>
              </div>
              <div className="hidden lg:block">
                <div className={`px-4 py-2 rounded-full text-white bg-gradient-to-r ${getRoleColor()}`}>
                  {getRoleLabel()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}