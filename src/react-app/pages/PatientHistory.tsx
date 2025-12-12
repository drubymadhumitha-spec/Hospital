import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Plus, Trash2, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { useApi, apiPost, apiDelete } from '@/react-app/hooks/useApi';
import { PatientHistoryWithDetails, Patient } from '@/shared/types';
import Modal from '@/react-app/components/Modal';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import Table from '@/react-app/components/Table';

export default function PatientHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { data: patient } = useApi<Patient>(`/api/patients/${patientId}`);
  const { data: history, loading, refetch } = useApi<PatientHistoryWithDetails[]>(
    `/api/patient-history/patient/${patientId}`
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    visit_date: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost('/api/patient-history', {
        patient_id: parseInt(patientId!),
        visit_date: formData.visit_date,
        symptoms: formData.symptoms,
        diagnosis: formData.diagnosis,
        treatment: formData.treatment,
        notes: formData.notes,
      });
      
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error creating history record:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      visit_date: '',
      symptoms: '',
      diagnosis: '',
      treatment: '',
      notes: '',
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this history record?')) {
      try {
        await apiDelete(`/api/patient-history/${id}`);
        refetch();
      } catch (error) {
        console.error('Error deleting history record:', error);
      }
    }
  };

  const columns = [
    {
      header: 'Visit Date',
      accessor: (record: PatientHistoryWithDetails) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">
              {new Date(record.visit_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(record.visit_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Symptoms',
      accessor: (record: PatientHistoryWithDetails) => (
        <div className="max-w-xs text-sm text-gray-700">
          {record.symptoms || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Diagnosis',
      accessor: (record: PatientHistoryWithDetails) => (
        <div className="max-w-xs text-sm">
          {record.diagnosis ? (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {record.diagnosis}
            </span>
          ) : (
            'N/A'
          )}
        </div>
      ),
    },
    {
      header: 'Treatment',
      accessor: (record: PatientHistoryWithDetails) => (
        <div className="max-w-xs text-sm text-gray-700">
          {record.treatment || 'N/A'}
        </div>
      ),
    },
    {
      header: 'Notes',
      accessor: (record: PatientHistoryWithDetails) => (
        <div className="max-w-md text-sm text-gray-500">
          {record.notes || 'No additional notes'}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (record: PatientHistoryWithDetails) => (
        <button
          onClick={() => handleDelete(record.id)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/patients')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            Patient History: {patient?.name}
          </h1>
          <p className="text-gray-600 mt-1">Complete medical visit history and records</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Visit Record
        </Button>
      </div>

      {patient && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Patient Type</div>
              <div className="font-semibold text-gray-900 mt-1">
                {patient.patient_type === 'inpatient' ? 'Inpatient' : 'Outpatient'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Blood Group</div>
              <div className="font-semibold text-gray-900 mt-1">{patient.blood_group || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Age</div>
              <div className="font-semibold text-gray-900 mt-1">{patient.age || 'N/A'} years</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Contact</div>
              <div className="font-semibold text-gray-900 mt-1">{patient.phone}</div>
            </div>
          </div>
          {patient.medical_history && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-sm text-gray-600 mb-1">Medical History</div>
              <div className="text-gray-700">{patient.medical_history}</div>
            </div>
          )}
          {(patient.has_diabetes || patient.has_hypertension || patient.has_sugar_issues) && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="text-sm text-gray-600 mb-2">Family Medical Conditions</div>
              <div className="flex gap-2 flex-wrap">
                {patient.has_diabetes === 1 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                    Diabetes
                  </span>
                )}
                {patient.has_hypertension === 1 && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Hypertension
                  </span>
                )}
                {patient.has_sugar_issues === 1 && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    Sugar Issues
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {history && history.length > 0 ? (
        <Table data={history} columns={columns} />
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No visit history records yet</p>
          <p className="text-sm text-gray-500 mt-1">Add a new visit record to get started</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Add Visit Record"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Visit Date & Time"
            type="datetime-local"
            required
            value={formData.visit_date}
            onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Symptoms <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder="Describe the symptoms observed during this visit"
            />
          </div>

          <Input
            label="Diagnosis"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            placeholder="Medical diagnosis"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Treatment Provided
            </label>
            <textarea
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
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
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              placeholder="Any other relevant information"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              <Plus className="w-4 h-4" />
              Add Record
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
