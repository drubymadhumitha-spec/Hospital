import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, History, User, Phone, Mail, Calendar, 
  MapPin, Droplets, Activity, Heart, Stethoscope, Users, 
  UserCheck, UserPlus, Search, Filter, Download, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase, apiPost, apiPut, apiDelete, useApi } from '@/react-app/hooks/useApi';
import { useAuth } from '@/react-app/App';
import Modal from '@/react-app/components/Modal';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import Select from '@/react-app/components/Select';
import Checkbox from '@/react-app/components/Checkbox';

// Type definition for Patient
interface PatientType {
  id: number;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  blood_group: string;
  medical_history: string;
  age: number;
  patient_type: string;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_sugar_issues: boolean;
  family_medical_history: string;
  created_at: string;
  updated_at: string;
}

export default function Patients() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  console.log('Current user role:', role); // Debug log
  console.log('Current user email:', user?.email); // Debug log
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [patients, setPatients] = useState<PatientType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserPatientId, setCurrentUserPatientId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    blood_group: '',
    medical_history: '',
    age: '',
    patient_type: 'outpatient',
    has_diabetes: false,
    has_hypertension: false,
    has_sugar_issues: false,
    family_medical_history: '',
  });

  // Fetch patients from Supabase
  const fetchPatients = async () => {
    try {
      setLoading(true);
      console.log('Fetching patients for role:', role); // Debug log
      
      // For patient role: show only their own record
      if (role === 'patient') {
        console.log('Fetching patient record for email:', user?.email); // Debug log
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('email', user?.email)
          .single();
        
        if (patientError) {
          console.log('Patient not found:', patientError.message);
          setPatients([]);
          setCurrentUserPatientId(null);
        } else if (patientData) {
          console.log('Found patient:', patientData); // Debug log
          setCurrentUserPatientId(patientData.id);
          setPatients([patientData]);
        }
        setLoading(false);
        return;
      }
      
      // For doctor and admin roles: show ALL patients with filters
      console.log('Fetching all patients for doctor/admin'); // Debug log
      let query = supabase.from('patients').select('*');
      
      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }
      
      // Apply patient type filter
      if (filterType !== 'all') {
        query = query.eq('patient_type', filterType);
      }
      
      // Apply health status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'critical') {
          query = query.or('has_diabetes.eq.true,has_hypertension.eq.true,has_sugar_issues.eq.true');
        } else if (filterStatus === 'healthy') {
          query = query.and('has_diabetes.eq.false,has_hypertension.eq.false,has_sugar_issues.eq.false');
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching patients:', error);
        throw error;
      }
      
      console.log('Patients fetched:', data?.length); // Debug log
      setPatients(data || []);
      
      // Set current user's patient ID if they're in the database
      if (user?.email) {
        const userPatient = data?.find(p => p.email === user.email);
        if (userPatient) {
          setCurrentUserPatientId(userPatient.id);
        }
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchTerm, filterType, filterStatus, role, user]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        date_of_birth: formData.date_of_birth || null,
        updated_at: new Date().toISOString(),
      };

      // Patients can only update their own record
      if (role === 'patient' && editingPatient) {
        await apiPut('patients', editingPatient.id, payload);
      } 
      // Doctors and admins can create/update any patient
      else if (role === 'doctor' || role === 'admin') {
        if (editingPatient) {
          await apiPut('patients', editingPatient.id, payload);
        } else {
          await apiPost('patients', payload);
        }
      }
      
      setIsModalOpen(false);
      setEditingPatient(null);
      resetForm();
      fetchPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Error saving patient. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      address: '',
      blood_group: '',
      medical_history: '',
      age: '',
      patient_type: 'outpatient',
      has_diabetes: false,
      has_hypertension: false,
      has_sugar_issues: false,
      family_medical_history: '',
    });
  };

  // Handle edit patient
  const handleEdit = (patient: PatientType) => {
    console.log('Editing patient:', patient.id, 'Current user patient ID:', currentUserPatientId); // Debug log
    
    // Patients can only edit their own record
    if (role === 'patient') {
      if (!currentUserPatientId) {
        alert('You do not have a patient profile');
        return;
      }
      if (patient.id !== currentUserPatientId) {
        alert('You can only edit your own profile');
        return;
      }
    }
    
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      email: patient.email,
      phone: patient.phone || '',
      date_of_birth: patient.date_of_birth || '',
      gender: patient.gender || '',
      address: patient.address || '',
      blood_group: patient.blood_group || '',
      medical_history: patient.medical_history || '',
      age: patient.age?.toString() || '',
      patient_type: patient.patient_type || 'outpatient',
      has_diabetes: Boolean(patient.has_diabetes),
      has_hypertension: Boolean(patient.has_hypertension),
      has_sugar_issues: Boolean(patient.has_sugar_issues),
      family_medical_history: patient.family_medical_history || '',
    });
    setIsModalOpen(true);
  };

  // Handle delete patient
  const handleDelete = async (id: number) => {
    // Only doctors and admins can delete
    if (role === 'patient') {
      alert('Patients cannot delete records');
      return;
    }
    
    if (confirm('Are you sure you want to delete this patient?')) {
      try {
        await apiDelete('patients', id);
        fetchPatients();
      } catch (error) {
        console.error('Error deleting patient:', error);
        alert('Error deleting patient. Please try again.');
      }
    }
  };

  // Get blood group color
  const getBloodGroupColor = (bloodGroup: string) => {
    const colors: Record<string, string> = {
      'A+': 'from-red-500 to-pink-500',
      'A-': 'from-red-400 to-rose-400',
      'B+': 'from-blue-500 to-cyan-500',
      'B-': 'from-blue-400 to-cyan-400',
      'AB+': 'from-purple-500 to-indigo-500',
      'AB-': 'from-purple-400 to-indigo-400',
      'O+': 'from-green-500 to-emerald-500',
      'O-': 'from-green-400 to-emerald-400',
    };
    return colors[bloodGroup] || 'from-gray-500 to-slate-500';
  };

  // Get patient type color
  const getPatientTypeColor = (type: string) => {
    return type === 'inpatient' 
      ? 'from-purple-500 to-pink-500' 
      : 'from-blue-500 to-cyan-500';
  };

  // Calculate patient statistics (for doctors and admins)
  const patientStats = {
    total: patients?.length || 0,
    inpatients: patients?.filter(p => p.patient_type === 'inpatient').length || 0,
    outpatients: patients?.filter(p => p.patient_type === 'outpatient').length || 0,
    critical: patients?.filter(p => {
      return p.has_diabetes || p.has_hypertension || p.has_sugar_issues;
    }).length || 0,
  };

  // Export patients to CSV (for doctors and admins)
  const exportToCSV = () => {
    if (role === 'patient') {
      alert('Patients cannot export data');
      return;
    }
    
    const headers = ['Name', 'Email', 'Phone', 'Age', 'Gender', 'Blood Group', 'Patient Type', 'Conditions'];
    const csvData = patients.map(p => [
      p.name,
      p.email,
      p.phone,
      p.age,
      p.gender,
      p.blood_group,
      p.patient_type,
      [p.has_diabetes && 'Diabetes', p.has_hypertension && 'Hypertension', p.has_sugar_issues && 'Sugar Issues']
        .filter(Boolean).join(', ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Main columns for the table
  const columns = [
    {
      header: 'Patient',
      accessor: (patient: PatientType) => (
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getPatientTypeColor(patient.patient_type)} flex items-center justify-center`}>
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg">{patient.name}</div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-3 h-3" />
              {patient.age ? `${patient.age} years` : 'Age not specified'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (patient: PatientType) => (
        <div className="flex items-center">
          <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getPatientTypeColor(patient.patient_type)} text-white font-medium shadow-sm flex items-center gap-2`}>
            {patient.patient_type === 'inpatient' ? <UserPlus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {patient.patient_type === 'inpatient' ? 'Inpatient' : 'Outpatient'}
          </div>
        </div>
      ),
    },
    {
      header: 'Blood Group',
      accessor: (patient: PatientType) => patient.blood_group ? (
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${getBloodGroupColor(patient.blood_group)}`}>
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900">{patient.blood_group}</div>
            <div className="text-xs text-gray-500">Blood Type</div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 italic">Not specified</div>
      ),
    },
    {
      header: 'Contact',
      accessor: (patient: PatientType) => (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">{patient.phone || 'Not provided'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4 text-blue-500" />
            <span className="text-sm truncate max-w-[200px]">{patient.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Health Status',
      accessor: (patient: PatientType) => {
        const conditions = [];
        if (patient.has_diabetes) conditions.push('Diabetes');
        if (patient.has_hypertension) conditions.push('Hypertension');
        if (patient.has_sugar_issues) conditions.push('Sugar Issues');
        
        return conditions.length > 0 ? (
          <div className="space-y-1">
            {conditions.map((condition, index) => (
              <span key={index} className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full mr-1">
                {condition}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-600">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">Good</span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (patient: PatientType) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/patient-history/${patient.id}`)}
            className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 text-emerald-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            title="View Details"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleEdit(patient)}
            className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            title="Edit Patient"
            disabled={role === 'patient' && patient.id !== currentUserPatientId}
          >
            <Edit className="w-5 h-5" />
          </button>
          {(role === 'doctor' || role === 'admin') && (
            <button
              onClick={() => handleDelete(patient.id)}
              className="p-3 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              title="Delete Patient"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading patient records...</p>
        </div>
      </div>
    );
  }

  // For patients: If they don't have a patient record yet
  if (role === 'patient' && patients.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-4 md:p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Patient Profile Not Found
          </h3>
          <p className="text-gray-500 mb-6">
            Your patient record doesn't exist in our database yet.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Please contact the hospital administrator to create your patient profile.
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

  // Determine if search/filter should be shown
  const showSearchFilter = role === 'doctor' || role === 'admin';
  const showStats = role === 'doctor' || role === 'admin';
  const canAddPatient = role === 'doctor' || role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {role === 'patient' ? 'My Profile' : 'Patient Management'}
              </span>
            </h1>
            <p className="text-gray-600 text-lg">
              {role === 'patient' 
                ? 'View and manage your personal health information' 
                : `Manage ${patients.length} patient records and medical information`
              }
            </p>
          </div>
          <div className="flex gap-3">
            {showSearchFilter && (
              <Button 
                onClick={exportToCSV}
                variant="secondary"
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
              >
                <Download className="w-5 h-5 mr-2" />
                Export CSV
              </Button>
            )}
            {role === 'patient' && patients.length > 0 ? (
              <Button 
                onClick={() => handleEdit(patients[0])}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <Edit className="w-5 h-5 mr-2" />
                Edit My Profile
              </Button>
            ) : canAddPatient ? (
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <Plus className="w-5 h-5 mr-2" />
                Register New Patient
              </Button>
            ) : null}
          </div>
        </div>

        {/* Stats Overview (Only for doctors/admins) */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Patients</p>
                  <p className="text-2xl font-bold text-gray-900">{patientStats.total}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Outpatients</p>
                  <p className="text-2xl font-bold text-gray-900">{patientStats.outpatients}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inpatients</p>
                  <p className="text-2xl font-bold text-gray-900">{patientStats.inpatients}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                  <UserPlus className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Critical Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{patientStats.critical}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-100 to-rose-100 rounded-lg">
                  <Activity className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter Bar (Only for doctors/admins) */}
      {showSearchFilter && (
        <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-48">
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'outpatient', label: 'Outpatients' },
                    { value: 'inpatient', label: 'Inpatients' },
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
                    { value: 'healthy', label: 'Healthy' },
                    { value: 'critical', label: 'Critical' },
                  ]}
                  icon={<Activity className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patients Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        <div className="p-6 border-b border-blue-50 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {role === 'patient' ? 'My Patient Profile' : 'Patient Records'}
              </h2>
              <p className="text-sm text-gray-600">
                {patients.length} {role === 'patient' ? 'record' : 'patients'} found
              </p>
            </div>
            {role === 'patient' && patients.length > 0 && (
              <div className="text-sm text-gray-500">
                Last updated: {new Date(patients[0].updated_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-blue-50">
                    {columns.map((column, index) => (
                      <th 
                        key={index} 
                        className="text-left py-4 px-6 text-sm font-semibold text-gray-700 bg-blue-50/50"
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {patients.map((patient) => (
                    <tr 
                      key={patient.id} 
                      className="hover:bg-blue-50/30 transition-colors duration-200"
                    >
                      {columns.map((column, index) => (
                        <td key={index} className="py-4 px-6">
                          {column.accessor(patient)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : showSearchFilter ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchTerm ? 'No Patients Found' : 'No Patients Registered'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? `No patients match "${searchTerm}"` 
                  : 'Register your first patient to get started'
                }
              </p>
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add/Edit Patient Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPatient(null);
          resetForm();
        }}
        title={editingPatient ? 'Edit Patient Profile' : 'Register New Patient'}
        className="max-w-4xl"
      >
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-t-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {editingPatient 
                  ? role === 'patient' 
                    ? 'Edit My Profile' 
                    : 'Edit Patient Information'
                  : 'Patient Registration'
                }
              </h3>
              <p className="text-sm text-gray-600">Fill in the patient's details below</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-blue-500" />
                Full Name *
              </label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter patient's full name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-emerald-500" />
                Age
              </label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Age in years"
                min="0"
                max="120"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4 text-green-500" />
                Email *
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="patient@example.com"
                readOnly={editingPatient && role === 'patient'}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Phone className="w-4 h-4 text-cyan-500" />
                Phone *
              </label>
              <Input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 text-purple-500" />
                Date of Birth
              </label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4 text-pink-500" />
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {role !== 'patient' && (
              <>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    Patient Type *
                  </label>
                  <select
                    required
                    value={formData.patient_type}
                    onChange={(e) => setFormData({ ...formData, patient_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="outpatient">Outpatient</option>
                    <option value="inpatient">Inpatient</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Droplets className="w-4 h-4 text-red-500" />
                    Blood Group
                  </label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="w-4 h-4 text-blue-500" />
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              placeholder="Full residential address"
            />
          </div>

          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 border border-red-100">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
              <Activity className="w-4 h-4 text-red-500" />
              Medical Conditions
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`flex items-center p-3 rounded-lg border ${formData.has_diabetes ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                <Checkbox
                  label="Diabetes"
                  checked={formData.has_diabetes}
                  onChange={(e) => setFormData({ ...formData, has_diabetes: e.target.checked })}
                  className="mr-3"
                />
              </div>
              <div className={`flex items-center p-3 rounded-lg border ${formData.has_hypertension ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                <Checkbox
                  label="Hypertension"
                  checked={formData.has_hypertension}
                  onChange={(e) => setFormData({ ...formData, has_hypertension: e.target.checked })}
                  className="mr-3"
                />
              </div>
              <div className={`flex items-center p-3 rounded-lg border ${formData.has_sugar_issues ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                <Checkbox
                  label="Sugar Issues"
                  checked={formData.has_sugar_issues}
                  onChange={(e) => setFormData({ ...formData, has_sugar_issues: e.target.checked })}
                  className="mr-3"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Stethoscope className="w-4 h-4 text-purple-500" />
              Additional Family Medical History
            </label>
            <textarea
              value={formData.family_medical_history}
              onChange={(e) => setFormData({ ...formData, family_medical_history: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              placeholder="Any other family medical conditions or hereditary diseases..."
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <History className="w-4 h-4 text-blue-500" />
              Personal Medical History
            </label>
            <textarea
              value={formData.medical_history}
              onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
              placeholder="Past illnesses, surgeries, chronic conditions, allergies, medications..."
            />
          </div>

          <div className="flex gap-4 pt-6 border-t border-blue-100">
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {editingPatient 
                ? (role === 'patient' ? 'Update My Profile' : 'Update Patient Record')
                : 'Register Patient'
              }
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingPatient(null);
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