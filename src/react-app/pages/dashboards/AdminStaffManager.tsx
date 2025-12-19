// components/AdminStaffManager.tsx
import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  User, 
  Stethoscope, 
  Shield, 
  UserCheck,
  RefreshCw,
  AlertCircle,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';

// Initialize Supabase (use the same client as in your LoginForm)
const supabaseUrl = 'https://mwlmitpcngbgnpicdmsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bG1pdHBjbmdiZ25waWNkbXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc0ODcsImV4cCI6MjA4MTA5MzQ4N30.u3lamYlASvv5lynPVjVsnbwBFbSQcCLqMFWzkVdRL58';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface StaffMember {
  id: number;
  email: string;
  full_name: string;
  role: 'doctor' | 'receptionist' | 'admin' | 'patient';
  is_active: boolean;
  created_at: string;
  phone?: string;
  department?: string;
  specialty?: string;
  last_login?: string;
}
// interface Props {
//   onStaffUpdate?: (message: string, type: "doctor_approved" | "permissions" | "other") => void;
// }

export default function AdminStaffManager() {

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Fetch all staff members on component mount
  useEffect(() => {
    fetchStaff();
  }, []);
  
  // Apply filters whenever search term, role, status, or original staff list changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, roleFilter, statusFilter, staff]);
  
  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase

        .from('hospital_staff')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFilteredStaff(data || []);

    } catch (err: any) {
      console.error('Error fetching staff:', err);
      setError('Failed to load staff data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let result = [...staff];
    
    // Apply search filter (searches name and email)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(person =>
        person.full_name.toLowerCase().includes(term) ||
        person.email.toLowerCase().includes(term) ||
        person.department?.toLowerCase().includes(term) ||
        person.specialty?.toLowerCase().includes(term)
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(person => person.role === roleFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const targetStatus = statusFilter === 'active';
      result = result.filter(person => person.is_active === targetStatus);
    }
    
    setFilteredStaff(result);
  };
  
  const updateStaffStatus = async (email: string, newStatus: boolean) => {
    setUpdatingId(staff.find(s => s.email === email)?.id || null);
    setError(null);
    setSuccess(null);
    
    try {
      // Call the PostgreSQL function we created
      const { error } = await supabase.rpc('update_staff_status', {
        target_email: email,
        new_status: newStatus
      });
      
      if (error) throw error;
      
      // Update local state
      setStaff(prevStaff =>
        prevStaff.map(person =>
          person.email === email
            ? { ...person, is_active: newStatus, updated_at: new Date().toISOString() }
            : person
        )
      );
      
      setSuccess(`Successfully ${newStatus ? 'activated' : 'deactivated'} account for ${email}`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.message || 'Failed to update user status');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdatingId(null);
    }
  };
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'doctor': return <Stethoscope className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'receptionist': return <UserCheck className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'doctor': return 'bg-blue-100 text-blue-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'receptionist': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" /> Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <AlertCircle className="w-3 h-3 mr-1" /> Pending
      </span>
    );
  };
  
  // Statistics
  const totalDoctors = staff.filter(s => s.role === 'doctor').length;
  const activeDoctors = staff.filter(s => s.role === 'doctor' && s.is_active).length;
  const pendingDoctors = staff.filter(s => s.role === 'doctor' && !s.is_active).length;
  
  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
            <p className="text-gray-600">Manage doctor permissions and staff accounts</p>
          </div>
          <button
            onClick={fetchStaff}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-700">{totalDoctors}</div>
                <div className="text-sm text-blue-600">Total Doctors</div>
              </div>
              <Stethoscope className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-700">{activeDoctors}</div>
                <div className="text-sm text-green-600">Active Doctors</div>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-700">{pendingDoctors}</div>
                <div className="text-sm text-amber-600">Pending Approval</div>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-600 font-medium">{success}</p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Search className="w-4 h-4 mr-2" />
              Search Staff
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or department..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          
          {/* Role Filter */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Filter className="w-4 h-4 mr-2" />
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="receptionist">Receptionists</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Pending Only</option>
            </select>
          </div>
        </div>
        
        {/* Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredStaff.length} of {staff.length} staff members
        </div>
      </div>
      
      {/* Staff Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
            <p className="mt-2 text-gray-600">Loading staff data...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="mt-2 text-gray-600">No staff members found matching your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{person.full_name}</div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {person.email}
                          </div>
                          {person.phone && (
                            <div className="text-sm text-gray-500 flex items-center mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              {person.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(person.role)}`}>
                          {getRoleIcon(person.role)}
                          <span className="ml-1 capitalize">{person.role}</span>
                        </span>
                      </div>
                      {person.specialty && person.role === 'doctor' && (
                        <div className="text-sm text-gray-600 mt-1">{person.specialty}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{person.department || 'Not specified'}</div>
                      {person.created_at && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          Joined {new Date(person.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(person.is_active)}
                      {person.last_login && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last login: {new Date(person.last_login).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {/* Activate Button (for inactive users) */}
                        {!person.is_active && (
                          <button
                            onClick={() => updateStaffStatus(person.email, true)}
                            disabled={updatingId === person.id}
                            className="flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingId === person.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Deactivate Button (for active users) */}
                        {person.is_active && person.role !== 'admin' && (
                          <button
                            onClick={() => updateStaffStatus(person.email, false)}
                            disabled={updatingId === person.id}
                            className="flex items-center px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingId === person.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Deactivate
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Admin accounts cannot be deactivated */}
                        {person.is_active && person.role === 'admin' && (
                          <span className="text-xs text-gray-500 px-2 py-1">System Admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Important Note */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">Admin Permission Notes</p>
            <ul className="space-y-1">
              <li>• Approved doctors gain access to the <code className="bg-blue-100 px-1 rounded">/doctor-dashboard</code></li>
              <li>• Deactivated accounts cannot log into the system</li>
              <li>• Admin accounts cannot be deactivated from this panel</li>
              <li>• Doctors require admin approval before their first login</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}