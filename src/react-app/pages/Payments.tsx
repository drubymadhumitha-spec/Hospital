import { useState, useEffect } from 'react';
import { Plus, Trash2, IndianRupee, CheckCircle, TrendingUp, Clock, CreditCard, Calendar, Loader2, Download, Eye, Receipt } from 'lucide-react';
import Modal from '@/react-app/components/Modal';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import Select from '@/react-app/components/Select';
import { useAuth } from '@/react-app/App';
import { supabase } from '../lib/supabase'; // Use singleton

// Types
interface Payment {
  id: number;
  patient_id: number;
  appointment_id?: number;
  amount: number;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  description?: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

interface PaymentWithDetails extends Payment {
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date?: string;
  appointment_reason?: string;
}

interface Patient {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface Appointment {
  id: number;
  patient_id: number;
  appointment_date: string;
  reason: string;
  status: string;
}

export default function Payments() {
  const { user, role } = useAuth();
  
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_id: '',
    amount: '',
    payment_method: '',
    payment_status: 'pending',
    description: '',
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
            .maybeSingle(); // Use maybeSingle instead of single
          
          if (error) {
            console.error('Patient fetch error:', error);
            return;
          }
          
          if (patientData) {
            setCurrentPatientId(patientData.id);
            setFormData(prev => ({ ...prev, patient_id: patientData.id.toString() }));
          }
        } catch (error) {
          console.error('Error fetching patient ID:', error);
        }
      }
    };
    
    fetchCurrentPatientId();
  }, [role, user?.email]);

  // Fetch payments based on role
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let query = supabase
        .from('payment_details')
        .select('*');

      // If patient, only fetch their payments
      if (role === 'patient' && currentPatientId) {
        query = query.eq('patient_id', currentPatientId);
      }

      // Always add ordering
      query = query.order('payment_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Payments fetch error:', error);
        setError(error.message);
        setPayments([]);
        return;
      }

      setPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      setError(error.message);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch patients (only for doctors/admins)
  const fetchPatients = async () => {
    try {
      if (role === 'patient') return;
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, email, phone')
        .order('name');

      if (error) {
        console.error('Patients fetch error:', error);
        return;
      }
      
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Fetch appointments based on role
  const fetchAppointments = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select('*');

      // If patient, only fetch their appointments
      if (role === 'patient' && currentPatientId) {
        query = query.eq('patient_id', currentPatientId);
      }

      query = query.order('appointment_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Appointments fetch error:', error);
        return;
      }

      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  // Initialize data
  useEffect(() => {
    const initData = async () => {
      await Promise.all([
        fetchPayments(),
        fetchPatients(),
        fetchAppointments()
      ]);
    };
    
    if (role === 'patient' && !currentPatientId) {
      // Wait for patient ID to be fetched
      return;
    }
    
    initData();
  }, [role, currentPatientId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Patients cannot create payments
      if (role === 'patient') {
        alert('Patients cannot create payment records. Please contact the billing department.');
        return;
      }
      
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          patient_id: parseInt(formData.patient_id),
          appointment_id: formData.appointment_id ? parseInt(formData.appointment_id) : null,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          payment_status: formData.payment_status,
          description: formData.description || null,
        }])
        .select();

      if (error) throw error;

      setIsModalOpen(false);
      resetForm();
      fetchPayments(); // Refresh the payments list
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(`Failed to create payment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      patient_id: role === 'patient' && currentPatientId ? currentPatientId.toString() : '',
      appointment_id: '',
      amount: '',
      payment_method: '',
      payment_status: 'pending',
      description: '',
    });
  };

  // Update payment status (only for doctors/admins)
  const handleStatusUpdate = async (id: number, payment_status: string) => {
    if (role === 'patient') {
      alert('Patients cannot update payment status.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('payments')
        .update({ payment_status })
        .eq('id', id);

      if (error) throw error;

      fetchPayments(); // Refresh payments
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      alert(`Failed to update payment status: ${error.message}`);
    }
  };

  // Delete payment (only for doctors/admins)
  const handleDelete = async (id: number) => {
    if (role === 'patient') {
      alert('Patients cannot delete payment records.');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this payment record?')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchPayments(); // Refresh payments
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      alert(`Failed to delete payment: ${error.message}`);
    }
  };

  // Generate receipt
  const generateReceipt = (payment: PaymentWithDetails) => {
    const receiptContent = `
      =========================================
      MEDICARE PLUS HOSPITAL - PAYMENT RECEIPT
      =========================================
      
      Receipt No: #${payment.id}
      Date: ${new Date(payment.payment_date).toLocaleDateString()}
      Time: ${new Date(payment.payment_date).toLocaleTimeString()}
      
      -----------------------------------------
      PATIENT INFORMATION
      -----------------------------------------
      Name: ${payment.patient_name || 'N/A'}
      Patient ID: #${payment.patient_id}
      Email: ${payment.patient_email || 'N/A'}
      Phone: ${payment.patient_phone || 'N/A'}
      
      -----------------------------------------
      PAYMENT DETAILS
      -----------------------------------------
      Amount: ₹${payment.amount.toFixed(2)}
      Payment Method: ${payment.payment_method}
      Status: ${payment.payment_status.toUpperCase()}
      
      ${payment.description ? `Description: ${payment.description}` : ''}
      
      ${payment.appointment_date ? `
      -----------------------------------------
      RELATED APPOINTMENT
      -----------------------------------------
      Appointment Date: ${new Date(payment.appointment_date).toLocaleDateString()}
      Reason: ${payment.appointment_reason || 'Not specified'}
      ` : ''}
      
      -----------------------------------------
      IMPORTANT NOTES
      -----------------------------------------
      1. This is an official receipt for payment made.
      2. Please keep this receipt for future reference.
      3. For any queries, contact billing department.
      4. Receipt generated on: ${new Date().toLocaleString()}
      
      =========================================
      Thank you for choosing Medicare Plus!
      =========================================
    `;
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${payment.patient_name || 'patient'}_${payment.id}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  // View payment details
  const viewPaymentDetails = (payment: PaymentWithDetails) => {
    const details = `
      Payment Details:
      
      ID: #${payment.id}
      Patient: ${payment.patient_name || 'N/A'}
      Amount: ₹${payment.amount.toFixed(2)}
      Method: ${payment.payment_method}
      Status: ${payment.payment_status}
      Date: ${new Date(payment.payment_date).toLocaleString()}
      
      Description: ${payment.description || 'No description provided'}
      
      ${payment.appointment_date ? `
      Related Appointment:
      - Date: ${new Date(payment.appointment_date).toLocaleDateString()}
      - Reason: ${payment.appointment_reason || 'Not specified'}
      ` : ''}
      
      Generated on: ${new Date().toLocaleString()}
    `;
    alert(details);
  };

  // Status badge component
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg',
      completed: 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg',
      failed: 'bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-lg',
      refunded: 'bg-gradient-to-r from-indigo-400 to-purple-500 text-white shadow-lg',
    };
    return (
      <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${styles[status as keyof typeof styles] || 'bg-gradient-to-r from-gray-400 to-slate-500 text-white'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Method icon component
  const getMethodIcon = (method: string) => {
    const icons: Record<string, JSX.Element> = {
      'Credit Card': <CreditCard className="w-4 h-4" />,
      'Debit Card': <CreditCard className="w-4 h-4" />,
      'Cash': <IndianRupee className="w-4 h-4" />,
      'Insurance': <CheckCircle className="w-4 h-4" />,
      'Bank Transfer': <TrendingUp className="w-4 h-4" />,
      'Online Payment': <CheckCircle className="w-4 h-4" />,
      'UPI': <TrendingUp className="w-4 h-4" />,
      'Cheque': <IndianRupee className="w-4 h-4" />,
    };
    return icons[method] || <IndianRupee className="w-4 h-4" />;
  };

  // Calculate statistics based on role - FIXED VERSION
  const calculateStats = () => {
    // Ensure payments is always an array
    const paymentsToUse = Array.isArray(payments) ? payments : [];
    
    const totalRevenue = paymentsToUse.reduce((sum, p) => 
      p.payment_status === 'completed' ? sum + p.amount : sum, 0
    );

    const pendingAmount = paymentsToUse.reduce((sum, p) => 
      p.payment_status === 'pending' ? sum + p.amount : sum, 0
    );

    const completedPayments = paymentsToUse.filter(p => p.payment_status === 'completed').length;
    const averagePayment = completedPayments > 0 ? totalRevenue / completedPayments : 0;

    return {
      totalRevenue,
      pendingAmount,
      completedPayments,
      averagePayment,
      totalTransactions: paymentsToUse.length
    };
  };

  const stats = calculateStats();

  // For patients who don't have a patient record yet
  if (role === 'patient' && !currentPatientId && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <IndianRupee className="w-12 h-12 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Patient Profile Not Found
          </h3>
          <p className="text-gray-500 mb-6">
            You need to have a patient profile to view payment history.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Please contact the hospital administrator or create your patient profile first.
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-gray-600">
              <strong>Your Login Email:</strong> {user?.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-semibold text-gray-700">
            {role === 'patient' ? 'Loading your payments...' : 'Loading payments...'}
          </p>
          <p className="text-gray-500">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-r from-emerald-300 to-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center bg-gradient-to-r from-white to-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/50">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {role === 'patient' ? 'My Payments' : 'Payment Dashboard'}
            </h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-500" />
              {role === 'patient' 
                ? 'View your payment history and receipts' 
                : 'Track and manage all patient payments in one place'
              }
            </p>
          </div>
          
          {/* Show add button only for doctors/admins */}
          {(role === 'doctor' || role === 'admin') && (
            <Button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg transform hover:scale-105 transition-all"
              disabled={submitting}
            >
              <Plus className="w-5 h-5" />
              Add New Payment
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 rounded-xl">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">!</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">
                  {role === 'patient' ? 'Total Paid' : 'Total Revenue'}
                </p>
                <p className="text-3xl font-bold mt-2">
                  ₹{stats.totalRevenue.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{role === 'patient' ? 'Your total payments' : 'All completed payments'}</span>
                </div>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <IndianRupee className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Pending Amount</p>
                <p className="text-3xl font-bold mt-2">
                  ₹{stats.pendingAmount.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{role === 'patient' ? 'Your pending payments' : 'Awaiting clearance'}</span>
                </div>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Total Transactions</p>
                <p className="text-3xl font-bold mt-2">
                  {stats.totalTransactions}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>{role === 'patient' ? 'Your payment records' : 'All payment records'}</span>
                </div>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-xl transform hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Average Payment</p>
                <p className="text-3xl font-bold mt-2">
                  ₹{stats.averagePayment.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{role === 'patient' ? 'Per transaction' : 'Per completed transaction'}</span>
                </div>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6">
            <h2 className="text-2xl font-bold text-white">
              {role === 'patient' ? 'My Payment History' : 'Recent Transactions'}
            </h2>
            <p className="text-blue-100 mt-1">
              {role === 'patient' 
                ? 'All your payment records with detailed information' 
                : 'All payment records with detailed information'
              }
            </p>
          </div>
          <div className="p-6">
            {payments && payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-blue-50">
                      {role !== 'patient' && (
                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Patient</th>
                      )}
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Payment Method</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Description</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-blue-50/50 transition-colors">
                        {role !== 'patient' && (
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                {payment.patient_name?.charAt(0).toUpperCase() || 'P'}
                              </div>
                              <div>
                                <div className="font-bold text-gray-800">{payment.patient_name || 'Unknown'}</div>
                                <div className="text-xs text-gray-500">Patient ID: #{payment.patient_id}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="py-4 px-6">
                          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-xl border border-emerald-100">
                            <div className="font-bold text-2xl text-green-700">
                              ₹{payment.amount.toFixed(2)}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                            {getMethodIcon(payment.payment_method)}
                            <span className="font-semibold text-blue-700">
                              {payment.payment_method || 'Not specified'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {getStatusBadge(payment.payment_status)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-100">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <div>
                              <div className="font-semibold text-gray-800">
                                {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(payment.payment_date).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="max-w-xs p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                            <div className="text-sm font-medium text-gray-800">
                              {payment.description || 'No description provided'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            {/* Patient actions: view and download */}
                            {role === 'patient' && (
                              <>
                                <button
                                  onClick={() => viewPaymentDetails(payment)}
                                  className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 text-blue-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                  title="View details"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => generateReceipt(payment)}
                                  className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-green-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                  title="Download receipt"
                                >
                                  <Download className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            
                            {/* Doctor/Admin actions: status update and delete */}
                            {(role === 'doctor' || role === 'admin') && (
                              <>
                                {payment.payment_status === 'pending' && (
                                  <button
                                    onClick={() => handleStatusUpdate(payment.id, 'completed')}
                                    className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 rounded-xl shadow-lg transition-all transform hover:scale-105"
                                    title="Mark as completed"
                                    disabled={submitting}
                                  >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(payment.id)}
                                  className="p-3 bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600 rounded-xl shadow-lg transition-all transform hover:scale-105"
                                  disabled={submitting}
                                >
                                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                </button>
                              </>
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
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <IndianRupee className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No Payments Found
                </h3>
                <p className="text-gray-500 mb-6">
                  {role === 'patient' 
                    ? "You don't have any payment records yet" 
                    : 'No payment records available'
                  }
                </p>
                {(role === 'doctor' || role === 'admin') && (
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Payment Modal - Only for doctors/admins */}
      {(role === 'doctor' || role === 'admin') && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Add New Payment
                </h2>
                <p className="text-gray-600 text-sm">Create a new payment record</p>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Patient"
                required
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Patient' },
                  ...(patients?.map(p => ({ value: p.id.toString(), label: p.name })) || []),
                ]}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
                disabled={submitting}
              />

              <Select
                label="Related Appointment (Optional)"
                value={formData.appointment_id}
                onChange={(e) => setFormData({ ...formData, appointment_id: e.target.value })}
                options={[
                  { value: '', label: 'No specific appointment' },
                  ...(appointments?.map(a => ({ 
                    value: a.id.toString(), 
                    label: `Appointment #${a.id} - ${new Date(a.appointment_date).toLocaleDateString('en-IN')}` 
                  })) || []),
                ]}
                className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100"
                icon={<IndianRupee className="w-5 h-5 text-emerald-500" />}
                disabled={submitting}
              />

              <Select
                label="Payment Method"
                required
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                options={[
                  { value: '', label: 'Select Payment Method' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Credit Card', label: 'Credit Card' },
                  { value: 'Debit Card', label: 'Debit Card' },
                  { value: 'Insurance', label: 'Insurance' },
                  { value: 'Bank Transfer', label: 'Bank Transfer' },
                  { value: 'Online Payment', label: 'Online Payment' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'Cheque', label: 'Cheque' },
                ]}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Payment Status"
                required
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'refunded', label: 'Refunded' },
                ]}
                className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100"
                disabled={submitting}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all outline-none bg-gradient-to-r from-purple-50 to-pink-50"
                  placeholder="Consultation fee, medicine cost, procedure fee, etc."
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg transform hover:scale-105 transition-all"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <IndianRupee className="w-5 h-5" />
                    Create Payment Record
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="bg-gradient-to-r from-gray-100 to-slate-100 hover:from-gray-200 hover:to-slate-200 border border-gray-200"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add CSS for blob animation */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}