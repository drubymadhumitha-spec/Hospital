// pages/DoctorDashboard.tsx
import { useAuth } from '@/context/AuthContext';
import { 
  Stethoscope, 
  Calendar, 
  Users, 
  FileText, 
  Clock, 
  TrendingUp,
  Bell,
  LogOut
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mwlmitpcngbgnpicdmsa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bG1pdHBjbmdiZ25waWNkbXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc0ODcsImV4cCI6MjA4MTA5MzQ4N30.u3lamYlASvv5lynPVjVsnbwBFbSQcCLqMFWzkVdRL58'
);

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    pendingPrescriptions: 0,
    averageRating: 4.8
  });

  useEffect(() => {
    fetchDoctorStats();
  }, []);

  const fetchDoctorStats = async () => {
    // Fetch doctor-specific stats
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', user?.id)
      .eq('status', 'scheduled')
      .gte('appointment_date', new Date().toISOString().split('T')[0]);

    setStats({
      todayAppointments: appointments?.length || 0,
      totalPatients: 0, // You'll need to query this
      pendingPrescriptions: 0,
      averageRating: 4.8
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Stethoscope className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
              <p className="text-blue-100">Welcome back, Dr. {user?.full_name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl backdrop-blur-sm transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Today's Appointments</p>
              <p className="text-3xl font-bold text-blue-600">{stats.todayAppointments}</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Patients</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalPatients}</p>
            </div>
            <Users className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Prescriptions</p>
              <p className="text-3xl font-bold text-amber-600">{stats.pendingPrescriptions}</p>
            </div>
            <FileText className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Average Rating</p>
              <p className="text-3xl font-bold text-purple-600">{stats.averageRating}/5.0</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/doctor/appointments" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <Calendar className="w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold mb-2">View Appointments</h3>
            <p className="text-blue-100">Check today's schedule</p>
          </a>

          <a href="/doctor/patients" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <Users className="w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold mb-2">Patient Records</h3>
            <p className="text-emerald-100">Access patient history</p>
          </a>

          <a href="/doctor/prescriptions" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all">
            <FileText className="w-8 h-8 mb-4" />
            <h3 className="text-xl font-bold mb-2">Write Prescription</h3>
            <p className="text-purple-100">Create new prescription</p>
          </a>
        </div>
      </div>
    </div>
  );
}