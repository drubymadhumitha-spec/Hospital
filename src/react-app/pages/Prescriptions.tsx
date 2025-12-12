import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Pill, User, Stethoscope, Calendar, Clock, 
  FileText, AlertCircle, Activity, TrendingUp, ClipboardCheck, 
  ClipboardList, ShieldCheck, Search, Eye, Download, Printer
} from 'lucide-react';
import { useApi, apiPost, apiDelete } from '@/react-app/hooks/useApi';
import { PrescriptionWithDetails, Doctor, Patient, Medicine } from '@/shared/types';
import Modal from '@/react-app/components/Modal';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { useAuth } from '@/react-app/App'; // Import useAuth hook
import { supabase } from '../lib/supabase'; // Import supabase client

export default function Prescriptions() {
  const { user, role } = useAuth(); // Get user role
  
  // Fetch data
  const { data: allPrescriptions, loading, refetch } = useApi<PrescriptionWithDetails[]>('prescription_details');
  const { data: doctors } = useApi<Doctor[]>('doctors');
  const { data: patients } = useApi<Patient[]>('patients');
  const { data: medicines } = useApi<Medicine[]>('medicines');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    medicine_id: '',
    dosage: '',
    frequency: '',
    duration_days: '',
    instructions: '',
  });

  // Fetch current patient's ID if role is patient
  useEffect(() => {
    const fetchCurrentPatientId = async () => {
      if (role === 'patient' && user?.email) {
        try {
          const { data: patientData, error } = await supabase
            .from('patients')
            .select('id, name')
            .eq('email', user.email)
            .single();
          
          if (patientData && !error) {
            setCurrentPatientId(patientData.id);
            // Auto-fill patient_id in form if patient wants to request prescription
            setFormData(prev => ({ ...prev, patient_id: patientData.id.toString() }));
          }
        } catch (error) {
          console.error('Error fetching patient ID:', error);
        }
      }
    };
    
    fetchCurrentPatientId();
  }, [role, user?.email]);

  // Filter prescriptions based on role
  const filteredPrescriptions = allPrescriptions?.filter(prescription => {
    // If patient, show only their prescriptions
    if (role === 'patient' && currentPatientId) {
      if (prescription.patient_id !== currentPatientId) return false;
    }
    
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      prescription.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.medicine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.dosage?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter
    if (statusFilter !== '') {
      const prescribedDate = new Date(prescription.prescribed_date);
      const endDate = new Date(prescribedDate);
      endDate.setDate(prescribedDate.getDate() + (prescription.duration_days || 0));
      
      if (statusFilter === 'active') return endDate > new Date();
      if (statusFilter === 'completed') return endDate <= new Date();
    }
    
    return true;
  }) || [];

  // For patients: get patient data
  const currentPatient = role === 'patient' ? 
    patients?.find(p => p.id === currentPatientId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Patients cannot create prescriptions, only doctors/admins can
      if (role === 'patient') {
        alert('Patients cannot create prescriptions. Please contact your doctor.');
        return;
      }
      
      const data = {
        patient_id: parseInt(formData.patient_id),
        doctor_id: parseInt(formData.doctor_id),
        medicine_id: parseInt(formData.medicine_id),
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration_days: parseInt(formData.duration_days),
        instructions: formData.instructions || null,
      };

      await apiPost('prescriptions', data);
      
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('Failed to create prescription. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: role === 'patient' && currentPatientId ? currentPatientId.toString() : '',
      doctor_id: '',
      medicine_id: '',
      dosage: '',
      frequency: '',
      duration_days: '',
      instructions: '',
    });
  };

  const handleDelete = async (id: number) => {
    // Only doctors and admins can delete prescriptions
    if (role === 'patient') {
      alert('Patients cannot delete prescriptions.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this prescription?')) {
      try {
        await apiDelete('prescriptions', id);
        refetch();
      } catch (error) {
        console.error('Error deleting prescription:', error);
        alert('Failed to delete prescription. Please try again.');
      }
    }
  };

  // Calculate prescription statistics based on role
  const calculateStats = () => {
    // For patients: only calculate based on their prescriptions
    const prescriptionsToUse = role === 'patient' && currentPatientId ? 
      allPrescriptions?.filter(p => p.patient_id === currentPatientId) || [] 
      : allPrescriptions || [];
    
    return {
      total: prescriptionsToUse.length,
      active: prescriptionsToUse.filter(p => {
        const prescribedDate = new Date(p.prescribed_date);
        const endDate = new Date(prescribedDate);
        endDate.setDate(prescribedDate.getDate() + (p.duration_days || 0));
        return endDate > new Date();
      }).length || 0,
      completed: prescriptionsToUse.filter(p => {
        const prescribedDate = new Date(p.prescribed_date);
        const endDate = new Date(prescribedDate);
        endDate.setDate(prescribedDate.getDate() + (p.duration_days || 0));
        return endDate <= new Date();
      }).length || 0,
      today: prescriptionsToUse.filter(p => {
        const prescribedDate = new Date(p.prescribed_date);
        const today = new Date();
        return prescribedDate.toDateString() === today.toDateString();
      }).length || 0,
    };
  };

  const prescriptionStats = calculateStats();

  const getDurationColor = (days: number) => {
    if (days <= 3) return 'from-red-500 to-pink-500';
    if (days <= 7) return 'from-orange-500 to-amber-500';
    if (days <= 14) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  // Download prescription as PDF
  const downloadPrescription = (prescription: PrescriptionWithDetails) => {
    const content = `
      =======================================
      MEDICAL PRESCRIPTION
      =======================================
      
      Patient: ${prescription.patient_name}
      Patient ID: #${prescription.patient_id}
      Doctor: ${prescription.doctor_name}
      Specialty: ${prescription.doctor_specialty}
      
      =======================================
      PRESCRIPTION DETAILS
      =======================================
      
      Medicine: ${prescription.medicine_name}
      Dosage: ${prescription.dosage}
      Frequency: ${prescription.frequency}
      Duration: ${prescription.duration_days} days
      
      Prescribed Date: ${new Date(prescription.prescribed_date).toLocaleDateString()}
      Prescribed Time: ${new Date(prescription.prescribed_date).toLocaleTimeString()}
      
      =======================================
      INSTRUCTIONS
      =======================================
      
      ${prescription.instructions || 'No special instructions'}
      
      =======================================
      IMPORTANT NOTES
      =======================================
      
      • Take medication as directed by doctor
      • Do not share medication with others
      • Store medication properly
      • Report any side effects immediately
      • Complete the full course of treatment
      
      =======================================
      Generated on: ${new Date().toLocaleString()}
      =======================================
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription_${prescription.patient_name}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  // Print prescription
  const printPrescription = (prescription: PrescriptionWithDetails) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Prescription - ${prescription.patient_name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .section-title { font-weight: bold; background-color: #f0f0f0; padding: 5px; margin-bottom: 10px; }
              .info { margin-bottom: 5px; }
              .medication { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>MEDICAL PRESCRIPTION</h1>
              <p>MediCare Plus Hospital</p>
            </div>
            
            <div class="section">
              <div class="section-title">PATIENT INFORMATION</div>
              <div class="info"><strong>Name:</strong> ${prescription.patient_name}</div>
              <div class="info"><strong>Patient ID:</strong> #${prescription.patient_id}</div>
              <div class="info"><strong>Date:</strong> ${new Date(prescription.prescribed_date).toLocaleDateString()}</div>
            </div>
            
            <div class="section">
              <div class="section-title">PRESCRIBING DOCTOR</div>
              <div class="info"><strong>Doctor:</strong> ${prescription.doctor_name}</div>
              <div class="info"><strong>Specialty:</strong> ${prescription.doctor_specialty}</div>
            </div>
            
            <div class="section">
              <div class="section-title">MEDICATION</div>
              <div class="medication">
                <div class="info"><strong>Medicine:</strong> ${prescription.medicine_name}</div>
                <div class="info"><strong>Dosage:</strong> ${prescription.dosage}</div>
                <div class="info"><strong>Frequency:</strong> ${prescription.frequency}</div>
                <div class="info"><strong>Duration:</strong> ${prescription.duration_days} days</div>
              </div>
            </div>
            
            <div class="section">
              <div class="section-title">SPECIAL INSTRUCTIONS</div>
              <div class="info">${prescription.instructions || 'No special instructions'}</div>
            </div>
            
            <div class="section">
              <div class="section-title">DOCTOR'S SIGNATURE</div>
              <div class="info" style="margin-top: 50px;">
                _________________________<br>
                Dr. ${prescription.doctor_name}<br>
                ${new Date().toLocaleDateString()}
              </div>
            </div>
            
            <div class="no-print" style="margin-top: 50px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Print Prescription
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; background-color: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                Close
              </button>
            </div>
            
            <script>
              window.onload = function() {
                setTimeout(() => window.print(), 1000);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading prescriptions...</p>
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
            <ClipboardCheck className="w-12 h-12 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Patient Profile Not Found
          </h3>
          <p className="text-gray-500 mb-6">
            You need to have a patient profile to view prescriptions.
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
                {role === 'patient' ? 'My Prescriptions' : 'Prescription Management'}
              </span>
            </h1>
            <p className="text-gray-600 text-lg">
              {role === 'patient' 
                ? 'View your medication prescriptions' 
                : 'Create and manage patient medication prescriptions'
              }
            </p>
          </div>
          
          {/* Show create button only for doctors/admins */}
          {(role === 'doctor' || role === 'admin') && (
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <ClipboardCheck className="w-5 h-5 mr-2" />
              Create New Prescription
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Prescriptions</p>
                <p className="text-2xl font-bold text-gray-900">{prescriptionStats.total}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{prescriptionStats.active}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{prescriptionStats.completed}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-gray-100 to-slate-100 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Today's</p>
                <p className="text-2xl font-bold text-gray-900">{prescriptionStats.today}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
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
                {role === 'patient' ? 'My Prescription History' : 'All Prescriptions'}
              </h2>
              <p className="text-sm text-gray-600">
                {role === 'patient' 
                  ? 'View all your medication prescriptions' 
                  : 'View and manage all patient medication records'
                }
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder={role === 'patient' ? "Search my prescriptions..." : "Search prescriptions..."}
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
                <option value="active">Active Only</option>
                <option value="completed">Completed Only</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {filteredPrescriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-50">
                    {role !== 'patient' && (
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Patient</th>
                    )}
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Doctor</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Medicine</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Dosage & Frequency</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Duration</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Prescribed Date</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Instructions</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {filteredPrescriptions.map((prescription) => (
                    <tr key={prescription.id} className="hover:bg-blue-50/50 transition-colors">
                      {role !== 'patient' && (
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg">{prescription.patient_name}</div>
                              <div className="text-sm text-gray-600">Patient ID: #{prescription.patient_id}</div>
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
                            <div className="font-bold text-gray-900">{prescription.doctor_name}</div>
                            <div className="text-sm text-gray-600">{prescription.doctor_specialty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                              <Pill className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{prescription.medicine_name}</div>
                            <div className="text-sm text-gray-600">
                              {role === 'patient' ? 'Medicine prescribed' : `Med ID: #${prescription.medicine_id}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-red-500" />
                            <div className="font-bold text-gray-900">{prescription.dosage}</div>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <div className="text-sm">{prescription.frequency}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getDurationColor(prescription.duration_days || 0)} text-white font-medium shadow-sm flex items-center gap-2`}>
                            <Calendar className="w-4 h-4" />
                            {prescription.duration_days} days
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-500" />
                            <div className="font-bold text-gray-900">
                              {new Date(prescription.prescribed_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-3 h-3" />
                            <div className="text-xs">
                              {new Date(prescription.prescribed_date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {prescription.instructions ? (
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-gray-700 line-clamp-2">{prescription.instructions}</div>
                          </div>
                        ) : (
                          <div className="text-gray-400 italic text-sm">No special instructions</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          {/* View/Download buttons for patients */}
                          {role === 'patient' && (
                            <>
                              <button
                                onClick={() => downloadPrescription(prescription)}
                                className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                title="Download prescription"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => printPrescription(prescription)}
                                className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                title="Print prescription"
                              >
                                <Printer className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          
                          {/* Delete button - only for doctors/admins */}
                          {(role === 'doctor' || role === 'admin') && (
                            <button
                              onClick={() => handleDelete(prescription.id)}
                              className="p-3 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                              title="Delete prescription"
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
                <ClipboardCheck className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery || statusFilter ? 'No matching prescriptions found' : 'No Prescriptions Found'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter 
                  ? 'Try a different search or filter' 
                  : role === 'patient' 
                    ? "You don't have any prescriptions yet" 
                    : 'Create your first prescription to get started'
                }
              </p>
              {(role === 'doctor' || role === 'admin') && (
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Create Prescription
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal - Only shown for doctors/admins */}
      {(role === 'doctor' || role === 'admin') && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title="Create New Prescription"
          className="max-w-2xl"
        >
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-t-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Prescription Details</h3>
                <p className="text-sm text-gray-600">Fill in all the necessary prescription information</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Pill className="w-4 h-4 text-green-500" />
                  Select Medicine *
                </label>
                <select
                  required
                  value={formData.medicine_id}
                  onChange={(e) => setFormData({ ...formData, medicine_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                >
                  <option value="">Select Medicine</option>
                  {medicines?.map(medicine => (
                    <option key={medicine.id} value={medicine.id}>
                      {medicine.name} {medicine.manufacturer ? `(${medicine.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Activity className="w-4 h-4 text-red-500" />
                  Dosage *
                </label>
                <Input
                  required
                  placeholder="e.g., 500mg, 2 tablets, 1 spoon"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Frequency *
                </label>
                <select
                  required
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                >
                  <option value="">Select Frequency</option>
                  <option value="Once daily">Once daily</option>
                  <option value="Twice daily">Twice daily</option>
                  <option value="Three times daily">Three times daily</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Every 8 hours">Every 8 hours</option>
                  <option value="Every 12 hours">Every 12 hours</option>
                  <option value="As needed">As needed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Duration (days) *
                </label>
                <Input
                  type="number"
                  required
                  min="1"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  className="bg-white border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Number of days"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="w-4 h-4 text-purple-500" />
                Special Instructions
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                placeholder="e.g., Take after meals, Avoid alcohol, Take with plenty of water, Do not drive after taking..."
              />
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Important Notes</h4>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    <li>• Verify patient allergies before prescribing</li>
                    <li>• Check for drug interactions</li>
                    <li>• Ensure proper dosage for patient age/weight</li>
                    <li>• Provide clear instructions for optimal results</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-blue-100">
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <ClipboardCheck className="w-5 h-5 mr-2" />
                Create Prescription
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
      )}
    </div>
  );
}