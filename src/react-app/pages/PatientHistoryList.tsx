// src/react-app/pages/PatientHistoryList.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, FileText, ArrowRight, Phone, Mail } from 'lucide-react';
import { useApi } from '@/react-app/hooks/useApi';

interface Patient {
  id: number;
  name: string;  // Your actual column name is "name", not "full_name"
  email: string;
  phone?: string;
  date_of_birth?: string;
  blood_group?: string;
  created_at?: string;
  age?: number;
  patient_type?: string;
}

export default function PatientHistoryList() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // FIXED: Changed 'full_name' to 'name' in the select query
  const { data: patients, loading, error } = useApi<Patient[]>(
    'patients', 
    'id, name, email, phone, date_of_birth, blood_group, age, patient_type, created_at'
  );

  // Filter patients based on search term
  const filteredPatients = patients?.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||  // Changed to patient.name
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate age from date_of_birth
  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'N/A';
    
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} years`;
    } catch (e) {
      return 'N/A';
    }
  };

  if (error) {
    console.error('Error loading patients:', error);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient History</h1>
          <p className="text-gray-600 mt-1">View and manage patient medical records</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/patients"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <User className="w-4 h-4" />
            All Patients
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center text-red-800">
            <FileText className="w-5 h-5 mr-2" />
            <div>
              <p className="font-medium">Database Error</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-xs mt-2">Make sure you've run the SQL setup from the previous steps.</p>
            </div>
          </div>
        </div>
      )}

      {/* Patients Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No patients found</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm ? 'Try a different search term' : 'No patients in the system yet'}
          </p>
          <div className="mt-4">
            <Link
              to="/patients"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
            >
              <User className="w-4 h-4" />
              Go to Patients Page
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              to={`/patient-history/${patient.id}`}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>

              {/* FIXED: Changed patient.full_name to patient.name */}
              <h3 className="font-bold text-gray-900 text-lg mb-1">{patient.name}</h3>
              <p className="text-gray-600 text-sm mb-4 flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {patient.email}
              </p>

              <div className="space-y-3">
                {patient.phone && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="w-3 h-3 mr-2 text-gray-400" />
                    <span className="font-medium">{patient.phone}</span>
                  </div>
                )}
                {(patient.date_of_birth || patient.age) && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="w-20 text-gray-400">Age:</span>
                    <span className="font-medium">
                      {patient.age || calculateAge(patient.date_of_birth)}
                    </span>
                  </div>
                )}
                {patient.blood_group && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="w-20 text-gray-400">Blood Group:</span>
                    <span className={`font-medium px-2 py-0.5 rounded ${
                      patient.blood_group.includes('O') 
                        ? 'bg-red-100 text-red-800' 
                        : patient.blood_group.includes('A')
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {patient.blood_group}
                    </span>
                  </div>
                )}
                {patient.patient_type && (
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="w-20 text-gray-400">Type:</span>
                    <span className={`font-medium px-2 py-0.5 rounded ${
                      patient.patient_type === 'inpatient'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {patient.patient_type}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {patient.created_at ? (
                    `Added: ${new Date(patient.created_at).toLocaleDateString()}`
                  ) : (
                    'No date'
                  )}
                </div>
                <span className="text-sm text-blue-600 font-medium group-hover:text-blue-700">
                  View History →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}