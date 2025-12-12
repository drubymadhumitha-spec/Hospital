import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Calendar, 
  User, Stethoscope, CalendarDays, FileText, Bell, Activity, TrendingUp, 
  CalendarCheck, CalendarX, CalendarClock, Search, Eye, Edit
} from 'lucide-react';
import { useApi, apiPost, apiPut, apiDelete } from '@/react-app/hooks/useApi';
import { AppointmentWithDetails, Doctor, Patient } from '@/shared/types';
import Modal from '@/react-app/components/Modal';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { useAuth } from '@/react-app/App'; // Import useAuth hook
import { supabase } from '../lib/supabase'; // Import supabase client

export default function Appointments() {
  const { user, role } = useAuth(); // Get user role
  
  // Fetch data
  const { data: allAppointments, loading, refetch } = useApi<AppointmentWithDetails[]>('appointments_with_details');
  const { data: doctors } = useApi<Doctor[]>('doctors');
  const { data: patients } = useApi<Patient[]>('patients');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_day: '',
    reason: '',
    symptoms: '',
    is_emergency: false,
    reminder_date: '',
  });

  // Fetch current patient's ID if role is patient
  useEffect(() => {
    const fetchCurrentPatientId = async () => {
      if (role === 'patient' && user?.email) {
        try {
          const { data: patientData, error } = await supabase
            .from('patients')
            .select('id')
            .eq('email', user.email)
            .single();
          
          if (patientData && !error) {
            setCurrentPatientId(patientData.id);
            // Auto-fill patient_id in form
            setFormData(prev => ({ ...prev, patient_id: patientData.id.toString() }));
          }
        } catch (error) {
          console.error('Error fetching patient ID:', error);
        }
      }
    };
    
    fetchCurrentPatientId();
  }, [role, user?.email]);

  // Filter appointments based on role
  const filteredAppointments = allAppointments?.filter(appointment => {
    // If patient, show only their appointments
    if (role === 'patient' && currentPatientId) {
      if (appointment.patient_id !== currentPatientId) return false;
    }
    
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      appointment.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.symptoms?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter
    const matchesStatus = statusFilter === '' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // For patients: get patient data
  const currentPatient = role === 'patient' ? 
    patients?.find(p => p.id === currentPatientId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine date and time
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;
      
      const data = {
        patient_id: parseInt(formData.patient_id),
        doctor_id: parseInt(formData.doctor_id),
        appointment_date: appointmentDateTime,
        appointment_day: formData.appointment_day || null,
        appointment_time: formData.appointment_time,
        reason: formData.reason || null,
        symptoms: formData.symptoms,
        status: 'scheduled',
        is_emergency: formData.is_emergency,
        reminder_date: formData.reminder_date || null,
      };

      await apiPost('appointments', data);
      
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: role === 'patient' && currentPatientId ? currentPatientId.toString() : '',
      doctor_id: '',
      appointment_date: '',
      appointment_time: '',
      appointment_day: '',
      reason: '',
      symptoms: '',
      is_emergency: false,
      reminder_date: '',
    });
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await apiPut('appointments', id, { status });
      refetch();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update appointment status. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      try {
        await apiDelete('appointments', id);
        refetch();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        alert('Failed to delete appointment. Please try again.');
      }
    }
  };

  // Calculate appointment statistics
  const calculateStats = () => {
    // For patients: only calculate based on their appointments
    const appointmentsToUse = role === 'patient' ? 
      allAppointments?.filter(a => a.patient_id === currentPatientId) || [] 
      : allAppointments || [];
    
    return {
      total: appointmentsToUse.length,
      scheduled: appointmentsToUse.filter(a => a.status === 'scheduled').length,
      completed: appointmentsToUse.filter(a => a.status === 'completed').length,
      cancelled: appointmentsToUse.filter(a => a.status === 'cancelled').length,
      emergency: appointmentsToUse.filter(a => a.is_emergency).length,
      today: appointmentsToUse.filter(a => {
        if (!a.appointment_date) return false;
        const appointmentDate = new Date(a.appointment_date);
        const today = new Date();
        return appointmentDate.toDateString() === today.toDateString();
      }).length,
    };
  };

  const appointmentStats = calculateStats();

  const getStatusBadge = (status: string, isEmergency: boolean) => {
    const styles = {
      scheduled: isEmergency ? 'from-yellow-500 to-orange-500' : 'from-blue-500 to-cyan-500',
      completed: 'from-green-500 to-emerald-500',
      cancelled: 'from-red-500 to-rose-500',
    };
    
    const icons = {
      scheduled: <CalendarClock className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
      cancelled: <XCircle className="w-3 h-3" />,
    };

    return (
      <div className="flex items-center gap-2">
        <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${styles[status as keyof typeof styles] || 'from-gray-500 to-slate-500'} text-white font-medium flex items-center gap-2`}>
          {icons[status as keyof typeof icons]}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  // For patients who don't have a patient record yet
  if (role === 'patient' && !currentPatientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-4 md:p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
            <Calendar className="w-12 h-12 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Patient Profile Not Found
          </h3>
          <p className="text-gray-500 mb-6">
            You need to have a patient profile to manage appointments.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Please contact the hospital administrator or create your patient profile first.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-gray-600">
              <strong>Your Login Email:</strong> {user?.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {role === 'patient' ? 'My Appointments' : 'Appointment Management'}
              </span>
            </h1>
            <p className="text-gray-600 text-lg">
              {role === 'patient' 
                ? 'View and manage your appointments' 
                : 'Schedule and manage patient appointments efficiently'
              }
            </p>
          </div>
          
          {/* Show schedule button only for doctors/admins OR patients who can schedule */}
          {(role === 'doctor' || role === 'admin' || 
            (role === 'patient' && currentPatientId)) && (
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <Calendar className="w-5 h-5 mr-2" />
              {role === 'patient' ? 'Schedule Appointment' : 'Schedule New Appointment'}
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.total}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.scheduled}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg">
                <CalendarClock className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.completed}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg">
                <CalendarCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.cancelled}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-red-100 to-rose-100 rounded-lg">
                <CalendarX className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Emergency</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.emergency}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's</p>
                <p className="text-2xl font-bold text-gray-900">{appointmentStats.today}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                <CalendarDays className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        <div className="p-6 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {role === 'patient' ? 'My Appointment Schedule' : 'Appointment Schedule'}
              </h2>
              <p className="text-sm text-gray-600">
                {role === 'patient' 
                  ? 'View and manage all your appointments' 
                  : 'Manage all upcoming and past appointments'
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={role === 'patient' ? "Search my appointments..." : "Search appointments..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white w-full md:w-64"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              <select
                className="px-4 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-50">
                    {role !== 'patient' && (
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Patient</th>
                    )}
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Doctor</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date & Time</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Details</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-blue-50/50 transition-colors">
                      {role !== 'patient' && (
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full ${appointment.is_emergency ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'} flex items-center justify-center`}>
                                <User className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                {appointment.patient_name}
                                {appointment.is_emergency && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-100 to-orange-100 text-red-700 text-xs rounded-full">
                                    <AlertTriangle className="w-3 h-3" />
                                    Emergency
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                Patient ID: #{appointment.patient_id}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{appointment.doctor_name}</div>
                            <div className="text-sm text-gray-600">{appointment.doctor_specialty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <div className="font-bold text-gray-900">
                              {new Date(appointment.appointment_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4 text-cyan-500" />
                            <div className="text-sm">
                              {appointment.appointment_day && `${appointment.appointment_day}, `}
                              {appointment.appointment_time || new Date(appointment.appointment_date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm max-w-xs">
                          {appointment.symptoms && (
                            <div className="flex items-start gap-2 text-gray-700 mb-2">
                              <Activity className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium">Symptoms:</span>
                                <p className="mt-1">{appointment.symptoms}</p>
                              </div>
                            </div>
                          )}
                          {appointment.reason && (
                            <div className="flex items-start gap-2 text-gray-600">
                              <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium">Reason:</span>
                                <p className="mt-1">{appointment.reason}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(appointment.status, appointment.is_emergency)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          {/* View details button for patients */}
                          {role === 'patient' && (
                            <button
                              onClick={() => {
                                // View appointment details
                                alert(`Appointment Details:\n\nPatient: ${appointment.patient_name}\nDoctor: ${appointment.doctor_name}\nDate: ${new Date(appointment.appointment_date).toLocaleDateString()}\nTime: ${appointment.appointment_time}\nStatus: ${appointment.status}\nSymptoms: ${appointment.symptoms || 'Not specified'}\nReason: ${appointment.reason || 'Not specified'}`);
                              }}
                              className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                              title="View details"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                          
                          {/* Status update buttons - only for doctors/admins OR patients for their own appointments */}
                          {appointment.status === 'scheduled' && (
                            <>
                              {/* Patients can only cancel their own appointments */}
                              {(role === 'doctor' || role === 'admin' || 
                                (role === 'patient' && appointment.patient_id === currentPatientId)) && (
                                <button
                                  onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                  className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                  title="Mark as completed"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                              )}
                              
                              {/* Patients can cancel, doctors/admins can cancel any */}
                              {(role === 'doctor' || role === 'admin' || 
                                (role === 'patient' && appointment.patient_id === currentPatientId)) && (
                                <button
                                  onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                  className="p-3 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                  title="Cancel appointment"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              )}
                            </>
                          )}
                          
                          {/* Delete button - only for doctors/admins */}
                          {(role === 'doctor' || role === 'admin') && (
                            <button
                              onClick={() => handleDelete(appointment.id)}
                              className="p-3 bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 text-gray-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                              title="Delete appointment"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                <Calendar className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery || statusFilter ? 'No matching appointments found' : 'No Appointments Found'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter 
                  ? 'Try a different search or filter' 
                  : role === 'patient' 
                    ? "You don't have any appointments yet" 
                    : 'Schedule your first appointment to get started'
                }
              </p>
              {(role === 'doctor' || role === 'admin' || 
                (role === 'patient' && currentPatientId)) && (
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={role === 'patient' ? "Schedule My Appointment" : "Schedule New Appointment"}
        className="max-w-3xl"
      >
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-t-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {role === 'patient' ? 'My Appointment Details' : 'Appointment Details'}
              </h3>
              <p className="text-sm text-gray-600">Fill in all the necessary appointment information</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient field - hidden for patients (auto-filled) */}
            {role === 'patient' ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="w-4 h-4 text-blue-500" />
                  Patient
                </label>
                <div className="px-4 py-2.5 border border-blue-200 rounded-lg bg-blue-50">
                  <p className="font-medium">{currentPatient?.name || 'Loading...'}</p>
                  <p className="text-sm text-gray-600">Your appointment will be scheduled under your name</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="w-4 h-4 text-blue-500" />
                  Select Patient *
                </label>
                <select
                  required
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                >
                  <option value="">Select Patient</option>
                  {patients?.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} {patient.age ? `(${patient.age} years)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Stethoscope className="w-4 h-4 text-purple-500" />
                Select Doctor *
              </label>
              <select
                required
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              >
                <option value="">Select Doctor</option>
                {doctors?.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Appointment Date *
              </label>
              <Input
                type="date"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 text-cyan-500" />
                Appointment Time *
              </label>
              <Input
                type="time"
                required
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${formData.is_emergency ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50'}`}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="emergency"
                checked={formData.is_emergency}
                onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="emergency" className={`flex items-center gap-2 font-medium ${formData.is_emergency ? 'text-red-700' : 'text-gray-700'}`}>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Emergency Appointment
              </label>
            </div>
            {formData.is_emergency && (
              <p className="text-sm text-red-600 mt-2 ml-7">
                This appointment will be prioritized in the schedule
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Activity className="w-4 h-4 text-red-500" />
              Symptoms *
            </label>
            <textarea
              required
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              placeholder="Describe your symptoms, pain levels, duration, etc."
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileText className="w-4 h-4 text-blue-500" />
              Reason for Visit
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              placeholder="General checkup, follow-up, consultation, etc."
            />
          </div>

          <div className="flex gap-4 pt-6 border-t border-blue-100">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Calendar className="w-5 h-5 mr-2" />
              {role === 'patient' ? 'Schedule My Appointment' : 'Schedule Appointment'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="py-3 rounded-xl border border-blue-200 hover:border-blue-300"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}