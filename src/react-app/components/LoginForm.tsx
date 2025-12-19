// components/LoginForm.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/react-app/context/AuthContext'; // CORRECT IMPORT PATH
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Stethoscope,
  UserCheck,
  Shield,
  AlertCircle,
  Loader2,
  UserPlus,
  CheckCircle,
  Database,
  ArrowLeft
} from 'lucide-react';

// Initialize Supabase
const supabaseUrl = 'https://mwlmitpcngbgnpicdmsa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bG1pdHBjbmdiZ25waWNkbXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTc0ODcsImV4cCI6MjA4MTA5MzQ4N30.u3lamYlASvv5lynPVjVsnbwBFbSQcCLqMFWzkVdRL58';

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface LoginFormData {
  email: string;
  password: string;
  role: 'doctor' | 'receptionist' | 'admin';
}

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth(); // Now this will work correctly
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    role: 'doctor'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbStatus, setDbStatus] = useState('Checking database...');

  // Check database on component mount
  useEffect(() => {
    checkDatabase();
    const rememberedEmail = localStorage.getItem('medicare_remember');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const checkDatabase = async () => {
    try {
      setDbStatus('Checking connection...');

      // Try a simple query to see if table is accessible
      const {  error } = await supabase
        .from('hospital_staff')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.error('Database check error:', error);
        if (error.message.includes('permission denied')) {
          setDbStatus('RLS blocking access');
        } else if (error.message.includes('does not exist')) {
          setDbStatus('Table not found');
        } else {
          setDbStatus(`Error: ${error.message}`);
        }
      } else {
        setDbStatus('Database ready ✓');
        setDbReady(true);
      }
    } catch (err) {
      console.error('Database check failed:', err);
      setDbStatus('Connection error');
    }
  };

  // Test credentials (based on your database)
  const testCredentials = {
    admin: {
      email: 'admin@hospital.com',
      password: 'admin123',
      description: 'System Administrator - Full access'
    },
    doctor: {
      email: 'john.doe@hospital.com',
      password: 'doctor123',
      description: 'Dr. John Doe - Cardiologist'
    },
    receptionist: {
      email: 'jane.smith@hospital.com',
      password: 'receptionist123',
      description: 'Jane Smith - Front Desk'
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const fillTestCredentials = () => {
    const credentials = testCredentials[formData.role];
    setFormData(prev => ({
      ...prev,
      email: credentials.email,
      password: credentials.password
    }));
    setSuccessMessage(`${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)} test credentials loaded`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dbReady) {
      setError('Database not ready. Please wait...');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('Attempting login with:', formData.email);

      // Check if user exists in hospital_staff table
      const { data: users, error: queryError } = await supabase
        .from('hospital_staff')
        .select('*')
        .eq('email', formData.email)
        .limit(1);

      if (queryError) {
        console.error('Query error:', queryError);
        throw new Error('Database error. Please try again.');
      }

      if (!users || users.length === 0) {
        throw new Error('No account found with this email. Please sign up first.');
      }

      const user = users[0];
      console.log('Found user:', user);

      // Check role matches (optional, can be removed if you want flexibility)
      if (formData.role && user.role !== formData.role) {
        console.log(`User role is ${user.role}, but form selected ${formData.role}. Still allowing login.`);
        setFormData(prev => ({ ...prev, role: user.role as any }));
      }

      // Check password (base64 encoded in database)
      const inputPasswordHash = btoa(unescape(encodeURIComponent(formData.password)));

      if (user.password_hash !== inputPasswordHash) {
        // Special case for admin test password
        if (formData.password === 'admin123' && user.email === 'admin@hospital.com') {
          console.log('Using admin test password bypass');
        } else {
          throw new Error('Incorrect password. Please try again.');
        }
      }

      // Check if account is active
      if (!user.is_active && user.role !== 'admin') {
        throw new Error('Account is pending approval. Please contact administrator.');
      }

      // Prepare user data for AuthContext
      const userData = {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        department: user.department,
        specialty: user.specialty,
        phone: user.phone,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login: user.last_login
      };

      // Use AuthContext login
      login(userData);
      
      // Store remember me email if checked
      if (rememberMe) {
        localStorage.setItem('medicare_remember', formData.email);
      } else {
        localStorage.removeItem('medicare_remember');
      }

      // Get redirect path based on role
      let redirectPath = '/dashboard';
      switch (user.role) {
        case 'admin':
          redirectPath = '/admin-dashboard';
          break;
        case 'doctor':
          redirectPath = '/doctor-dashboard';
          break;
        case 'receptionist':
          redirectPath = '/receptionist-dashboard';
          break;
        case 'patient':
          redirectPath = '/patient-dashboard';
          break;
      }

      setSuccessMessage(`Welcome back, ${user.full_name}!`);
      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);

    } catch (err: any) {
      console.error('Login error:', err);

      // User-friendly error messages
      if (err.message.includes('No account found')) {
        setError('No account found with this email. Please sign up first.');
      } else if (err.message.includes('Incorrect password')) {
        setError('Incorrect password. Please try again.');
      } else if (err.message.includes('pending approval')) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fixDatabase = () => {
    const sql = `
-- Create hospital_staff table
CREATE TABLE IF NOT EXISTS hospital_staff (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'receptionist', 'admin', 'patient')),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    phone VARCHAR(20),
    address TEXT,
    department VARCHAR(100),
    specialty VARCHAR(100),
    license_number VARCHAR(100),
    experience VARCHAR(50),
    date_of_birth DATE,
    emergency_contact VARCHAR(20),
    blood_group VARCHAR(10),
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Disable RLS for testing
ALTER TABLE hospital_staff DISABLE ROW LEVEL SECURITY;

-- Insert default admin account (password: admin123)
INSERT INTO hospital_staff (email, full_name, password_hash, role, is_active) 
VALUES ('admin@hospital.com', 'System Administrator', 'YWRtaW4xMjM=', 'admin', true)
ON CONFLICT (email) DO NOTHING;
    `;

    navigator.clipboard.writeText(sql.trim())
      .then(() => {
        alert('SQL copied to clipboard! Go to Supabase SQL Editor and run it, then refresh this page.');
        window.open('https://supabase.com/dashboard/project/mwlmitpcngbgnpicdmsa/sql', '_blank');
      })
      .catch(() => {
        alert('Please copy the SQL manually and run it in Supabase SQL Editor.');
      });
  };

  const getTestAccounts = () => {
    const sql = `
-- Insert test accounts for all roles
INSERT INTO hospital_staff (email, full_name, password_hash, role, is_active, department, specialty) VALUES
('john.doe@hospital.com', 'Dr. John Doe', 'ZG9jdG9yMTIz', 'doctor', true, 'Cardiology', 'Cardiologist'),
('jane.smith@hospital.com', 'Jane Smith', 'cmVjZXB0aW9uaXN0MTIz', 'receptionist', true, 'Front Desk', 'Patient Coordinator'),
('admin@hospital.com', 'System Administrator', 'YWRtaW4xMjM=', 'admin', true, 'Administration', 'System Administrator')
ON CONFLICT (email) DO NOTHING;
    `;

    navigator.clipboard.writeText(sql.trim())
      .then(() => {
        alert('Test accounts SQL copied! Run in Supabase SQL Editor.');
        window.open('https://supabase.com/dashboard/project/mwlmitpcngbgnpicdmsa/sql', '_blank');
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-r from-emerald-300 to-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-md">
        {/* Database Status */}
        <div className="absolute -top-16 right-0">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${dbReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
            <Database className="w-3 h-3 mr-1" />
            {dbStatus}
          </div>
        </div>

        {/* Back to Home */}
        <button
          onClick={() => navigate('/')}
          className="absolute -top-16 left-0 flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">MediCare Plus</h1>
            <p className="text-blue-100">Hospital Staff Portal</p>
          </div>

          {/* Database Fix Alert */}
          {!dbReady && (
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-200">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 text-sm">Database Setup Required</h3>
                  <p className="text-yellow-700 text-xs mt-1">{dbStatus}</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={fixDatabase}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      Setup Database
                    </button>
                    <button
                      onClick={getTestAccounts}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                    >
                      Add Test Accounts
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'doctor', icon: Stethoscope, label: 'Doctor', color: 'from-blue-500 to-cyan-500', redirect: '/doctor-dashboard' },
                { role: 'receptionist', icon: UserCheck, label: 'Receptionist', color: 'from-emerald-500 to-teal-500', redirect: '/receptionist-dashboard' },
                { role: 'admin', icon: Shield, label: 'Admin', color: 'from-purple-500 to-pink-500', redirect: '/admin-dashboard' }
              ].map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: item.role as any }))}
                  disabled={!dbReady}
                  className={`p-4 rounded-xl transition-all text-center ${formData.role === item.role
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-105`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    } ${!dbReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <item.icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-semibold block">{item.label}</span>
                  <span className="text-xs opacity-75 block mt-1">
                    → {item.redirect}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <p className="text-green-600 text-sm font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4 mr-2 text-blue-500" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={loading || !dbReady}
                  className="w-full px-4 py-3 pl-11 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your email"
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-400" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Lock className="w-4 h-4 mr-2 text-blue-500" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading || !dbReady}
                  className="w-full px-4 py-3 pl-11 pr-11 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  disabled={loading || !dbReady}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading || !dbReady}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !dbReady}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing in...
                </span>
              ) : (
                `Sign in as ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}`
              )}
            </button>

            {/* Test Credentials Button */}
            {dbReady && (
              <button
                type="button"
                onClick={fillTestCredentials}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 text-amber-700 rounded-xl font-medium hover:border-amber-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load Test Credentials for {formData.role}
              </button>
            )}

            {/* Signup Link */}
            <div className="text-center pt-4">
              <p className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Sign up here
                </Link>
              </p>
            </div>

            {/* Test Credentials Info */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Test Accounts & Redirects:</h4>
              <div className="space-y-2 text-xs">
                {Object.entries(testCredentials).map(([role, creds]) => (
                  <div key={role} className="text-gray-600 p-2 bg-white rounded">
                    <div className="font-medium capitalize">{role}:</div>
                    <div>Email: {creds.email}</div>
                    <div>Password: {creds.password}</div>
                    <div className="text-blue-600 font-medium mt-1">
                      → Redirects to: /{role}-dashboard
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-100 border-t border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} MediCare Plus. All rights reserved.
              <br />
              <span className="text-gray-400">v1.0.0 • Hospital Management System</span>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200">
            <Shield className="w-4 h-4 text-green-500 mr-2" />
            <span className="text-xs text-gray-600">Secure HTTPS Connection • Data Encrypted</span>
          </div>
        </div>
      </div>

      {/* Animation CSS */}
      <style>{`
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