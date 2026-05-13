import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Thermometer, Weight, Heart, TrendingUp, Search, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';

const Vitals = () => {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState('');
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [formData, setFormData] = useState({
    temperature: '',
    weight: '',
    blood_pressure: '',
    spo2: ''
  });

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!patientId.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/vitals/${patientId}`);
      setVitals(response.data.vitals || []);
      setSearched(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch vitals history');
      setVitals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    try {
      const [systolic, diastolic] = formData.blood_pressure.split('/').map(num => parseInt(num.trim(), 10));
      
      await api.post('/vitals', {
        patient_id: patientId,
        temperature: parseFloat(formData.temperature),
        weight: parseFloat(formData.weight),
        blood_pressure_systolic: systolic,
        blood_pressure_diastolic: diastolic,
        spo2: parseInt(formData.spo2, 10)
      });
      toast.success('Vital signs recorded successfully');
      setShowAddModal(false);
      setFormData({ temperature: '', weight: '', blood_pressure: '', spo2: '' });
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit vitals');
    }
  };

  const isAbnormal = (vital) => {
    if (!vital) return false;
    const isTempHigh = vital.temperature > 38 || vital.temperature < 35;
    const isSpo2Low = vital.spo2 < 95;
    const isBpHigh = (vital.blood_pressure_systolic > 140) || (vital.blood_pressure_diastolic > 90);
    
    return isTempHigh || isSpo2Low || isBpHigh;
  };

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Activity className="text-primary" size={32} /> Vital Signs
          </h1>
          <p className="text-slate-500 mt-1">Record and monitor patient vitals.</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Enter Patient ID" 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <AnimatePresence mode="wait">
        {!searched && !loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"
          >
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-primary">
              <Activity size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Patient Vitals Central</h3>
            <p className="text-slate-500 max-w-md">Search for a patient by ID to view their vitals history or to record a new reading.</p>
          </motion.div>
        )}

        {searched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                History for Patient: <span className="text-primary">{patientId}</span>
              </h2>
              {['nurse', 'doctor', 'admin'].includes(user?.role) && (
                <button onClick={() => setShowAddModal(true)} className="btn-secondary flex items-center gap-2">
                  <Plus size={18} /> Record Vitals
                </button>
              )}
            </div>

            {vitals.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500">
                No vitals recorded yet for this patient.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {vitals.map((reading, index) => {
                  const abnormal = isAbnormal(reading);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                      key={reading.id} 
                      className={`glass-panel p-6 ${abnormal ? 'border-red-200 bg-red-50/30' : ''}`}
                    >
                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <span className="font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">
                          {new Date(reading.captured_at).toLocaleString()}
                        </span>
                        {abnormal ? (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-md border border-red-200">
                            <AlertTriangle size={14} /> Attention required
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-md border border-emerald-200">
                            <CheckCircle size={14} /> Normal range
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className={`p-2 rounded-lg ${reading.temperature > 38 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Thermometer size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Temperature</p>
                            <p className="font-bold text-slate-800">{reading.temperature}°C</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                            <Weight size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Weight</p>
                            <p className="font-bold text-slate-800">{reading.weight} kg</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className={`p-2 rounded-lg ${(reading.blood_pressure_systolic && isAbnormal(reading)) ? 'bg-red-50 text-red-600' : 'bg-rose-50 text-rose-600'}`}>
                            <Heart size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium">Blood Pressure</p>
                            <p className="font-bold text-slate-800">
                              {reading.blood_pressure_systolic && reading.blood_pressure_diastolic 
                                ? `${reading.blood_pressure_systolic}/${reading.blood_pressure_diastolic}` 
                                : '--'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className={`p-2 rounded-lg ${reading.spo2 < 95 ? 'bg-red-50 text-red-600' : 'bg-cyan-50 text-cyan-600'}`}>
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 font-medium">SpO2</p>
                            <p className="font-bold text-slate-800">{reading.spo2}%</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Vitals Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Activity size={20} className="text-primary"/> Record New Vitals
                </h2>
                <p className="text-slate-500 text-sm mt-1">Patient: {patientId}</p>
              </div>
              
              <form onSubmit={handleSubmitVitals} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-text">Temperature (°C)</label>
                    <input type="number" step="0.1" className="input-field" required value={formData.temperature} onChange={e => setFormData({...formData, temperature: e.target.value})} placeholder="36.5" />
                  </div>
                  <div>
                    <label className="label-text">Weight (kg)</label>
                    <input type="number" step="0.1" className="input-field" required value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="70" />
                  </div>
                  <div>
                    <label className="label-text">Blood Pressure (mmHg)</label>
                    <input type="text" className="input-field" required value={formData.blood_pressure} onChange={e => setFormData({...formData, blood_pressure: e.target.value})} placeholder="120/80" />
                  </div>
                  <div>
                    <label className="label-text">SpO2 (%)</label>
                    <input type="number" className="input-field" required value={formData.spo2} onChange={e => setFormData({...formData, spo2: e.target.value})} placeholder="98" />
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end pt-6 border-t border-slate-100 mt-6 !mt-8">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                  <button type="submit" className="btn-primary flex items-center gap-2">Submit Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Vitals;
