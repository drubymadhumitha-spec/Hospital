import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/react-app/App';
import { 
  Plus, Edit, Trash2, Search, Filter, 
  User, Mail, Phone, Calendar, MapPin, 
  Award, Briefcase, Clock, Star, Eye,
  Loader2, AlertCircle
} from 'lucide-react';
import Modal from '@/react-app/components/Modal';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import Select from '@/react-app/components/Select';

// Initialize Supabase client
const supabaseUrl = 'https://mwlmitpcngbgnpicdmsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bG1pdHBjbmdiZ25waWNkbXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc0ODcsImV4cCI6MjA4MTA5MzQ4N30.u3lamYlASvv5lynPVjVsnbwBFbSQcCLqMFWzkVdRL58';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Type definition for Doctor
interface DoctorType {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  available_days: string[];
  consultation_hours: {
    start: string;
    end: string;
  };
  status: 'active' | 'inactive';
  created_at: string;
}

export default function Doctors() {
  const { role } = useAuth(); // Get user role
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    experience_years: '',
    consultation_fee: '',
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    consultation_hours_start: '09:00',
    consultation_hours_end: '17:00',
    status: 'active',
  });

  // Check if user is authorized to access this page
  if (role === 'patient') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            Patients cannot access the doctors management page.
          </p>
          <a
            href="/dashboard"
            className="block w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Fetch doctors from Supabase
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase.from('doctors').select('*');
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,specialization.ilike.%${searchTerm}%`);
      }
      
      // Apply specialization filter
      if (filterSpecialization !== 'all') {
        query = query.eq('specialization', filterSpecialization);
      }
      
      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (err: any) {
      console.error('Error fetching doctors:', err);
      setError(err.message || 'Failed to load doctors data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [searchTerm, filterSpecialization, filterStatus]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization,
        qualification: formData.qualification,
        experience_years: parseInt(formData.experience_years) || 0,
        consultation_fee: parseFloat(formData.consultation_fee) || 0,
        available_days: formData.available_days,
        consultation_hours: {
          start: formData.consultation_hours_start,
          end: formData.consultation_hours_end,
        },
        status: formData.status,
        updated_at: new Date().toISOString(),
      };

      // TODO: Replace with actual API calls
      if (editingDoctor) {
        // Update doctor
        const { error } = await supabase
          .from('doctors')
          .update(payload)
          .eq('id', editingDoctor.id);
        
        if (error) throw error;
      } else {
        // Create new doctor
        const { error } = await supabase
          .from('doctors')
          .insert([payload]);
        
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingDoctor(null);
      resetForm();
      fetchDoctors(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      alert('Error saving doctor. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      qualification: '',
      experience_years: '',
      consultation_fee: '',
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consultation_hours_start: '09:00',
      consultation_hours_end: '17:00',
      status: 'active',
    });
  };

  // Handle edit doctor
  const handleEdit = (doctor: DoctorType) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone || '',
      specialization: doctor.specialization || '',
      qualification: doctor.qualification || '',
      experience_years: doctor.experience_years?.toString() || '',
      consultation_fee: doctor.consultation_fee?.toString() || '',
      available_days: doctor.available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      consultation_hours_start: doctor.consultation_hours?.start || '09:00',
      consultation_hours_end: doctor.consultation_hours?.end || '17:00',
      status: doctor.status || 'active',
    });
    setIsModalOpen(true);
  };

  // Handle delete doctor
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this doctor?')) {
      try {
        const { error } = await supabase
          .from('doctors')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        fetchDoctors(); // Refresh the list
      } catch (error: any) {
        console.error('Error deleting doctor:', error);
        alert('Error deleting doctor. Please try again.');
      }
    }
  };

  // Get specialization color
  const getSpecializationColor = (specialization: string) => {
    const colors: Record<string, string> = {
      'Cardiologist': 'from-red-500 to-pink-500',
      'Pediatrician': 'from-blue-500 to-cyan-500',
      'Orthopedic': 'from-emerald-500 to-teal-500',
      'Dermatologist': 'from-purple-500 to-indigo-500',
      'Neurologist': 'from-amber-500 to-orange-500',
      'Gynecologist': 'from-rose-500 to-pink-500',
      'General Physician': 'from-gray-500 to-slate-500',
      'Surgeon': 'from-red-600 to-orange-500',
    };
    return colors[specialization] || 'from-blue-500 to-purple-500';
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full text-xs font-semibold">
        Active
      </span>
    ) : (
      <span className="px-3 py-1 bg-gradient-to-r from-gray-500 to-slate-500 text-white rounded-full text-xs font-semibold">
        Inactive
      </span>
    );
  };

  // Calculate doctor statistics
  const doctorStats = {
    total: doctors?.length || 0,
    active: doctors?.filter(d => d.status === 'active').length || 0,
    specialties: new Set(doctors?.map(d => d.specialization)).size || 0,
    averageExperience: doctors?.reduce((sum, d) => sum + (d.experience_years || 0), 0) / (doctors?.length || 1),
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading doctors data...</p>
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
                Doctor Management
              </span>
            </h1>
            <p className="text-gray-600 text-lg">Manage doctor profiles and schedules</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Doctor
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Doctors</p>
                <p className="text-2xl font-bold text-gray-900">{doctorStats.total}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Doctors</p>
                <p className="text-2xl font-bold text-gray-900">{doctorStats.active}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Specialties</p>
                <p className="text-2xl font-bold text-gray-900">{doctorStats.specialties}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Experience</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doctorStats.averageExperience.toFixed(1)} years
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors by name, specialization, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-48">
              <Select
                value={filterSpecialization}
                onChange={(e) => setFilterSpecialization(e.target.value)}
                options={[
                  { value: 'all', label: 'All Specialties' },
                  { value: 'Cardiologist', label: 'Cardiologist' },
                  { value: 'Pediatrician', label: 'Pediatrician' },
                  { value: 'Orthopedic', label: 'Orthopedic' },
                  { value: 'Dermatologist', label: 'Dermatologist' },
                  { value: 'General Physician', label: 'General Physician' },
                ]}
                icon={<Filter className="w-4 h-4" />}
              />
            </div>
            
            <div className="w-48">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                icon={<Award className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        <div className="p-6 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Doctor Records</h2>
              <p className="text-sm text-gray-600">
                {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {doctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="bg-gradient-to-br from-white to-blue-50 rounded-xl border border-blue-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getSpecializationColor(doctor.specialization)} flex items-center justify-center`}>
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{doctor.name}</h3>
                        <p className="text-sm text-gray-600">{doctor.specialization}</p>
                        {getStatusBadge(doctor.status)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">{doctor.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{doctor.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">{doctor.qualification}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">{doctor.experience_years || 0} years experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Star className="w-4 h-4 text-rose-500" />
                      <span className="text-sm font-semibold">₹{doctor.consultation_fee || 0}/visit</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(doctor)}
                      className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-md transition-all"
                    >
                      <Edit className="w-4 h-4 inline mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doctor.id)}
                      className="flex-1 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:shadow-md transition-all"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm ? 'No Doctors Found' : 'No Doctors Registered'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? `No doctors match "${searchTerm}"` 
                  : 'Add your first doctor to get started'
                }
              </p>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Doctor
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Doctor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDoctor(null);
          resetForm();
        }}
        title={editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="doctor@hospital.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Phone *
              </label>
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Specialization *
              </label>
              <Select
                required
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                options={[
                  { value: '', label: 'Select Specialization' },
                  { value: 'Cardiologist', label: 'Cardiologist' },
                  { value: 'Pediatrician', label: 'Pediatrician' },
                  { value: 'Orthopedic', label: 'Orthopedic' },
                  { value: 'Dermatologist', label: 'Dermatologist' },
                  { value: 'Neurologist', label: 'Neurologist' },
                  { value: 'Gynecologist', label: 'Gynecologist' },
                  { value: 'General Physician', label: 'General Physician' },
                  { value: 'Surgeon', label: 'Surgeon' },
                ]}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Qualification *
              </label>
              <Input
                required
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="MBBS, MD, etc."
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Experience (Years)
              </label>
              <Input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                placeholder="10"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Consultation Fee (₹)
              </label>
              <Input
                type="number"
                value={formData.consultation_fee}
                onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                placeholder="500"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Consultation Hours
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                <Input
                  type="time"
                  value={formData.consultation_hours_start}
                  onChange={(e) => setFormData({ ...formData, consultation_hours_start: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                <Input
                  type="time"
                  value={formData.consultation_hours_end}
                  onChange={(e) => setFormData({ ...formData, consultation_hours_end: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-blue-100">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingDoctor(null);
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