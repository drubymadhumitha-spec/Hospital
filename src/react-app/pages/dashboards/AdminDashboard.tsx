// src/react-app/pages/dashboards/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import AdminStaffManager from './AdminStaffManager';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Users, 
  UserCheck, 
  Stethoscope, 
  Settings,
  FileText,
  Database,
  Bell,
  TrendingUp,
  Calendar
} from 'lucide-react';

// Initialize Supabase (same as your LoginForm)
const supabaseUrl = 'https://mwlmitpcngbgnpicdmsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bG1pdHBjbmdiZ25waWNkbXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc0ODcsImV4cCI6MjA4MTA5MzQ4N30.u3lamYlASvv5lynPVjVsnbwBFbSQcCLqMFWzkVdRL58';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activePatients: 0,
    staffMembers: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0,
    activeDoctors: 0
  });
  const [recentActivity] = useState([
    { id: 1, type: 'doctor_approved', message: 'New doctor registration approved', time: '2 hours ago', color: 'green' },
    { id: 2, type: 'backup', message: 'System backup completed', time: '5 hours ago', color: 'blue' },
    { id: 3, type: 'permissions', message: 'User permissions updated', time: '1 day ago', color: 'amber' },
  ]);
  const [loading, setLoading] = useState(true);


  const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  // Fetch live statistics from database
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('hospital_staff')
        .select('*', { count: 'exact', head: true });

      // Get staff members (non-admin roles)
      const { count: staffMembers } = await supabase
        .from('hospital_staff')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin');

      // Get pending approvals (inactive staff)
      const { count: pendingApprovals } = await supabase
        .from('hospital_staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      // Get active doctors
      const { count: activeDoctors } = await supabase
        .from('hospital_staff')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'doctor')
        .eq('is_active', true);

      // Update stats with actual data
      setStats({
        totalUsers: totalUsers || 0,
        activePatients: 156, // You can fetch this from patients table
        staffMembers: staffMembers || 0,
        monthlyRevenue: 12450,
        pendingApprovals: pendingApprovals || 0,
        activeDoctors: activeDoctors || 0
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle quick action clicks
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'manage-users':
        // Scroll to staff manager section
        document.getElementById('staff-manager')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'system-settings':
        alert('System settings panel would open here');
        break;
      case 'view-reports':
        alert('Reports panel would open here');
        break;
      case 'backup-database':
        alert('Database backup initiated');
        break;
    }
  };

  // Add new activity (called when staff status is updated in AdminStaffManager)


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">System Administration & Management</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </button>
            <button 
              onClick={fetchDashboardStats}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Refresh Stats
            </button>
          </div>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">
                {loading ? '...' : stats.totalUsers}
              </div>
              <div className="text-sm opacity-90">Total Users</div>
            </div>
            <Users className="w-8 h-8 opacity-80" />
          </div>
          <div className="mt-2 text-xs opacity-80">
            <span className="text-green-300">↑ 12%</span> from last month
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">{stats.activePatients}</div>
              <div className="text-sm opacity-90">Active Patients</div>
            </div>
            <UserCheck className="w-8 h-8 opacity-80" />
          </div>
          <div className="mt-2 text-xs opacity-80">
            <span className="text-red-300">↓ 3%</span> from yesterday
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">{stats.staffMembers}</div>
              <div className="text-sm opacity-90">Staff Members</div>
              <div className="text-xs opacity-80 mt-1">
                {stats.activeDoctors} doctors active
              </div>
            </div>
            <Stethoscope className="w-8 h-8 opacity-80" />
          </div>
          {stats.pendingApprovals > 0 && (
            <div className="mt-2 text-xs bg-white/20 rounded-full px-2 py-1 inline-block">
              {stats.pendingApprovals} pending approvals
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold mb-2">
  {formatINR(stats.monthlyRevenue)}
</div>

              <div className="text-sm opacity-90">Monthly Revenue</div>
            </div>
            <span className="text-3xl font-bold opacity-80">₹</span>

          </div>
          <div className="mt-2 text-xs opacity-80">
            <span className="text-green-300">↑ 8%</span> from last month
          </div>
        </div>
      </div>

      {/* Staff Management Section */}
      <div id="staff-manager" className="mb-8">
        <AdminStaffManager />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => handleQuickAction('manage-users')}
              className="w-full flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Users className="w-5 h-5 text-blue-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-800">Manage Users</div>
                <div className="text-sm text-gray-600">Approve staff & manage permissions</div>
              </div>
            </button>
            <button 
              onClick={() => handleQuickAction('system-settings')}
              className="w-full flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-green-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-800">System Settings</div>
                <div className="text-sm text-gray-600">Configure hospital system</div>
              </div>
            </button>
            <button 
              onClick={() => handleQuickAction('view-reports')}
              className="w-full flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <FileText className="w-5 h-5 text-purple-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-800">View Reports</div>
                <div className="text-sm text-gray-600">Analytics & performance reports</div>
              </div>
            </button>
            <button 
              onClick={() => handleQuickAction('backup-database')}
              className="w-full flex items-center p-3 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <Database className="w-5 h-5 text-amber-500 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-800">Backup Database</div>
                <div className="text-sm text-gray-600">Create system backup</div>
              </div>
            </button>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start">
                <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full mr-3 mt-2`}></div>
                <div className="flex-1">
                  <div className="text-sm text-gray-800">{activity.message}</div>
                  <div className="text-xs text-gray-500 mt-1">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              <span className="font-medium">Today's summary:</span> {stats.pendingApprovals} pending approvals, {stats.activeDoctors} doctors active
            </div>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span>System Status: Operational</span>
          </div>
          <div>
            Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}