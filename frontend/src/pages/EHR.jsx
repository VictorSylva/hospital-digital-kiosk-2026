import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileStack, Search, Plus, Lock, Clock, FileText, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';

const EHR = () => {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState({ record_type: 'consultation', contentText: '' });

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!patientId.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/ehr/${patientId}`);
      setRecords(response.data.records || []);
      setSearched(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch records. Access may be denied.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      const content = { summary: newRecord.contentText, timestamp: new Date().toISOString() };
      await api.post(`/ehr/${patientId}`, { 
        record_type: newRecord.record_type, 
        content 
      });
      toast.success('Secure record encrypted and saved!');
      setShowAddModal(false);
      setNewRecord({ record_type: 'consultation', contentText: '' });
      handleSearch(); // Refresh records
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create record');
    }
  };

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <FileStack className="text-primary" size={32} /> Electronic Health Records
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <Lock size={14} className="text-emerald-500" /> AES-256-GCM Encrypted at Rest
          </p>
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
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"
          >
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-primary">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Search Patient Records</h3>
            <p className="text-slate-500 max-w-md">Enter a valid Patient ID above to securely retrieve and decrypt their electronic health records.</p>
          </motion.div>
        )}

        {searched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <User size={20} className="text-slate-400"/> Patient: <span className="text-primary">{patientId}</span>
              </h2>
              {user?.role === 'doctor' && (
                <button onClick={() => setShowAddModal(true)} className="btn-secondary flex items-center gap-2">
                  <Plus size={18} /> Add Record
                </button>
              )}
            </div>

            {records.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500">
                No records found for this patient.
              </div>
            ) : (
              <div className="space-y-4">
                {records.map((record, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
                    key={record.id} 
                    className="glass-panel p-6 border-l-4 border-l-primary"
                  >
                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-md w-fit">
                          {record.record_type}
                        </span>
                        <div className="flex items-center gap-4 text-sm mt-1">
                          <span className="flex items-center gap-1.5 text-slate-500"><User size={14}/> {record.created_by}</span>
                          <span className="flex items-center gap-1.5 text-slate-500"><Clock size={14}/> {new Date(record.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        <Lock size={12} /> Decrypted
                      </div>
                    </div>
                    <div className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                      {record.content?.summary || JSON.stringify(record.content)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Record Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText size={20} className="text-primary"/> New EHR Entry</h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <Lock size={14} /> Will be encrypted
                </div>
              </div>
              
              <form onSubmit={handleAddRecord} className="p-6 space-y-5">
                <div>
                  <label className="label-text">Record Type</label>
                  <select 
                    className="input-field" 
                    value={newRecord.record_type} 
                    onChange={e => setNewRecord({...newRecord, record_type: e.target.value})}
                  >
                    <option value="consultation">Consultation Note</option>
                    <option value="diagnosis">Diagnosis</option>
                    <option value="lab_result">Lab Result</option>
                    <option value="treatment_plan">Treatment Plan</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Clinical Notes</label>
                  <textarea 
                    className="input-field min-h-[150px] resize-y" 
                    required 
                    value={newRecord.contentText} 
                    onChange={e => setNewRecord({...newRecord, contentText: e.target.value})} 
                    placeholder="Enter clinical observations, symptoms, and plans..."
                  />
                </div>
                
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                  <button type="submit" className="btn-primary flex items-center gap-2"><Lock size={16}/> Save Securely</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EHR;
