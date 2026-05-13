import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pill, Box, AlertTriangle, CheckCircle, XCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';

const Pharmacy = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('prescriptions'); // 'prescriptions' | 'inventory'
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, iRes] = await Promise.all([
        api.get('/prescriptions/queue').catch(() => ({ data: { pending: [] } })),
        api.get('/prescriptions/inventory').catch(() => ({ data: { inventory: [] } }))
      ]);
      setPrescriptions(pRes.data.pending || []);
      setInventory(iRes.data.inventory || []);
    } catch (err) {
      toast.error('Failed to load pharmacy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDispense = async (id) => {
    try {
      await api.put(`/prescriptions/${id}/dispense`, { quantity_dispensed: 1 });
      toast.success('Prescription dispensed successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispense');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/prescriptions/${id}/reject`, { reason: 'Stock unavailable or invalid dosage' });
      toast.success('Prescription rejected');
      fetchData();
    } catch (err) {
      toast.error('Failed to reject');
    }
  };

  return (
    <div className="page-container flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-6 shrink-0">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <Pill className="text-primary" size={32} /> Tele-Pharmacy
        </h1>
        <p className="text-slate-500 mt-1">Manage pending prescriptions and track drug inventory.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100/50 p-1.5 rounded-2xl w-fit mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'prescriptions' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Pill size={18} /> Pending Prescriptions ({prescriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'inventory' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Box size={18} /> Inventory Stock
        </button>
      </div>

      <div className="flex-1 overflow-auto pb-8">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'prescriptions' ? (
          /* Prescriptions View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {prescriptions.length === 0 ? (
              <div className="col-span-full glass-panel p-16 text-center text-slate-500">
                <CheckCircle size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-1">All clear!</h3>
                <p>No pending prescriptions in the queue.</p>
              </div>
            ) : (
              prescriptions.map((p, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                  key={p.id} className="glass-panel p-6 flex flex-col"
                >
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{p.drug_name}</h3>
                      <p className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">{p.dosage} - {p.frequency}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">PENDING</span>
                  </div>
                  
                  <div className="flex-1 space-y-3 mb-6">
                    <div className="text-sm">
                      <span className="text-slate-400 block text-xs uppercase font-bold tracking-wider mb-1">Duration</span>
                      <span className="font-medium text-slate-700">{p.duration}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-400 block text-xs uppercase font-bold tracking-wider mb-1">Route</span>
                      <span className="font-medium text-slate-700">{p.route}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handleDispense(p.id)} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                      <Package size={16} /> Dispense
                    </button>
                    <button onClick={() => handleReject(p.id)} className="px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition border border-transparent hover:border-red-200" title="Reject">
                      <XCircle size={20} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          /* Inventory View */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200/60">
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Drug Name</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Unit</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Quantity</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Expiry</th>
                  <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map(item => {
                  const isLowStock = item.quantity <= item.reorder_threshold;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{item.drug_name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.unit}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isLowStock ? 'text-red-600 font-bold text-lg' : 'text-slate-700'}`}>
                          {item.quantity}
                        </span>
                        <span className="text-slate-400 text-xs ml-1">/ {item.reorder_threshold} min</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold uppercase rounded-md border border-red-200">
                            <AlertTriangle size={14} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-md border border-emerald-200">
                            <CheckCircle size={14} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No inventory records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Pharmacy;
