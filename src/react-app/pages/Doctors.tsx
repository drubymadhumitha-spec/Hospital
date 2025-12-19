import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase'; // Use centralized client
import { 
  Plus, Edit, Trash2, Search, 
  User, Mail, Phone, Calendar, 
  Award, Briefcase, Clock, Star,
AlertCircle
} from 'lucide-react';

// Type definition for Doctor (matching your Supabase table)
interface DoctorType {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialty: string; // Changed from specialization
  specialization?: string; // Keep optional for backward compatibility
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
  // Note: available_days and consultation_hours columns don't exist in your table
}

export default function Doctors() {
  const { role } = useAuth(); // Get user role
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all'); // Changed from filterSpecialization
  const [filterStatus, setFilterStatus] = useState('all');
  const [doctors, setDoctors] = useState<DoctorType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state - only include columns that exist in your table
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '', // Changed from specialization
    qualification: '',
    experience_years: '',
    consultation_fee: '',
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
      
      console.log('Fetching doctors...');
      let query = supabase.from('doctors').select('*');
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,specialty.ilike.%${searchTerm}%`);
      }
      
      // Apply specialty filter
      if (filterSpecialty !== 'all') {
        query = query.eq('specialty', filterSpecialty);
      }
      
      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        throw fetchError;
      }
      
      console.log('Fetched doctors:', data);
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
  }, [searchTerm, filterSpecialty, filterStatus]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting doctor data...');
      
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        specialty: formData.specialty, // Use specialty column
        qualification: formData.qualification,
        experience_years: parseInt(formData.experience_years) || 0,
        consultation_fee: parseFloat(formData.consultation_fee) || 0,
        status: formData.status,
        updated_at: new Date().toISOString(),
      };

      console.log('Payload:', payload);

      if (editingDoctor) {
        // Update doctor
        console.log('Updating doctor ID:', editingDoctor.id);
        const { data, error: updateError } = await supabase
          .from('doctors')
          .update(payload)
          .eq('id', editingDoctor.id)
          .select();
        
        if (updateError) {
          console.error('Update error:', updateError);
          
          // If table doesn't exist, create it
          if (updateError.message.includes('does not exist')) {
            await createDoctorsTable();
            // Retry update
            const { data: retryData, error: retryError } = await supabase
              .from('doctors')
              .update(payload)
              .eq('id', editingDoctor.id)
              .select();
            
            if (retryError) throw retryError;
            console.log('Retry successful:', retryData);
          } else {
            throw updateError;
          }
        } else {
          console.log('Update successful:', data);
        }
      } else {
        // Create new doctor
        console.log('Creating new doctor');
        const { data, error: insertError } = await supabase
          .from('doctors')
          .insert([payload])
          .select();
        
        if (insertError) {
          console.error('Insert error:', insertError);
          
          // If table doesn't exist, create it
          if (insertError.message.includes('does not exist')) {
            await createDoctorsTable();
            // Retry insert
            const { data: retryData, error: retryError } = await supabase
              .from('doctors')
              .insert([payload])
              .select();
            
            if (retryError) throw retryError;
            console.log('Retry successful:', retryData);
          } else {
            throw insertError;
          }
        } else {
          console.log('Insert successful:', data);
        }
      }
      
      setIsModalOpen(false);
      setEditingDoctor(null);
      resetForm();
      fetchDoctors(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      alert(`Error saving doctor: ${error.message}\n\nPlease check if the doctors table exists in your Supabase.`);
    }
  };

  // Create doctors table if it doesn't exist
  const createDoctorsTable = async () => {
    try {
      console.log('Creating doctors table...');
      
      // First, let's check if table exists
      const { error: checkError } = await supabase
        .from('doctors')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.message.includes('does not exist')) {
        // Table doesn't exist, we need to create it via SQL
        console.log('Table does not exist, showing SQL instructions...');
        
        const sql = `
          CREATE TABLE doctors (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            specialty VARCHAR(100),
            qualification VARCHAR(255),
            experience_years INTEGER DEFAULT 0,
            consultation_fee DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          -- Disable RLS for testing
          ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
        `;
        
        // Copy SQL to clipboard
        navigator.clipboard.writeText(sql)
          .then(() => {
            alert('SQL to create doctors table copied to clipboard!\n\n' +
                  'Please go to Supabase SQL Editor and run this SQL, then refresh the page.');
            window.open('https://supabase.com/dashboard/project/mwlmitpcngbgnpicdmsa/sql', '_blank');
          })
          .catch(() => {
            alert(`Please run this SQL in Supabase SQL Editor:\n\n${sql}`);
          });
        
        throw new Error('Doctors table does not exist. Please create it first.');
      }
      
      // Table exists, but might have wrong columns
      console.log('Table exists, checking columns...');
      
    } catch (err) {
      console.error('Failed to create/check table:', err);
      throw err;
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialty: '',
      qualification: '',
      experience_years: '',
      consultation_fee: '',
      status: 'active',
    });
  };

  // Handle edit doctor
  const handleEdit = (doctor: DoctorType) => {
    console.log('Editing doctor:', doctor);
    
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      specialty: doctor.specialty || doctor.specialization || '', // Use specialty or fallback to specialization
      qualification: doctor.qualification || '',
      experience_years: doctor.experience_years?.toString() || '',
      consultation_fee: doctor.consultation_fee?.toString() || '',
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
  const getSpecialtyColor = (specialty: string) => {
    const colors: Record<string, string> = {
      'Cardiology': 'from-red-500 to-pink-500',
      'Pediatrics': 'from-blue-500 to-cyan-500',
      'Orthopedics': 'from-emerald-500 to-teal-500',
      'Dermatology': 'from-purple-500 to-indigo-500',
      'Neurology': 'from-amber-500 to-orange-500',
      'Gynecology': 'from-rose-500 to-pink-500',
      'General Physician': 'from-gray-500 to-slate-500',
      'Surgery': 'from-red-600 to-orange-500',
      'Cardiologist': 'from-red-500 to-pink-500',
      'Pediatrician': 'from-blue-500 to-cyan-500',
      'Orthopedic': 'from-emerald-500 to-teal-500',
      'Dermatologist': 'from-purple-500 to-indigo-500',
    };
    return colors[specialty] || 'from-blue-500 to-purple-500';
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
    specialties: new Set(doctors?.map(d => d.specialty || d.specialization).filter(Boolean)).size || 0,
    averageExperience: doctors?.length 
      ? doctors.reduce((sum, d) => sum + (d.experience_years || 0), 0) / doctors.length 
      : 0,
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
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Doctor
          </button>
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
                placeholder="Search doctors by name, specialty, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-48">
              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Dermatology">Dermatology</option>
                <option value="General Physician">General Physician</option>
              </select>
            </div>
            
            <div className="w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
                      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getSpecialtyColor(doctor.specialty || doctor.specialization || '')} flex items-center justify-center`}>
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{doctor.name}</h3>
                        <p className="text-sm text-gray-600">{doctor.specialty || doctor.specialization || 'General Physician'}</p>
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
                      <span className="text-sm">{doctor.qualification || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">{doctor.experience_years || 0} years experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Star className="w-4 h-4 text-rose-500" />
                      <span className="text-sm font-semibold">₹{doctor.consultation_fee || 0}/visit</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm text-xs">Added: {new Date(doctor.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(doctor)}
                      className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-md transition-all flex items-center justify-center"
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doctor.id)}
                      className="flex-1 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:shadow-md transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
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
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl flex items-center mx-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Doctor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-blue-100">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingDoctor(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. John Doe"
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Specialty *
                  </label>
                  <select
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Specialty</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Gynecology">Gynecology</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Surgery">Surgery</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Qualification *
                  </label>
                  <input
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="MBBS, MD, etc."
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                    placeholder="10"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                    placeholder="500"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-blue-100">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingDoctor(null);
                    resetForm();
                  }}
                  className="py-3 px-6 rounded-xl border border-blue-200 hover:border-blue-300 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}