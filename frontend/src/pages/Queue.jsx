import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, UserPlus, Clock, Play, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useSocket } from '../utils/useSocket';

const Queue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [formData, setFormData] = useState({ patient_id: '', doctor_id: '', department_id: '', scheduled_at: '', priority: 'standard' });

  const fetchQueue = async () => {
    try {
      const response = await api.get('/queue');
      setQueue(response.data.queue || []);
    } catch (err) {
      console.error('Failed to load queue', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization
  useSocket(() => {
    fetchQueue();
  });

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/queue/appointments', formData);
      const appointmentId = response.data?.appointment?.id;

      if (appointmentId) {
        try {
          const checkInRes = await api.post('/queue/checkin', { 
            appointment_id: appointmentId,
            priority: formData.priority || 'standard'
          });
          const token = checkInRes.data?.queue_entry?.token_number || checkInRes.data?.entry?.token_number;
          toast.success(`Appointment booked and queued! Token: ${token || 'Generated'}`);
        } catch (checkInError) {
          const checkInMessage = checkInError.response?.data?.error || 'Auto check-in failed';
          toast.error(`Appointment booked, but check-in failed: ${checkInMessage}`);
        }
      } else {
        toast.success('Appointment booked successfully!');
      }

      setShowBookModal(false);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to book appointment');
    }
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/queue/checkin', { 
        appointment_id: formData.appointment_id,
        priority: formData.priority || 'standard'
      });
      const token = res.data?.queue_entry?.token_number || res.data?.entry?.token_number;
      toast.success(`Checked in! Token: ${token || 'Generated'}`);
      setShowCheckInModal(false);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to check in');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/queue/${id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      fetchQueue();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'emergency': return 'bg-red-100 text-red-700 border-red-200';
      case 'elderly_disabled': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'in_progress': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'no_show': return 'bg-slate-100 text-slate-600';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="text-primary" size={32} /> Queue Management
          </h1>
          <p className="text-slate-500 mt-1">Monitor live queues and manage patient flow.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => { setFormData({appointment_id: ''}); setShowCheckInModal(true); }}
            className="btn-secondary flex items-center gap-2"
          >
            <UserPlus size={18} /> Check In Patient
          </button>
          <button 
            onClick={() => { setFormData({ patient_id: '', doctor_id: '', department_id: '', scheduled_at: '', priority: 'standard' }); setShowBookModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Book Appointment
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200/60">
                <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Token</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Patient</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Department</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Priority</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Wait Time</th>
                <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                      Loading live queue...
                    </div>
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Users size={32} className="text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-600">No patients waiting</p>
                      <p className="text-sm">The queue is currently empty.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                queue.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-lg text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{entry.token_number}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{entry.patient_name}</td>
                    <td className="px-6 py-4 text-slate-600">{entry.department}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getPriorityColor(entry.priority)} uppercase tracking-wider`}>
                        {entry.priority.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit ${getStatusColor(entry.status)} capitalize`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75"></span>
                        {entry.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock size={16} className={entry.wait_time_minutes > 30 ? 'text-amber-500' : 'text-slate-400'} />
                        <span className={entry.wait_time_minutes > 30 ? 'font-semibold text-amber-600' : ''}>
                          {entry.wait_time_minutes} min
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {entry.status === 'waiting' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => updateStatus(entry.id, 'in_progress')} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition tooltip border border-transparent hover:border-purple-200" title="Start Consultation">
                            <Play size={18} />
                          </button>
                          <button onClick={() => updateStatus(entry.id, 'no_show')} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition border border-transparent hover:border-slate-200" title="Mark No-Show">
                            <XCircle size={18} />
                          </button>
                        </div>
                      )}
                      {entry.status === 'in_progress' && (
                        <button onClick={() => updateStatus(entry.id, 'completed')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition border border-transparent hover:border-emerald-200" title="Complete Consultation">
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Book Appointment Modal */}
      <AnimatePresence>
        {showBookModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-4">Book Appointment</h2>
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="label-text">Patient (Email or UUID)</label>
                  <input type="text" className="input-field" required value={formData.patient_id} onChange={e => setFormData({...formData, patient_id: e.target.value})} placeholder="patient@example.com or patient UUID" />
                </div>
                <div>
                  <label className="label-text">Department (Code, Name, or UUID)</label>
                  <input type="text" className="input-field" required value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})} placeholder="e.g. GENERAL, General Medicine, or UUID" />
                </div>
                <div>
                  <label className="label-text">Doctor UUID (Optional)</label>
                  <input type="text" className="input-field" value={formData.doctor_id} onChange={e => setFormData({...formData, doctor_id: e.target.value})} placeholder="Optional doctor UUID" />
                </div>
                <div>
                  <label className="label-text">Date & Time</label>
                  <input type="datetime-local" className="input-field" required value={formData.scheduled_at} onChange={e => setFormData({...formData, scheduled_at: e.target.value})} />
                </div>
                <div>
                  <label className="label-text">Priority</label>
                  <select className="input-field" value={formData.priority || 'standard'} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option value="standard">Standard</option>
                    <option value="elderly_disabled">Elderly / Disabled</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowBookModal(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                  <button type="submit" className="btn-primary">Book Appointment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Check In Modal */}
      <AnimatePresence>
        {showCheckInModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-4">Patient Check-In</h2>
              <p className="text-slate-500 mb-6 text-sm">Enter the appointment ID to generate a queue token for the patient.</p>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div>
                  <label className="label-text">Appointment ID</label>
                  <input type="text" className="input-field" required value={formData.appointment_id} onChange={e => setFormData({...formData, appointment_id: e.target.value})} placeholder="e.g. appt-123" />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowCheckInModal(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                  <button type="submit" className="btn-primary">Generate Token</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Queue;
