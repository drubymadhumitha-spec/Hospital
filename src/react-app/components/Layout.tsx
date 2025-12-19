import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
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
  Stethoscope,
  Home,
  Bell,
  Search,
  XCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
}

interface SearchResult {
  id: number;
  type: 'patient' | 'appointment' | 'medicine' | 'doctor' | 'prescription';
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  date?: string;
  status?: string;
  priority?: string;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { user, role, logout } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Search function
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results: SearchResult[] = [];

      // Search based on user role
      switch (role) {
        case 'doctor':
          // Search patients
          const { data: patients } = await supabase
            .from('patients')
            .select('id, name, email, phone, created_at')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);

          if (patients) {
            patients.forEach(patient => {
              results.push({
                id: patient.id,
                type: 'patient',
                title: patient.name,
                subtitle: patient.email,
                description: patient.phone,
                url: `/patients/${patient.id}`,
                date: new Date(patient.created_at).toLocaleDateString()
              });
            });
          }

          // Search appointments
          const { data: appointments } = await supabase
            .from('appointments')
            .select('id, appointment_date, status, patients!appointments_patient_id_fkey(name)')
            .or(`status.ilike.%${query}%,patients.name.ilike.%${query}%`)
            .eq('doctor_id', user.id)
            .limit(5);

          if (appointments) {
            appointments.forEach(appointment => {
              results.push({
                id: appointment.id,
                type: 'appointment',
                title: appointment.patients?.[0]?.name || `Appointment #${appointment.id}`,
                subtitle: new Date(appointment.appointment_date).toLocaleDateString(),
                description: `Status: ${appointment.status}`,
                url: `/appointments/${appointment.id}`,
                date: new Date(appointment.appointment_date).toLocaleDateString(),
                status: appointment.status
              });
            });
          }

          // Search medicines
          const { data: medicines } = await supabase
            .from('medicines')
            .select('id, name, generic_name, manufacturer')
            .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%,manufacturer.ilike.%${query}%`)
            .limit(5);

          if (medicines) {
            medicines.forEach(medicine => {
              results.push({
                id: medicine.id,
                type: 'medicine',
                title: medicine.name,
                subtitle: medicine.generic_name,
                description: `Manufacturer: ${medicine.manufacturer}`,
                url: `/medicines/${medicine.id}`
              });
            });
          }
          break;

        case 'patient':
          // Search own appointments
          const { data: patientAppointments } = await supabase
            .from('appointments')
            .select('id, appointment_date, status, doctors!appointments_doctor_id_fkey(full_name)')
            .eq('patient_id', user.id)
            .or(`status.ilike.%${query}%,doctors.full_name.ilike.%${query}%`)
            .limit(5);

          if (patientAppointments) {
            patientAppointments.forEach(appointment => {
              results.push({
                id: appointment.id,
                type: 'appointment',
                title: `Appointment with Dr. ${appointment.doctors?.[0]?.full_name}`,
                subtitle: new Date(appointment.appointment_date).toLocaleDateString(),
                description: `Status: ${appointment.status}`,
                url: `/appointments/${appointment.id}`,
                status: appointment.status
              });
            });
          }

          // Search own prescriptions
          const { data: prescriptions } = await supabase
            .from('prescriptions')
            .select('id, created_at, doctors!prescriptions_doctor_id_fkey(full_name), medicines!prescriptions_medicine_id_fkey(name)')
            .eq('patient_id', user.id)
            .or(`doctors.full_name.ilike.%${query}%,medicines.name.ilike.%${query}%`)
            .limit(5);

          if (prescriptions) {
            prescriptions.forEach(prescription => {
              results.push({
                id: prescription.id,
                type: 'prescription',
                title: `Prescription from Dr. ${prescription.doctors?.[0]?.full_name}`,
                subtitle: prescription.medicines?.[0]?.name || 'Prescription',
                description: new Date(prescription.created_at).toLocaleDateString(),
                url: `/prescriptions/${prescription.id}`
              });
            });
          }
          break;

        case 'receptionist':
          // Search patients
          const { data: receptionPatients } = await supabase
            .from('patients')
            .select('id, name, email, phone, created_at')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(5);

          if (receptionPatients) {
            receptionPatients.forEach(patient => {
              results.push({
                id: patient.id,
                type: 'patient',
                title: patient.name,
                subtitle: patient.email,
                description: patient.phone,
                url: `/patients/${patient.id}`,
                date: new Date(patient.created_at).toLocaleDateString()
              });
            });
          }

          // Search appointments
          const { data: receptionAppointments } = await supabase
            .from('appointments')
            .select('id, appointment_date, status, patients!appointments_patient_id_fkey(name), doctors!appointments_doctor_id_fkey(full_name)')
            .or(`status.ilike.%${query}%,patients.name.ilike.%${query}%,doctors.full_name.ilike.%${query}%`)
            .limit(5);

          if (receptionAppointments) {
            receptionAppointments.forEach(appointment => {
              results.push({
                id: appointment.id,
                type: 'appointment',
                title: appointment.patients?.[0]?.name || `Appointment #${appointment.id}`,
                subtitle: `Dr. ${appointment.doctors?.[0]?.full_name}`,
                description: `Status: ${appointment.status}`,
                url: `/appointments/${appointment.id}`,
                status: appointment.status
              });
            });
          }

          // Search doctors
          const { data: receptionDoctors } = await supabase
            .from('hospital_staff')
            .select('id, full_name, department, email')
            .eq('role', 'doctor')
            .or(`full_name.ilike.%${query}%,department.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(5);

          if (receptionDoctors) {
            receptionDoctors.forEach(doctor => {
              results.push({
                id: doctor.id,
                type: 'doctor',
                title: `Dr. ${doctor.full_name}`,
                subtitle: doctor.department,
                description: doctor.email,
                url: `/doctors/${doctor.id}`
              });
            });
          }
          break;

        case 'admin':
          // Search everything
          const { data: adminPatients } = await supabase
            .from('patients')
            .select('id, name, email, phone')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(3);

          if (adminPatients) {
            adminPatients.forEach(patient => {
              results.push({
                id: patient.id,
                type: 'patient',
                title: patient.name,
                subtitle: patient.email,
                description: patient.phone,
                url: `/patients/${patient.id}`
              });
            });
          }

          const { data: adminDoctors } = await supabase
            .from('hospital_staff')
            .select('id, full_name, department, email')
            .eq('role', 'doctor')
            .or(`full_name.ilike.%${query}%,department.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(3);

          if (adminDoctors) {
            adminDoctors.forEach(doctor => {
              results.push({
                id: doctor.id,
                type: 'doctor',
                title: `Dr. ${doctor.full_name}`,
                subtitle: doctor.department,
                description: doctor.email,
                url: `/doctors/${doctor.id}`
              });
            });
          }

          const { data: adminAppointments } = await supabase
            .from('appointments')
            .select('id, appointment_date, status, patients!appointments_patient_id_fkey(name)')
            .or(`status.ilike.%${query}%,patients.name.ilike.%${query}%`)
            .limit(3);

          if (adminAppointments) {
            adminAppointments.forEach(appointment => {
              results.push({
                id: appointment.id,
                type: 'appointment',
                title: appointment.patients?.[0]?.name || `Appointment #${appointment.id}`,
                subtitle: new Date(appointment.appointment_date).toLocaleDateString(),
                description: `Status: ${appointment.status}`,
                url: `/appointments/${appointment.id}`,
                status: appointment.status
              });
            });
          }
          break;
      }

      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for debouncing
    timeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleResultClick = (url: string) => {
    navigate(url);
    setShowResults(false);
    setSearchQuery('');
    setMobileMenuOpen(false);
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'patient': return <User className="w-4 h-4" />;
      case 'appointment': return <Calendar className="w-4 h-4" />;
      case 'medicine': return <Pill className="w-4 h-4" />;
      case 'doctor': return <Stethoscope className="w-4 h-4" />;
      case 'prescription': return <FileText className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Get color for result type
  const getResultColor = (type: string) => {
    switch (type) {
      case 'patient': return 'bg-blue-100 text-blue-700';
      case 'appointment': return 'bg-green-100 text-green-700';
      case 'medicine': return 'bg-purple-100 text-purple-700';
      case 'doctor': return 'bg-amber-100 text-amber-700';
      case 'prescription': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Define navigation items based on role
  const getNavItems = () => {
    switch (role) {
      case 'patient':
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/patient-dashboard', icon: Home, label: 'Patient Portal' },
          { path: '/patients', icon: User, label: 'My Profile' },
          { path: '/appointments', icon: Calendar, label: 'Appointments' },
          { path: '/prescriptions', icon: FileText, label: 'Prescriptions' },
          { path: '/payments', icon: DollarSign, label: 'Payments' },
        ];
      
      case 'doctor':
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/doctor-dashboard', icon: Home, label: 'Doctor Portal' },
          { path: '/patients', icon: Users, label: 'Patients' },
          { path: '/appointments', icon: Calendar, label: 'Appointments' },
          { path: '/prescriptions', icon: FileText, label: 'Prescriptions' },
          { path: '/medicines', icon: Pill, label: 'Medicines' },
          { path: '/patient-history', icon: Activity, label: 'Patient History' },
        ];
      
      case 'admin':
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/admin-dashboard', icon: Home, label: 'Admin Portal' },
          { path: '/doctors', icon: Stethoscope, label: 'Doctors' },
          { path: '/patients', icon: Users, label: 'Patients' },
          { path: '/appointments', icon: Calendar, label: 'Appointments' },
          { path: '/medicines', icon: Pill, label: 'Medicines' },
          { path: '/prescriptions', icon: FileText, label: 'Prescriptions' },
          { path: '/payments', icon: DollarSign, label: 'Payments' },
        ];
      
      case 'receptionist':
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/receptionist-dashboard', icon: Home, label: 'Reception' },
          { path: '/patients', icon: Users, label: 'Patients' },
          { path: '/appointments', icon: Calendar, label: 'Appointments' },
          { path: '/payments', icon: DollarSign, label: 'Payments' },
          { path: '/doctors', icon: Stethoscope, label: 'Doctors' },
        ];
      
      default:
        return [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ];
    }
  };

  const navItems = getNavItems();

  const getRoleColor = () => {
    switch (role) {
      case 'patient': return 'from-blue-600 to-cyan-600';
      case 'doctor': return 'from-emerald-600 to-teal-600';
      case 'admin': return 'from-purple-600 to-pink-600';
      case 'receptionist': return 'from-amber-600 to-orange-600';
      default: return 'from-blue-600 to-purple-600';
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'patient': return 'Patient Portal';
      case 'doctor': return 'Doctor Portal';
      case 'admin': return 'Admin Portal';
      case 'receptionist': return 'Reception Portal';
      default: return 'Portal';
    }
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getDisplayName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getDisplayEmail = () => {
    if (user?.email) return user.email;
    return 'user@example.com';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and User Info */}
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-br ${getRoleColor()} p-2 rounded-xl shadow-lg`}>
                {role === 'patient' && <User className="w-6 h-6 text-white" />}
                {role === 'doctor' && <Stethoscope className="w-6 h-6 text-white" />}
                {role === 'admin' && <Shield className="w-6 h-6 text-white" />}
                {role === 'receptionist' && <User className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MediCare Plus
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{getRoleLabel()}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${getRoleColor()}`}>
                    {role?.toUpperCase() || 'USER'}
                  </span>
                </div>
              </div>
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden lg:block flex-1 max-w-xl mx-8 relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery && setShowResults(true)}
                  placeholder={
                    role === 'doctor' ? "Search patients, appointments, medicines..." :
                    role === 'patient' ? "Search appointments, prescriptions..." :
                    role === 'receptionist' ? "Search patients, appointments, doctors..." :
                    "Search patients, doctors, appointments..."
                  }
                  className="w-full pl-10 pr-10 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Search Results ({searchResults.length})
                    </div>
                    {searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result.url)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-start gap-3 group"
                      >
                        <div className={`p-2 rounded-lg ${getResultColor(result.type)}`}>
                          {getResultIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {result.title}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getResultColor(result.type)}`}>
                              {result.type}
                            </span>
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-gray-600 mt-1 truncate">{result.subtitle}</p>
                          )}
                          {result.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{result.description}</p>
                          )}
                          {(result.date || result.status) && (
                            <div className="flex items-center gap-3 mt-2">
                              {result.date && (
                                <span className="text-xs text-gray-500">{result.date}</span>
                              )}
                              {result.status && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  result.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  result.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  result.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {result.status}
                                </span>
                              )}
                              {result.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  result.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  result.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {result.priority}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 p-2">
                    <button
                      onClick={() => {
                        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                        setShowResults(false);
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-800 p-2"
                    >
                      View all results for "{searchQuery}"
                    </button>
                  </div>
                </div>
              )}

              {/* No results */}
              {showResults && searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 p-4 text-center z-50">
                  <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600">No results found for "{searchQuery}"</p>
                  <p className="text-sm text-gray-500 mt-1">Try different keywords</p>
                </div>
              )}
            </div>

            {/* User Profile and Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
                  <p className="text-xs text-gray-500">{getDisplayEmail()}</p>
                </div>
                
                <Link
                  to="/profile"
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white hover:shadow-lg transition-shadow"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all hover:scale-105"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-4">
              <button className="p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex gap-1 py-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{getDisplayName()}</p>
                    <p className="text-sm text-gray-500">{getDisplayEmail()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full text-white bg-gradient-to-r ${getRoleColor()}`}>
                  {role?.toUpperCase()}
                </span>
              </div>
              
              {/* Mobile Search */}
              <div className="mb-4 relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery && setShowResults(true)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-10 py-2 bg-gray-100 border border-gray-200 rounded-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Mobile Search Results */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-50">
                    <div className="p-2">
                      {searchResults.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result.url)}
                          className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-start gap-3"
                        >
                          <div className={`p-2 rounded-lg ${getResultColor(result.type)}`}>
                            {getResultIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {result.title}
                            </div>
                            {result.subtitle && (
                              <div className="text-sm text-gray-600 truncate">{result.subtitle}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 text-center px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >
                  Logout
                </button>
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Welcome back, {getDisplayName()}!
                </h2>
                <p className="text-gray-600 mt-1">
                  You are logged in as <span className="font-semibold capitalize">{role}</span>
                  {user?.department && ` • ${user.department}`}
                  {user?.specialty && ` • ${user.specialty}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className={`px-4 py-2 rounded-full text-white bg-gradient-to-r ${getRoleColor()}`}>
                  {getRoleLabel()}
                </div>
                <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-800">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {children}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} MediCare Plus Hospital Management System. All rights reserved.</p>
          <p className="mt-1">Secure healthcare management platform • Version 1.0.0</p>
        </footer>
      </main>
    </div>
  );
}