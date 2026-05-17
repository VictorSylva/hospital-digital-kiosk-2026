import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Box, AlertTriangle, CheckCircle, XCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import { useSocket } from '../utils/useSocket';

const Pharmacy = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('prescriptions'); // 'prescriptions' | 'inventory'
  const [prescriptions, setPrescriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [newDrug, setNewDrug] = useState({
    drug_name: '',
    quantity: 0,
    unit: 'tablet',
    expiry_date: '',
    reorder_threshold: 10,
    batch_number: '',
    supplier: ''
  });

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

  // Real-time synchronization
  useSocket(() => {
    fetchData();
  });

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

  const handleAddDrug = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prescriptions/inventory', newDrug);
      toast.success('New drug added successfully to inventory!');
      setShowAddModal(false);
      setNewDrug({
        drug_name: '',
        quantity: 0,
        unit: 'tablet',
        expiry_date: '',
        reorder_threshold: 10,
        batch_number: '',
        supplier: ''
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add drug');
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/prescriptions/inventory/${selectedItem.id}`, {
        inventory_id: selectedItem.id,
        quantity: parseInt(restockQty, 10)
      });
      toast.success('Inventory restocked successfully!');
      setShowRestockModal(false);
      setSelectedItem(null);
      setRestockQty('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update stock');
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
          <div className="space-y-4">
            {(user?.role === 'pharmacist' || user?.role === 'admin') && (
              <div className="flex justify-end">
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700 py-2">
                  <Package size={18} /> Add New Drug
                </button>
              </div>
            )}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/60">
                    <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Drug Name</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Unit</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Quantity</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Expiry</th>
                    <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider">Status</th>
                    {(user?.role === 'pharmacist' || user?.role === 'admin') && (
                      <th className="px-6 py-4 font-semibold text-sm text-slate-500 tracking-wider text-right">Actions</th>
                    )}
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
                        {(user?.role === 'pharmacist' || user?.role === 'admin') && (
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => { setSelectedItem(item); setRestockQty(item.quantity.toString()); setShowRestockModal(true); }} 
                              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold transition"
                            >
                              Restock
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={(user?.role === 'pharmacist' || user?.role === 'admin') ? 6 : 5} className="px-6 py-8 text-center text-slate-500">No inventory records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          </div>
        )}
      </div>

      {/* Add New Drug Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Package size={20} className="text-primary"/> Add New Drug to Inventory</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
              </div>
              
              <form onSubmit={handleAddDrug} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-text text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Drug Name</label>
                    <input 
                      type="text"
                      className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl"
                      required
                      value={newDrug.drug_name}
                      onChange={e => setNewDrug({...newDrug, drug_name: e.target.value})}
                      placeholder="e.g. Paracetamol"
                    />
                  </div>
                  <div>
                    <label className="label-text text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Unit Type</label>
                    <select 
                      className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl"
                      value={newDrug.unit}
                      onChange={e => setNewDrug({...newDrug, unit: e.target.value})}
                    >
                      <option value="tablet">Tablet</option>
                      <option value="capsule">Capsule</option>
                      <option value="bottle">Bottle (Liquid)</option>
                      <option value="vial">Vial (Injection)</option>
                      <option value="tube">Tube (Ointment)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label-text text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Initial Quantity</label>
                    <input 
                      type="number"
                      min="0"
                      className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl"
                      required
                      value={newDrug.quantity}
                      onChange={e => setNewDrug({...newDrug, quantity: parseInt(e.target.value, 10) || 0})}
                    />
                  </div>
                  <div>
                    <label className="label-text text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Reorder Min Level</label>
                    <input 
                      type="number"
                      min="0"
                      className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl"
                      required
                      value={newDrug.reorder_threshold}
                      onChange={e => setNewDrug({...newDrug, reorder_threshold: parseInt(e.target.value, 10) || 0})}
                    />
                  </div>
                  <div>
                    <label className="label-text text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Expiry Date</label>
                    <input 
                      type="date"
                      className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl"
                      required
                      value={newDrug.expiry_date}
                      onChange={e => setNewDrug({...newDrug, expiry_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-text text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Batch Number</label>
                    <input 
                      type="text"
                      className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl"
                      value={newDrug.batch_number}
                      onChange={e => setNewDrug({...newDrug, batch_number: e.target.value})}
                      placeholder="e.g. BATCH-102"
                    />
                  </div>
                  <div>
                    <label className="label-text text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Supplier</label>
                    <input 
                      type="text"
                      className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl"
                      value={newDrug.supplier}
                      onChange={e => setNewDrug({...newDrug, supplier: e.target.value})}
                      placeholder="e.g. Pfizer Inc."
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                  <button type="submit" className="btn-primary flex items-center gap-2">Add Drug</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restock Modal */}
      <AnimatePresence>
        {showRestockModal && selectedItem && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Box size={20} className="text-primary"/> Restock Drug</h2>
                <button onClick={() => { setShowRestockModal(false); setSelectedItem(null); }} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
              </div>
              
              <form onSubmit={handleRestock} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Drug Name</label>
                  <div className="font-bold text-lg text-slate-800 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/60">{selectedItem.drug_name}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Updated Stock Quantity</label>
                  <input 
                    type="number"
                    min="0"
                    className="input-field w-full px-4 py-2 border border-slate-200 rounded-xl font-bold text-lg text-slate-800"
                    required
                    value={restockQty}
                    onChange={e => setRestockQty(e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">Enter the total updated count of available inventory.</p>
                </div>
                
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => { setShowRestockModal(false); setSelectedItem(null); }} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                  <button type="submit" className="btn-primary flex items-center gap-2">Update Stock</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Pharmacy;
