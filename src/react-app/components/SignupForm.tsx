// components/SignupForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff,
  User,
  Phone,
  Briefcase,
  GraduationCap,
  Building,
  Calendar,
  UserCheck,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Shield,
  Stethoscope,
  MapPin,
  Database,
  Check
} from 'lucide-react';

// Initialize Supabase
const supabaseUrl = 'https://mwlmitpcngbgnpicdmsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bG1pdHBjbmdiZ25waWNkbXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc0ODcsImV4cCI6MjA4MTA5MzQ4N30.u3lamYlASvv5lynPVjVsnbwBFbSQcCLqMFWzkVdRL58';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface SignupFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'doctor' | 'receptionist' | 'admin';
  phone?: string;
  department?: string;
  specialty?: string;
  licenseNumber?: string;
  experience?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  bloodGroup?: string;
}

export default function SignupForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'doctor'
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const [dbStatus, setDbStatus] = useState('Checking database...');

  const departments = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology',
    'Gynecology', 'Dermatology', 'Psychiatry', 'Radiology', 'Emergency'
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const specialties = {
    doctor: [
      'Cardiologist', 'Neurologist', 'Orthopedic Surgeon', 'Pediatrician',
      'Oncologist', 'Gynecologist', 'Dermatologist', 'Psychiatrist',
      'Radiologist', 'Emergency Medicine'
    ],
    receptionist: ['Front Desk', 'Patient Coordinator', 'Billing Specialist'],
    admin: ['System Administrator', 'Hospital Director', 'IT Manager']
  };

  // Check database on component mount
  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    try {
      setDbStatus('Checking table structure...');
      
      // Try a simple query to see if table is accessible
      const {  error } = await supabase

        .from('hospital_staff')
        .select('count', { count: 'exact', head: true });
      
      if (error && error.message.includes('permission denied')) {
        setDbStatus('RLS blocking access');
        // Try to disable RLS
        await disableRLS();
      } else if (error) {
        setDbStatus(`Error: ${error.message}`);
      } else {
        setDbStatus('Database ready ✓');
        setDbReady(true);
      }
    } catch (err) {
      console.error('Database check error:', err);
      setDbStatus('Connection error');
    }
  };

  const disableRLS = async () => {
    try {
      // Show SQL to user
      setDbStatus('RLS needs to be disabled');
      
      // Try to call a function to disable RLS
      const { error } = await supabase.rpc('disable_rls_if_exists');
      
      if (error) {
        console.log('RPC failed, showing manual instructions');
      }
    } catch (err) {
      console.log('RLS disable attempt failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
    
    setError(null);
  };

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (formData.role === 'doctor' && !formData.licenseNumber) {
      setError('License number is required for doctors');
      return false;
    }
    
    return true;
  };

const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  setLoading(true);
  setError(null);
  setSuccessMessage(null);

  try {
    // Simple password hash
    const passwordHash = btoa(unescape(encodeURIComponent(formData.password)));

    // Build minimal user data first
    const userData: any = {
      email: formData.email,
      full_name: formData.fullName,
      password_hash: passwordHash,
      role: formData.role,
      is_active: formData.role === 'admin'
    };

    console.log('Attempting to create user...');

    // Try to insert with minimal data
    const { error: insertError } = await supabase
      .from('hospital_staff')
      .insert([userData]);

    if (insertError) {
      console.error('Insert error:', insertError);
      
      // If it's a column error, try alternative approach
      if (insertError.message.includes('column')) {
        // Try with only essential fields
        const minimalData = {
          email: formData.email,
          full_name: formData.fullName,
          password: passwordHash, // Try different column name
          role: formData.role
        };

        const { error: altError } = await supabase
          .from('hospital_staff')
          .insert([minimalData]);

        if (altError) {
          throw new Error(`Column missing. Please run: ALTER TABLE hospital_staff ADD COLUMN full_name VARCHAR(255);`);
        }
      } else {
        throw insertError;
      }
    }

    setSuccessMessage(
      formData.role === 'admin'
        ? 'Admin account created successfully! You can now login.'
        : 'Registration submitted successfully! Your account is pending admin approval.'
    );

    setTimeout(() => {
      navigate('/login');
    }, 3000);

  } catch (err: any) {
    console.error('Signup error:', err);
    
    if (err.message.includes('column')) {
      // Show specific column fix
      const columnMatch = err.message.match(/column "(\w+)" of/);
      if (columnMatch) {
        const columnName = columnMatch[1];
        setError(`Missing column: ${columnName}. Please run: ALTER TABLE hospital_staff ADD COLUMN ${columnName} VARCHAR(255);`);
      } else {
        setError(err.message);
      }
    } else {
      setError(err.message || 'Registration failed. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};

  const fixRlsIssue = () => {
    const sql = `ALTER TABLE hospital_staff DISABLE ROW LEVEL SECURITY;`;
    
    navigator.clipboard.writeText(sql)
      .then(() => {
        alert('SQL copied to clipboard! Please:\n1. Go to Supabase SQL Editor\n2. Paste the SQL\n3. Click "Run"\n4. Refresh this page');
        window.open('https://supabase.com/dashboard/project/mwlmitpcngbgnpicdmsa/sql', '_blank');
      })
      .catch(() => {
        alert('Please copy this SQL: ALTER TABLE hospital_staff DISABLE ROW LEVEL SECURITY;');
      });
  };

  const addMissingColumns = () => {
    const sql = `
-- Add missing columns
ALTER TABLE hospital_staff ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE hospital_staff ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE hospital_staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE hospital_staff ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Disable RLS
ALTER TABLE hospital_staff DISABLE ROW LEVEL SECURITY;
    `;
    
    navigator.clipboard.writeText(sql.trim())
      .then(() => {
        alert('SQL copied to clipboard! Run it in Supabase SQL Editor, then refresh this page.');
        window.open('https://supabase.com/dashboard/project/mwlmitpcngbgnpicdmsa/sql', '_blank');
      });
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.fullName || !formData.email) {
        setError('Please fill in all required fields');
        return;
      }
    }
    if (step === 2) {
      if (!formData.password || !formData.confirmPassword) {
        setError('Please fill in password fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (passwordStrength < 3) {
        setError('Please choose a stronger password');
        return;
      }
    }
    setStep(step + 1);
    setError(null);
  };

  const prevStep = () => {
    setStep(step - 1);
    setError(null);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-r from-emerald-300 to-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-2xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="absolute -top-16 left-0 flex items-center text-gray-600 hover:text-gray-800 mb-4"
          disabled={loading}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Login
        </button>

        {/* Database Status */}
        <div className="absolute -top-16 right-0">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
            dbReady ? 'bg-green-100 text-green-800' : 
            dbStatus.includes('RLS') ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            <Database className="w-3 h-3 mr-1" />
            {dbStatus}
          </div>
        </div>

        {/* Signup Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center mb-4">
              <UserCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join MediCare Plus</h1>
            <p className="text-emerald-100">Create your hospital staff account</p>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-center mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-white text-green-600' : 'bg-white/20 text-white'}`}>
                  1
                </div>
                <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-white' : 'bg-white/20'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-white text-green-600' : 'bg-white/20 text-white'}`}>
                  2
                </div>
                <div className={`w-16 h-1 mx-2 ${step >= 3 ? 'bg-white' : 'bg-white/20'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-white text-green-600' : 'bg-white/20 text-white'}`}>
                  3
                </div>
              </div>
              <div className="text-sm text-white/80">
                {step === 1 && 'Basic Information'}
                {step === 2 && 'Account Setup'}
                {step === 3 && 'Professional Details'}
              </div>
            </div>
          </div>

          {/* Database Fix Instructions */}
          {!dbReady && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800">Database Setup Required</h3>
                  <p className="text-yellow-700 text-sm mt-1">
                    {dbStatus.includes('RLS') ? 'RLS needs to be disabled:' : 'Missing columns or permissions:'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={fixRlsIssue}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                    >
                      Disable RLS
                    </button>
                    <button
                      onClick={addMissingColumns}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      Add Missing Columns
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="p-8">
            {error && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <div className="text-red-600 text-sm font-medium">
                    {typeof error === 'string' ? error : error}
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <p className="text-green-600 text-sm font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <User className="w-4 h-4 mr-2 text-blue-500" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      placeholder="Enter your full name"
                      disabled={loading}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Mail className="w-4 h-4 mr-2 text-blue-500" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      placeholder="Enter your email"
                      disabled={loading}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Phone className="w-4 h-4 mr-2 text-blue-500" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      placeholder="+1 (555) 123-4567"
                      disabled={loading}
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      disabled={loading}
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      placeholder="Enter your address"
                      disabled={loading}
                    />
                  </div>

                  {/* Blood Group */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <span className="w-4 h-4 mr-2 text-red-500">🩸</span>
                      Blood Group
                    </label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      disabled={loading}
                    >
                      <option value="">Select Blood Group</option>
                      {bloodGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Account Setup */}
            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Setup</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Password */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Lock className="w-4 h-4 mr-2 text-blue-500" />
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 pl-11 pr-11 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none"
                        placeholder="Create password"
                        disabled={loading}
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password Strength */}
                    {formData.password && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Password strength:</span>
                          <span className="font-semibold">
                            {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Fair' : passwordStrength <= 4 ? 'Good' : 'Strong'}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          ></div>
                        </div>
                        <ul className="mt-2 text-xs text-gray-500 space-y-1">
                          <li className={formData.password.length >= 8 ? 'text-green-600' : ''}>
                            • At least 8 characters
                          </li>
                          <li className={/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}>
                            • One uppercase letter
                          </li>
                          <li className={/[a-z]/.test(formData.password) ? 'text-green-600' : ''}>
                            • One lowercase letter
                          </li>
                          <li className={/[0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                            • One number
                          </li>
                          <li className={/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : ''}>
                            • One special character
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Lock className="w-4 h-4 mr-2 text-blue-500" />
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 pl-11 pr-11 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none"
                        placeholder="Confirm password"
                        disabled={loading}
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                    )}
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Briefcase className="w-4 h-4 mr-2 text-blue-500" />
                    Select Your Role *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { role: 'doctor', icon: Stethoscope, label: 'Doctor', color: 'from-blue-500 to-cyan-500', description: 'Medical practitioner' },
                      { role: 'receptionist', icon: User, label: 'Receptionist', color: 'from-emerald-500 to-teal-500', description: 'Front desk staff' },
                      { role: 'admin', icon: Shield, label: 'Administrator', color: 'from-purple-500 to-pink-500', description: 'System administrator' }
                    ].map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, role: item.role as any }))}
                        className={`p-4 rounded-xl text-left transition-all ${
                          formData.role === item.role
                            ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                        disabled={loading}
                      >
                        <item.icon className="w-6 h-6 mb-2" />
                        <div className="font-semibold">{item.label}</div>
                        <div className={`text-xs ${formData.role === item.role ? 'text-white/80' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Professional Details */}
            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Professional Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Department */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Building className="w-4 h-4 mr-2 text-blue-500" />
                      Department
                    </label>
                    <select
                      name="department"
                      value={formData.department || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      disabled={loading}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Specialty */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <GraduationCap className="w-4 h-4 mr-2 text-blue-500" />
                      {formData.role === 'doctor' ? 'Specialty' : 'Position'}
                    </label>
                    <select
                      name="specialty"
                      value={formData.specialty || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      disabled={loading}
                    >
                      <option value="">Select {formData.role === 'doctor' ? 'Specialty' : 'Position'}</option>
                      {specialties[formData.role]?.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  {/* License Number (for doctors) */}
                  {formData.role === 'doctor' && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <Shield className="w-4 h-4 mr-2 text-blue-500" />
                        Medical License Number *
                      </label>
                      <input
                        type="text"
                        name="licenseNumber"
                        value={formData.licenseNumber || ''}
                        onChange={handleInputChange}
                        required={formData.role === 'doctor'}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                        placeholder="Enter license number"
                        disabled={loading}
                      />
                    </div>
                  )}

                  {/* Experience */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Briefcase className="w-4 h-4 mr-2 text-blue-500" />
                      Years of Experience
                    </label>
                    <select
                      name="experience"
                      value={formData.experience || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                      disabled={loading}
                    >
                      <option value="">Select Experience</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4 mr-2 text-blue-500" />
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                    placeholder="Emergency contact number"
                    disabled={loading}
                  />
                </div>

                          {/* Terms and Conditions */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-700">
                      <p className="font-semibold mb-2">Terms & Conditions</p>
                      <ul className="space-y-1 text-gray-600">
                        <li className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>By creating an account, you agree to our hospital's privacy policy</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>Doctor accounts require verification by hospital administration</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>You must maintain patient confidentiality at all times</span>
                        </li>
                        <li className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>All medical data is protected under HIPAA regulations</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Admin Approval Notice */}
                {formData.role !== 'admin' && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-emerald-700">
                        <p className="font-semibold mb-1">Important Note</p>
                        <p>Your account requires administrator approval before you can access the system. You'll receive an email notification once your account is activated.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-medium rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Previous
                </button>
              ) : (
                <div></div> // Empty div for spacing
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Next Step
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !dbReady}
                  className="flex items-center justify-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5 mr-2" />
                      Complete Registration
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Step Indicator for small screens */}
            <div className="mt-6 text-center md:hidden">
              <div className="inline-flex items-center space-x-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`w-3 h-3 rounded-full ${
                      step === s 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                        : s < step 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                          : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Step {step} of 3
              </div>
            </div>

            {/* Login Link */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  Login here
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} MediCare Plus Hospital Management System
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Secure hospital staff registration portal
          </p>
        </div>
      </div>

      {/* Add CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
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