import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/App';
import { 
  Activity, 
  Users, 
  Calendar, 
  Pill, 
  UserCheck, 
  UserPlus, 
  Stethoscope, 
  Hospital, 
  Clock, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';

// Import the singleton Supabase client
import { supabase } from '../lib/supabase';

// Types
interface Stats {
  total_doctors: number;
  total_patients: number;
  scheduled_appointments: number;
  total_medicines: number;
  total_revenue: number;
  outpatients: number;
  inpatients: number;
}

export default function Dashboard() {
  const { user, role } = useAuth(); // Get user and role
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard statistics based on user role
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (role === 'patient') {
        // Patient-specific stats
        const patientStats = await fetchPatientStats();
        setStats(patientStats);
        return;
      }

      // Doctor/Admin stats
      console.log('Fetching stats for role:', role);

      // Total Doctors (only for doctors and admins)
      let totalDoctors = 0;
      if (role === 'doctor' || role === 'admin') {
        const { count, error: doctorsError } = await supabase
          .from('doctors')
          .select('*', { count: 'exact', head: false });
        
        if (doctorsError) {
          console.error('Error fetching doctors:', doctorsError);
        } else {
          totalDoctors = count || 0;
        }
      }

      // Total Patients
      const { count: totalPatients, error: patientsError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: false });
      
      if (patientsError) {
        console.error('Error fetching patients:', patientsError);
      }

      // Scheduled Appointments
      const today = new Date().toISOString().split('T')[0];
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'scheduled')
        .gte('appointment_date', today);
      
      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      }

      // Total Medicines (only for doctors and admins)
      let totalMedicines = 0;
      if (role === 'doctor' || role === 'admin') {
        const { count: medicinesCount, error: medicinesError } = await supabase
          .from('medicines')
          .select('*', { count: 'exact', head: false });
        
        if (medicinesError) {
          console.error('Error fetching medicines:', medicinesError);
        } else {
          totalMedicines = medicinesCount || 0;
        }
      }

      // Total Revenue (last 30 days)
      let totalRevenue = 0;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_status', 'completed')
        .gte('payment_date', thirtyDaysAgo);
      
      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      } else if (paymentsData) {
        totalRevenue = paymentsData.reduce((sum: number, payment: any) => 
          sum + (parseFloat(payment.amount) || 0), 0);
      }

      // Outpatients and Inpatients
      const { count: outpatientsCount, error: outpatientsError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: false })
        .eq('patient_type', 'outpatient');
      
      const { count: inpatientsCount, error: inpatientsError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: false })
        .eq('patient_type', 'inpatient');

      setStats({
        total_doctors: totalDoctors,
        total_patients: totalPatients || 0,
        scheduled_appointments: appointmentsData?.length || 0,
        total_medicines: totalMedicines,
        total_revenue: totalRevenue,
        outpatients: outpatientsCount || 0,
        inpatients: inpatientsCount || 0
      });

    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard data.');
      // Set default stats
      setStats({
        total_doctors: 0,
        total_patients: 0,
        scheduled_appointments: 0,
        total_medicines: 0,
        total_revenue: 0,
        outpatients: 0,
        inpatients: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch patient-specific stats
  const fetchPatientStats = async () => {
    try {
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Get current patient's data - use .maybeSingle() instead of .single()
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('email', user.email)
        .maybeSingle(); // Use maybeSingle instead of single

      if (patientError) {
        console.error('Patient fetch error:', patientError);
        throw patientError;
      }

      // If patient doesn't exist, return default stats
      if (!patientData) {
        console.log('Patient not found for email:', user.email);
        return {
          total_doctors: 0,
          total_patients: 0,
          scheduled_appointments: 0,
          total_medicines: 0,
          total_revenue: 0,
          outpatients: 0,
          inpatients: 0
        };
      }

      // Get patient's appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientData.id)
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .eq('status', 'scheduled');

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      }

      // Get patient's payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('patient_id', patientData.id)
        .eq('payment_status', 'completed');

      let totalRevenue = 0;
      if (paymentsData) {
        totalRevenue = paymentsData.reduce((sum: number, payment: any) => 
          sum + (parseFloat(payment.amount) || 0), 0);
      }

      return {
        total_doctors: 0,
        total_patients: 1,
        scheduled_appointments: appointmentsData?.length || 0,
        total_medicines: 0,
        total_revenue: totalRevenue,
        outpatients: patientData.patient_type === 'outpatient' ? 1 : 0,
        inpatients: patientData.patient_type === 'inpatient' ? 1 : 0
      };
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      return {
        total_doctors: 0,
        total_patients: 0,
        scheduled_appointments: 0,
        total_medicines: 0,
        total_revenue: 0,
        outpatients: 0,
        inpatients: 0
      };
    }
  };

  // Initialize
  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [role, user]);

  // Format revenue with Indian Rupee symbol
  const formatIndianCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-semibold text-gray-700">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If user is patient and shouldn't see dashboard, show message
  if (role === 'patient') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Dashboard</h2>
          <p className="text-gray-600 mb-6">
            Welcome to your patient dashboard. You can access your profile, appointments, and medical records.
          </p>
          <div className="space-y-3">
            <a
              href="/patients"
              className="block w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Go to My Profile
            </a>
            <a
              href="/appointments"
              className="block w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              View Appointments
            </a>
            <button
              onClick={() => window.history.back()}
              className="block w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine which stats cards to show based on role
  const showDoctorCard = role === 'doctor' || role === 'admin';
  const showMedicineCard = role === 'doctor' || role === 'admin';
  const showInpatientCard = role === 'doctor' || role === 'admin';
  const showOutpatientCard = role === 'doctor' || role === 'admin';
  const showTotalPatients = role === 'doctor' || role === 'admin';

  return (
    <div className="space-y-8 p-4">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">
            {role === 'patient' ? 'Patient Dashboard' : 'Hospital Dashboard'}
          </h1>
          <p className="text-blue-100 text-lg">
            Welcome {role === 'patient' ? 'back to your health portal' : 'to MediCare Plus Hospital Management System'}
          </p>
          <div className="flex items-center mt-4 space-x-4">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Clock className="w-5 h-5 mr-2" />
              <span>{new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span>Logged in as: {role?.toUpperCase() || 'GUEST'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            <div>
              <p className="font-semibold text-red-700">Error Loading Data</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Doctors Card (only for doctors/admins) */}
        {showDoctorCard && (
          <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Total Doctors</p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.total_doctors || 0}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <Stethoscope className="w-4 h-4" />
                  <span>Active medical staff</span>
                </div>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Stethoscope className="w-8 h-8" />
              </div>
            </div>
          </div>
        )}

        {/* Total Patients Card (always shown) */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">
                {role === 'patient' ? 'My Profile' : 'Total Patients'}
              </p>
              <p className="text-3xl font-bold mt-2">
                {stats?.total_patients || 0}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Users className="w-4 h-4" />
                <span>{role === 'patient' ? 'Your health record' : 'All registered patients'}</span>
              </div>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Appointments Card (always shown) */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Appointments</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.scheduled_appointments || 0}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{role === 'patient' ? 'My upcoming visits' : 'Scheduled today'}</span>
              </div>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Calendar className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Total Revenue Card (always shown) */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-400 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Total Revenue</p>
              <p className="text-3xl font-bold mt-2">
                {formatIndianCurrency(stats?.total_revenue || 0)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>{role === 'patient' ? 'My payments' : 'Last 30 days'}</span>
              </div>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <span className="font-bold text-3xl">₹</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Cards */}
      {(showOutpatientCard || showInpatientCard || showMedicineCard) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Outpatients Card */}
          {showOutpatientCard && (
            <div className="bg-gradient-to-br from-cyan-500 to-blue-400 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Outpatients</p>
                  <p className="text-3xl font-bold mt-2">
                    {stats?.outpatients || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm">
                    <UserCheck className="w-4 h-4" />
                    <span>Non-resident patients</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <UserCheck className="w-8 h-8" />
                </div>
              </div>
            </div>
          )}

          {/* Inpatients Card */}
          {showInpatientCard && (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-400 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Inpatients</p>
                  <p className="text-3xl font-bold mt-2">
                    {stats?.inpatients || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm">
                    <Hospital className="w-4 h-4" />
                    <span>Currently admitted</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Hospital className="w-8 h-8" />
                </div>
              </div>
            </div>
          )}

          {/* Medicines Card (only for doctors/admins) */}
          {showMedicineCard && (
            <div className="bg-gradient-to-br from-orange-500 to-red-400 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Medicines</p>
                  <p className="text-3xl font-bold mt-2">
                    {stats?.total_medicines || 0}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm">
                    <Pill className="w-4 h-4" />
                    <span>Available in stock</span>
                  </div>
                </div>
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Pill className="w-8 h-8" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions - Different for each role */}
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl shadow-2xl p-8 border-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Quick Actions</h2>
            <p className="text-gray-600">
              {role === 'patient' 
                ? 'Manage your healthcare needs' 
                : 'Access frequently used features quickly'
              }
            </p>
          </div>
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Doctor/Admin actions */}
          {role !== 'patient' && (
            <>
              <a
                href="/appointments"
                className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                <Calendar className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold text-white mb-2">Schedule Appointment</h3>
                <p className="text-blue-100">Book new patient appointments</p>
                <div className="absolute bottom-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </a>

              <a
                href="/patients"
                className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-emerald-500 via-green-400 to-teal-400 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                <Users className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold text-white mb-2">Register Patient</h3>
                <p className="text-emerald-100">Add new patient records</p>
                <div className="absolute bottom-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </a>

              <a
                href="/payments"
                className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-400 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                <div className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform duration-300 font-bold text-3xl">
                  ₹
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Process Payment</h3>
                <p className="text-amber-100">Record patient payments</p>
                <div className="absolute bottom-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </a>

              <a
                href="/medicines"
                className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-rose-500 via-pink-400 to-purple-400 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                <Pill className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-xl font-bold text-white mb-2">Manage Medicines</h3>
                <p className="text-rose-100">Update medicine inventory</p>
                <div className="absolute bottom-4 right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  →
                </div>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}