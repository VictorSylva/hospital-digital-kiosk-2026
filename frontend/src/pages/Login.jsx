import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, HeartPulse, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleToggle = () => setIsLogin(!isLogin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } else {
        await api.post('/auth/signup', formData);
        toast.success('Account created! Please log in.');
        setIsLogin(true);
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background sm:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl flex rounded-3xl overflow-hidden shadow-2xl bg-white min-h-[600px]"
      >
        {/* Left Side: Branding & Info */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between text-white relative overflow-hidden">
          {/* Background decorative blob */}
          <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] rounded-full bg-white/10 blur-3xl z-0 pointer-events-none"></div>
          
          <div className="z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Activity size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">HDMS</h1>
            </div>
            
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-4xl font-extrabold leading-tight mb-6"
            >
              Digital Healthcare <br/> Management
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-blue-100 text-lg max-w-sm mb-12"
            >
              A unified platform for queues, tele-pharmacy, encrypted EHRs, and real-time patient vitals.
            </motion.p>
          </div>

          <div className="z-10 grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-blue-200" size={24} />
              <span className="text-blue-100 font-medium">AES-256</span>
            </div>
            <div className="flex items-center gap-3">
              <Stethoscope className="text-blue-200" size={24} />
              <span className="text-blue-100 font-medium">RBAC Sync</span>
            </div>
            <div className="flex items-center gap-3">
              <HeartPulse className="text-blue-200" size={24} />
              <span className="text-blue-100 font-medium">Vital Alerts</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 p-8 sm:p-14 lg:p-16 flex flex-col justify-center">
          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-3xl font-bold text-slate-800 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h3>
            <p className="text-slate-500">
              {isLogin ? 'Please enter your credentials to continue.' : 'Register a new patient account to access the portal.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="label-text">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-field"
                  placeholder="John Doe"
                  required={!isLogin}
                />
              </motion.div>
            )}

            <div>
              <label className="label-text">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="input-field"
                placeholder="doctor@hdms.internal"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                {isLogin && <a href="#" className="text-sm font-medium text-primary hover:text-primary-dark transition">Forgot password?</a>}
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg font-semibold mt-4 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              {isLogin ? "Don't have an account?" : 'Already have an account?'} 
              <button 
                onClick={handleToggle}
                className="ml-2 font-semibold text-primary hover:text-primary-dark transition"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
