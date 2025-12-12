// components/LoginForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Stethoscope, 
  UserCheck, 
  Shield,
  AlertCircle,
  Loader2
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

interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    role: string;
    full_name: string;
    token?: string;
  };
}

export default function LoginForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    role: 'doctor'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Demo credentials for testing
  const demoCredentials = {
    doctor: { email: 'doctor@medicare.com', password: 'Doctor@123' },
    receptionist: { email: 'receptionist@medicare.com', password: 'Receptionist@123' },
    admin: { email: 'admin@medicare.com', password: 'Admin@123' }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null); // Clear error on input change
  };

  const fillDemoCredentials = () => {
    const credentials = demoCredentials[formData.role];
    setFormData(prev => ({
      ...prev,
      email: credentials.email,
      password: credentials.password
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Method 1: Direct database query (for custom auth)
      const { data: userData, error: dbError } = await supabase
        .rpc('check_user_credentials', {
          p_email: formData.email,
          p_password: formData.password // Note: In production, hash this on client side
        });

      if (dbError || !userData || userData.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = userData[0];

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated. Please contact administrator.');
      }

      // Check role
      if (user.role !== formData.role) {
        throw new Error(`Please login as ${user.role}`);
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.user_id);

      // Create session token (simplified - in production use JWT)
      const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2)}`;
      
      // Store session in database
      await supabase
        .from('login_sessions')
        .insert([{
          user_id: user.user_id,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          user_agent: navigator.userAgent
        }]);

      // Store user info in localStorage (in production, use HTTP-only cookies)
      const userSession = {
        id: user.user_id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        token: sessionToken,
        timestamp: Date.now()
      };

      localStorage.setItem('medicare_auth', JSON.stringify(userSession));
      
      if (rememberMe) {
        localStorage.setItem('medicare_remember', formData.email);
      }

      // Redirect based on role
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'doctor':
          navigate('/doctor/dashboard');
          break;
        case 'receptionist':
          navigate('/receptionist/dashboard');
          break;
        default:
          navigate('/dashboard');
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check for remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('medicare_remember');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-r from-emerald-300 to-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">MediCare Plus</h1>
            <p className="text-blue-100">Hospital Management System</p>
          </div>

          {/* Role Selection */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'doctor', icon: Stethoscope, label: 'Doctor', color: 'from-blue-500 to-cyan-500' },
                { role: 'receptionist', icon: UserCheck, label: 'Receptionist', color: 'from-emerald-500 to-teal-500' },
                { role: 'admin', icon: Shield, label: 'Admin', color: 'from-purple-500 to-pink-500' }
              ].map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: item.role as any }))}
                  className={`p-4 rounded-xl transition-all ${
                    formData.role === item.role
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-105`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-semibold">{item.label}</span>
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
                  className="w-full px-4 py-3 pl-11 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                  placeholder="Enter your email"
                  disabled={loading}
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
                  className="w-full px-4 py-3 pl-11 pr-11 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-400 transition-all outline-none"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Demo Credentials Button */}
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 text-amber-700 rounded-xl font-medium hover:border-amber-300 hover:shadow-md transition-all"
              disabled={loading}
            >
              Use Demo Credentials
            </button>

            {/* Role Info */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Logging in as <span className="font-semibold text-blue-600 capitalize">{formData.role}</span>
              </p>
              <div className="mt-2 text-xs text-gray-500 text-center">
                {formData.role === 'doctor' && 'Access patient records, appointments, and prescriptions'}
                {formData.role === 'receptionist' && 'Manage appointments, patient registration, and billing'}
                {formData.role === 'admin' && 'Full system access, user management, and reports'}
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