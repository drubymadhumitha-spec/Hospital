import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/react-app/App';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
}

export default function Login() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    role: 'patient'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual Supabase authentication
      // This is a mock login for demonstration
      const mockUsers = {
        'patient@demo.com': { 
          id: '1', 
          email: 'patient@demo.com', 
          fullName: 'John Doe', 
          phone: '+91 9876543210',
          role: 'patient' as const 
        },
        'doctor@demo.com': { 
          id: '2', 
          email: 'doctor@demo.com', 
          fullName: 'Dr. Jane Smith', 
          phone: '+91 9876543211',
          role: 'doctor' as const 
        },
        'admin@demo.com': { 
          id: '3', 
          email: 'admin@demo.com', 
          fullName: 'Admin User', 
          phone: '+91 9876543212',
          role: 'admin' as const 
        }
      };

      const user = mockUsers[formData.email as keyof typeof mockUsers];

      if (user && formData.password === 'demo123' && user.role === formData.role) {
        const token = `mock_token_${Date.now()}`;
        login(user, user.role, token);
        navigate('/dashboard');
      } else {
        setError('Invalid email, password, or role selection');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fillDemoCredentials = (role: 'patient' | 'doctor' | 'admin') => {
    const demoCredentials = {
      patient: { email: 'patient@demo.com', password: 'demo123' },
      doctor: { email: 'doctor@demo.com', password: 'demo123' },
      admin: { email: 'admin@demo.com', password: 'demo123' }
    };
    
    setFormData({
      email: demoCredentials[role].email,
      password: demoCredentials[role].password,
      role
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="flex gap-2 mb-6">
            {(['patient', 'doctor', 'admin'] as const).map((roleType) => (
              <button
                key={roleType}
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, role: roleType }));
                  fillDemoCredentials(roleType);
                }}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  formData.role === roleType
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {roleType.charAt(0).toUpperCase() + roleType.slice(1)}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : `Sign in as ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}`}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            {/* Signup Link */}
            <div className="text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-semibold">
                  Sign up now
                </Link>
              </p>
            </div>

            {/* Demo Info */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <p className="text-sm text-amber-700 text-center">
                Demo: Use email <strong>{formData.email || 'patient@demo.com'}</strong> 
                with password <strong>demo123</strong>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}