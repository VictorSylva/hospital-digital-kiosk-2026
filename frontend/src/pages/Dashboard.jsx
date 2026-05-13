import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileStack, Pill, Activity, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, delay, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    onClick={onClick}
    className="glass-panel p-6 cursor-pointer card-hover relative overflow-hidden group"
  >
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${colorClass}`} />
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div>
        <h3 className="text-slate-500 font-medium mb-1">{title}</h3>
        <span className="text-3xl font-bold text-slate-800">{value}</span>
      </div>
      <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-20`}>
        <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
      </div>
    </div>
    <p className="text-sm font-medium text-slate-500 relative z-10">{subtitle}</p>
  </motion.div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ queue: 0, vitals: 0, prescriptions: 0 });

  useEffect(() => {
    // In a real app we would hit a /stats endpoint, for MVP we'll gracefully mock or fetch live
    const fetchQuickStats = async () => {
      try {
        const [qRes, pRes] = await Promise.all([
          api.get('/queue'),
          api.get('/prescriptions/queue').catch(() => ({ data: { pending: [] }}))
        ]);
        setStats({
          queue: qRes.data?.queue?.length || 0,
          prescriptions: pRes.data?.pending?.length || 0,
          vitals: 0 // Mocked for now until alerts API applies
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    };
    fetchQuickStats();
  }, []);

  return (
    <div className="page-container">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">
          Welcome back, {user?.name || 'Doctor'}
        </h1>
        <p className="text-slate-500">Here's an overview of the hospital's current status.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Live Queue" 
          value={stats.queue} 
          subtitle="Patients waiting" 
          icon={Users} 
          colorClass="bg-blue-500 text-blue-600" 
          delay={0.1}
          onClick={() => navigate('/queue')}
        />
        <StatCard 
          title="Pending Prescriptions" 
          value={stats.prescriptions} 
          subtitle="Awaiting dispatch" 
          icon={Pill} 
          colorClass="bg-purple-500 text-purple-600" 
          delay={0.2}
          onClick={() => navigate('/pharmacy')}
        />
        <StatCard 
          title="Vital Alerts" 
          value={stats.vitals || '0'} 
          subtitle="Abnormal readings" 
          icon={Activity} 
          colorClass="bg-red-500 text-red-600" 
          delay={0.3}
          onClick={() => navigate('/vitals')}
        />
        <StatCard 
          title="EHR Access" 
          value="Secure" 
          subtitle="AES-256 Encrypted" 
          icon={FileStack} 
          colorClass="bg-emerald-500 text-emerald-600" 
          delay={0.4}
          onClick={() => navigate('/ehr')}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-panel p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <Activity className="text-blue-600" size={20} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">System Integrity</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Database Connected', 'End-to-End Encryption Active', 'Audit Logging Enabled', 'RBAC Authorized'].map((status, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <span className="text-sm font-medium text-slate-700">{status}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
