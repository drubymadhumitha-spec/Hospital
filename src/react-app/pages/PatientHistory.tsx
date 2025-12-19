// src/react-app/pages/PatientHistory.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, ArrowLeft, Calendar, FileText,
  User, Phone, Mail, Activity, Pill, Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  blood_group: string;
  medical_history: string;
  age: number;
  patient_type: string;
  has_diabetes: boolean;
  has_hypertension: boolean;
  has_sugar_issues: boolean;
  created_at: string;
}

interface HistoryRecord {
  id: number;
  patient_id: number;
  visit_date: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  created_at: string;
  doctor_id: number;
  hospital_staff?: {
    full_name: string;
  };
}

export default function PatientHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    visit_date: new Date().toISOString().slice(0, 16),
    symptoms: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    doctor_id: 16, // Default doctor ID
  });

  

  // Fetch patient data
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) return;

      setLoading(true);
      try {
        // Fetch patient details
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', parseInt(patientId))
          .single();

        if (patientError) throw patientError;
        setPatient(patientData);

        // Fetch patient history
        const { data: historyData, error: historyError } = await supabase
          .from('patient_history')
          .select('*, hospital_staff(full_name)')
          .eq('patient_id', parseInt(patientId))
          .order('visit_date', { ascending: false });

        if (historyError) throw historyError;
        setHistory(historyData || []);

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) return;

    try {
      const { error } = await supabase
        .from('patient_history')
        .insert({
          patient_id: parseInt(patientId),
          visit_date: formData.visit_date,
          symptoms: formData.symptoms,
          diagnosis: formData.diagnosis,
          treatment: formData.treatment,
          notes: formData.notes,
          doctor_id: formData.doctor_id,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Refresh history
      const { data: updatedHistory } = await supabase
        .from('patient_history')
        .select('*, hospital_staff(full_name)')
        .eq('patient_id', parseInt(patientId))
        .order('visit_date', { ascending: false });

      setHistory(updatedHistory || []);
      setIsModalOpen(false);
      setFormData({
        visit_date: new Date().toISOString().slice(0, 16),
        symptoms: '',
        diagnosis: '',
        treatment: '',
        notes: '',
        doctor_id: 16,
      });

    } catch (err: any) {
      console.error('Error adding history:', err);
      setError(err.message || 'Failed to add history record');
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this history record?')) return;

    try {
      const { error } = await supabase
        .from('patient_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setHistory(prev => prev.filter(record => record.id !== id));

    } catch (err: any) {
      console.error('Error deleting record:', err);
      setError(err.message || 'Failed to delete record');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      visit_date: new Date().toISOString().slice(0, 16),
      symptoms: '',
      diagnosis: '',
      treatment: '',
      notes: '',
      doctor_id: 16,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patient history...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center text-red-800">
            <FileText className="w-5 h-5 mr-2" />
            <div>
              <p className="font-medium">Error Loading Patient Data</p>
              <p className="text-sm mt-1">{error || 'Patient not found'}</p>
              <button
                onClick={() => navigate('/patient-history')}
                className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                ← Back to Patients
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/patient-history')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            Patient History: {patient.name}
          </h1>
          <p className="text-gray-600 mt-1">Complete medical visit history and records</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Visit Record
        </button>
      </div>

      {/* Patient Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-600">Patient Information</div>
            <div className="font-semibold text-gray-900 mt-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              {patient.name}
            </div>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {patient.email}
            </div>
            <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {patient.phone}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Medical Details</div>
            <div className="font-semibold text-gray-900 mt-2">
              {patient.patient_type === 'inpatient' ? 'Inpatient' : 'Outpatient'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Blood Group: {patient.blood_group || 'N/A'}</div>
            <div className="text-sm text-gray-600 mt-1">
              Age: {patient.age || calculateAge(patient.date_of_birth)} years
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Medical History</div>
            <div className="text-gray-700 mt-2 text-sm">
              {patient.medical_history || 'No medical history recorded'}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Family Conditions</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {patient.has_diabetes && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                  Diabetes
                </span>
              )}
              {patient.has_hypertension && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                  Hypertension
                </span>
              )}
              {patient.has_sugar_issues && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  Sugar Issues
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Records */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Visit History</h2>
          <p className="text-sm text-gray-600 mt-1">
            {history.length} record{history.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No visit history records yet</p>
            <p className="text-sm text-gray-500 mt-1">Add a new visit record to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {history.map((record) => (
              <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(record.visit_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.hospital_staff?.full_name ? `By Dr. ${record.hospital_staff.full_name}` : 'Doctor not specified'}
                        </div>
                      </div>
                    </div>

                    {record.symptoms && (
                      <div className="flex items-start gap-2">
                        <Activity className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-600">Symptoms:</div>
                          <div className="text-gray-900">{record.symptoms}</div>
                        </div>
                      </div>
                    )}

                    {record.diagnosis && (
                      <div className="flex items-start gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-600">Diagnosis:</div>
                          <div className="text-gray-900">{record.diagnosis}</div>
                        </div>
                      </div>
                    )}

                    {record.treatment && (
                      <div className="flex items-start gap-2">
                        <Pill className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-600">Treatment:</div>
                          <div className="text-gray-900">{record.treatment}</div>
                        </div>
                      </div>
                    )}

                    {record.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm text-gray-600">Notes:</div>
                        <div className="text-gray-700 text-sm">{record.notes}</div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Add Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full h-[calc(75vh-176px)] overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Fixed Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Add Visit Record</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Scrollable Content Area - This will scroll independently */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visit Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.visit_date}
                      onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Symptoms <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                      placeholder="Describe the symptoms observed during this visit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Diagnosis
                    </label>
                    <input
                      type="text"
                      value={formData.diagnosis}
                      onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Medical diagnosis"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Treatment Provided
                    </label>
                    <textarea
                      value={formData.treatment}
                      onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                      placeholder="Medications, procedures, or treatments given"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                      placeholder="Any other relevant information"
                    />
                  </div>

                  {/* Add some extra content to ensure scrolling works */}
                  <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                    <p>All fields marked with <span className="text-red-500">*</span> are required.</p>
                    <p className="mt-1">Visit records will be permanently stored in the patient's medical history.</p>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="p-6 border-t border-gray-200 flex-shrink-0">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Record
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}