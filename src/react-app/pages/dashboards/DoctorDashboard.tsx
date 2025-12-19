// src/react-app/pages/dashboards/DoctorDashboard.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, FileText, Calendar, Stethoscope, RefreshCw,
  Bell, Zap, Activity, Eye, MessageSquare,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface QueuePatient {
  appointment_id: string;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  status: 'waiting' | 'checked_in' | 'in_consultation' | 'completed';
  symptoms: string;
  priority: 'normal' | 'urgent' | 'emergency';
  is_emergency: boolean;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  doctor_name: string;
}

interface DashboardStats {
  todaysAppointments: number;
  waitingPatients: number;
  prescriptionsToday: number;
  nextAppointmentTime: string;
  completedConsultations: number;
  emergencyCases: number;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<QueuePatient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todaysAppointments: 0,
    waitingPatients: 0,
    prescriptionsToday: 12,
    nextAppointmentTime: 'No upcoming',
    completedConsultations: 0,
    emergencyCases: 0
  });
  const [loading, setLoading] = useState(true);
  const [doctorName, setDoctorName] = useState('Dr. abcd');
  const [realtimeStatus, setRealtimeStatus] = useState<'disconnected' | 'connected' | 'connecting'>('disconnected');
  const [lastUpdate, setLastUpdate] = useState('');
  const [notifications, setNotifications] = useState(0);
  
  const doctorId = 16;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasSetupRef = useRef(false);
  const connectionAttemptRef = useRef(0);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('📊 Fetching dashboard data...');
      setLoading(true);
      
      // Fetch from reception_queue
      const { data: queueData, error } = await supabase
        .from('reception_queue')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Error fetching reception_queue:', error);
        // Fallback: Fetch from appointments table directly
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('*, patients(name, email, phone), hospital_staff(full_name)')
          .eq('doctor_id', doctorId)
          .gte('appointment_date', today.toISOString())
          .lt('appointment_date', tomorrow.toISOString())
          .order('appointment_date', { ascending: true });

        if (appointmentsData) {
          const formattedData = appointmentsData.map(appt => ({
            appointment_id: appt.id.toString(),
            patient_id: appt.patient_id,
            doctor_id: appt.doctor_id,
            appointment_date: appt.appointment_date,
            status: appt.status,
            symptoms: appt.symptoms || '',
            priority: appt.priority || 'normal',
            is_emergency: appt.is_emergency || false,
            patient_name: appt.patients?.name || `Patient ${appt.patient_id}`,
            patient_email: appt.patients?.email || '',
            patient_phone: appt.patients?.phone || '',
            doctor_name: appt.hospital_staff?.full_name || 'Dr. abcd'
          }));
          
          setQueuePatients(formattedData);
          setTodaysAppointments(formattedData);
          calculateStats(formattedData);
        }
        return;
      }

      if (queueData && queueData.length > 0) {
        setQueuePatients(queueData);
        setTodaysAppointments(queueData);
        calculateStats(queueData);
      }

      // Get doctor name
      const { data: doctorData } = await supabase
        .from('hospital_staff')
        .select('full_name')
        .eq('id', doctorId)
        .single();
      
      if (doctorData?.full_name) {
        setDoctorName(doctorData.full_name);
      }

    } catch (error) {
      console.error('❌ Error in fetchDashboardData:', error);
    } finally {
      setLoading(false);
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [doctorId]);

  // Calculate statistics
  const calculateStats = useCallback((patients: QueuePatient[]) => {
    const waitingCount = patients.filter(p => 
      ['waiting', 'checked_in'].includes(p.status)
    ).length;
    const completedCount = patients.filter(p => 
      p.status === 'completed'
    ).length;
    const emergencyCount = patients.filter(p => 
      p.is_emergency || p.priority === 'emergency'
    ).length;
    
    // Find next appointment
    const nextAppointment = patients
      .filter(p => ['waiting', 'checked_in'].includes(p.status))
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())[0];
    
    let nextTime = 'No upcoming';
    if (nextAppointment) {
      const now = new Date();
      const appointmentTime = new Date(nextAppointment.appointment_date);
      const diffMinutes = Math.floor((appointmentTime.getTime() - now.getTime()) / 60000);
      nextTime = diffMinutes > 0 ? `${diffMinutes} min` : 'Now';
    }

    setStats({
      todaysAppointments: patients.length,
      waitingPatients: waitingCount,
      prescriptionsToday: 12,
      nextAppointmentTime: nextTime,
      completedConsultations: completedCount,
      emergencyCases: emergencyCount
    });
  }, []);

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('📡 Channel already exists, reusing...');
      return;
    }

    console.log('🔌 Setting up real-time subscription...');
    setRealtimeStatus('connecting');
    connectionAttemptRef.current++;

    // Create unique channel name
    const channelName = `doctor-dashboard-${doctorId}-${Date.now()}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: 'doctor-dashboard' }
      }
    });

    channelRef.current = channel;

    // Listen to appointments table
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `doctor_id=eq.${doctorId}`
      },
      (payload) => {
        console.log('📱 Real-time update received:', {
          event: payload.eventType,
          table: payload.table,
          new: payload.new
        });
        
        // Refresh data
        fetchDashboardData();
        
        // Show notification for new checked-in patients
        if (payload.eventType === 'INSERT' && payload.new?.status === 'checked_in') {
          setNotifications(prev => prev + 1);
          console.log('🔔 New patient checked in!');
        }
      }
    );

    // Subscribe
    channel.subscribe((status) => {
      console.log('📡 Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
        console.log('✅ Real-time connected successfully!');
      } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
        setRealtimeStatus('disconnected');
        console.log('❌ Real-time connection failed:', status);
        
        // Clean up failed channel
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        
        // Attempt reconnect after delay (with exponential backoff)
        const delay = Math.min(3000 * Math.pow(1.5, connectionAttemptRef.current), 30000);
        setTimeout(() => {
          if (!channelRef.current) {
            setupRealtimeSubscription();
          }
        }, delay);
      }
    });

  }, [doctorId, fetchDashboardData]);

  // Initialize - runs once on mount
  useEffect(() => {
    if (hasSetupRef.current) return;
    hasSetupRef.current = true;

    console.log('🚀 Initializing Doctor Dashboard...');

    // Initial data fetch
    fetchDashboardData();

    // Setup real-time with a small delay
    const realtimeTimeout = setTimeout(() => {
      setupRealtimeSubscription();
    }, 500);

    // Update time every 30 seconds
    const timeInterval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString([], { 
        hour: '2-digit', minute: '2-digit' 
      }));
    }, 30000);

    // Auto-refresh every 2 minutes as backup
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing data...');
      fetchDashboardData();
    }, 120000);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Doctor Dashboard...');
      clearTimeout(realtimeTimeout);
      clearInterval(timeInterval);
      clearInterval(refreshInterval);

      // Remove channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchDashboardData, setupRealtimeSubscription]);

  // Manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchDashboardData().finally(() => {
      setTimeout(() => setLoading(false), 300);
    });
  };

  // Clear notifications
  const clearNotifications = () => {
    setNotifications(0);
  };

  // Handle consultation start
  const startConsultation = (appointmentId: string, patientId: number) => {
    // Update status to in_consultation
    supabase
      .from('appointments')
      .update({ 
        status: 'in_consultation',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .then(() => {
        // Navigate to consultation page
        navigate(`/patients/${patientId}/consultation?appointment=${appointmentId}`);
      });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'checked_in': return 'bg-blue-100 text-blue-800';
      case 'in_consultation': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string, isEmergency: boolean) => {
    if (isEmergency) {
      return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Emergency</span>;
    }
    switch (priority) {
      case 'urgent': return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">Urgent</span>;
      case 'emergency': return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Emergency</span>;
      default: return <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">Normal</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Doctor Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Welcome back, {doctorName}</p>
            <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              realtimeStatus === 'connected' ? 'bg-green-100 text-green-800' :
              realtimeStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              {realtimeStatus === 'connected' ? 'Live' :
               realtimeStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              <Zap className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          {notifications > 0 && (
            <button
              onClick={clearNotifications}
              className="p-2 hover:bg-gray-100 rounded-full relative transition-colors"
              title={`${notifications} new patient${notifications > 1 ? 's' : ''}`}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications}
              </span>
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <div className="text-sm text-gray-500 hidden md:block">
            Updated: {lastUpdate}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">{stats.todaysAppointments}</div>
              <div className="text-sm opacity-90">Today's Appointments</div>
            </div>
            <Calendar className="w-8 h-8 opacity-80" />
          </div>
          <div className="mt-2 text-xs opacity-80">
            {stats.emergencyCases} emergency • {stats.completedConsultations} completed
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">{stats.waitingPatients}</div>
              <div className="text-sm opacity-90">Waiting Patients</div>
            </div>
            <Users className="w-8 h-8 opacity-80" />
          </div>
          <div className="mt-2 text-xs opacity-80">
            {queuePatients.filter(p => p.status === 'checked_in').length} checked in
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">{stats.prescriptionsToday}</div>
              <div className="text-sm opacity-90">Prescriptions Today</div>
            </div>
            <FileText className="w-8 h-8 opacity-80" />
          </div>
          <div className="mt-2 text-xs opacity-80">
            From {stats.completedConsultations} consultations
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">{stats.nextAppointmentTime}</div>
              <div className="text-sm opacity-90">Next Appointment</div>
            </div>
            <Clock className="w-8 h-8 opacity-80" />
          </div>
          <div className="mt-2 text-xs opacity-80">
            {todaysAppointments.filter(a => ['waiting', 'checked_in'].includes(a.status)).length} waiting
          </div>
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Today's Appointments</h2>
            <p className="text-sm text-gray-600 mt-1">
              {todaysAppointments.length} patient{todaysAppointments.length !== 1 ? 's' : ''} • Real-time updates
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-sm text-gray-500">
              {realtimeStatus === 'connected' ? 'Live connection' :
               realtimeStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600 mt-2">Loading appointments...</p>
          </div>
        ) : todaysAppointments.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No appointments scheduled for today</p>
            <p className="text-sm text-gray-500 mt-1">All patients have been seen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysAppointments.map((patient) => (
              <div
                key={patient.appointment_id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-all hover:shadow-sm ${
                  patient.is_emergency ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex-1 mb-3 sm:mb-0">
                  <div className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                    {patient.patient_name}
                    {getPriorityBadge(patient.priority, patient.is_emergency)}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3" />
                    {new Date(patient.appointment_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {patient.symptoms}
                  </div>
                </div>
                
                <div className="flex flex-col sm:items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                    {patient.status.replace('_', ' ').toUpperCase()}
                  </span>
                  
                  {patient.status === 'checked_in' && (
                    <button
                      onClick={() => startConsultation(patient.appointment_id, patient.patient_id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Stethoscope className="w-4 h-4" />
                      Start Consultation
                    </button>
                  )}
                  
                  {patient.status === 'in_consultation' && (
                    <button
                      onClick={() => navigate(`/patients/${patient.patient_id}/consultation?appointment=${patient.appointment_id}`)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Continue Consultation
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {todaysAppointments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/appointments')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              View All Appointments & Schedule
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => navigate('/patients')}
            className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
          >
            <Users className="w-6 h-6 text-blue-600 mb-2" />
            <span className="font-medium text-gray-900 text-sm">Patients</span>
          </button>
          
          <button
            onClick={() => navigate('/prescriptions/new')}
            className="flex flex-col items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
          >
            <FileText className="w-6 h-6 text-green-600 mb-2" />
            <span className="font-medium text-gray-900 text-sm">Prescription</span>
          </button>
          
          <button
            onClick={() => navigate('/medical-records')}
            className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
          >
            <Activity className="w-6 h-6 text-purple-600 mb-2" />
            <span className="font-medium text-gray-900 text-sm">Records</span>
          </button>
          
          <button
            onClick={() => navigate('/appointments')}
            className="flex flex-col items-center justify-center p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors group"
          >
            <Calendar className="w-6 h-6 text-amber-600 mb-2" />
            <span className="font-medium text-gray-900 text-sm">Schedule</span>
          </button>
          
          <button
            onClick={() => navigate('/messages')}
            className="flex flex-col items-center justify-center p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors group"
          >
            <MessageSquare className="w-6 h-6 text-indigo-600 mb-2" />
            <span className="font-medium text-gray-900 text-sm">Messages</span>
          </button>
          
          <button
            onClick={handleRefresh}
            className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
          >
            <RefreshCw className="w-6 h-6 text-gray-600 mb-2" />
            <span className="font-medium text-gray-900 text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Connection Status Footer */}
      <div className="text-center text-gray-500 text-sm pt-4 border-t border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="text-left">
            <p className="font-medium">Doctor Dashboard</p>
            <p className="text-xs mt-1">Doctor ID: {doctorId} • {doctorName}</p>
          </div>
          
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-gray-300'
              }`} />
              <span>Real-time: {realtimeStatus}</span>
            </div>
            <span className="text-gray-400">•</span>
            <span>Updated: {lastUpdate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}