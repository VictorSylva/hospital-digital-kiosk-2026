import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, UserPlus, Users, Loader2, Building2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const STAFF_ROLES = ['doctor', 'nurse', 'pharmacist', 'admin', 'patient'];

const initialFormData = {
  name: '',
  email: '',
  password: '',
  role: 'doctor',
  national_id: ''
};

const initialDepartmentForm = {
  name: '',
  code: '',
  daily_capacity: 50,
  description: ''
};

const Admin = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [departmentForm, setDepartmentForm] = useState(initialDepartmentForm);
  const [submitting, setSubmitting] = useState(false);
  const [submittingDepartment, setSubmittingDepartment] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);

  const staffUsers = useMemo(
    () => users.filter((user) => STAFF_ROLES.includes(user.role)),
    [users]
  );

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/auth/users');
      setUsers(response.data?.users || []);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load users';
      toast.error(message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      const response = await api.get('/departments');
      setDepartments(response.data?.departments || []);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to load departments';
      toast.error(message);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/auth/register', formData);
      toast.success(`${formData.role} account created successfully`);
      setFormData(initialFormData);
      fetchUsers();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create user';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepartmentChange = (field, value) => {
    setDepartmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDepartmentSubmit = async (e) => {
    e.preventDefault();
    setSubmittingDepartment(true);

    try {
      await api.post('/departments', {
        name: departmentForm.name,
        code: departmentForm.code,
        daily_capacity: Number(departmentForm.daily_capacity),
        description: departmentForm.description || null,
      });
      toast.success('Department created successfully');
      setDepartmentForm(initialDepartmentForm);
      fetchDepartments();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create department';
      toast.error(message);
    } finally {
      setSubmittingDepartment(false);
    }
  };

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2 flex items-center gap-3">
          <Shield className="text-primary" size={30} />
          Admin Control Center
        </h1>
        <p className="text-slate-500">
          Create staff accounts and monitor who can operate clinical modules.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="xl:col-span-1 glass-panel p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="text-primary" size={20} />
            <h2 className="text-xl font-semibold text-slate-800">Create Staff Account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text">Full Name</label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Dr. Jane Doe"
                required
              />
            </div>

            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="jane@hospital.org"
                required
              />
            </div>

            <div>
              <label className="label-text">Temporary Password</label>
              <input
                type="password"
                className="input-field"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="At least 10 characters"
                minLength={10}
                required
              />
            </div>

            <div>
              <label className="label-text">Role</label>
              <select
                className="input-field"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                required
              >
                {STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {formData.role === 'patient' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label className="label-text text-primary font-semibold">National ID / Kiosk ID</label>
                <input
                  type="text"
                  className="input-field border-primary/30 focus:border-primary"
                  value={formData.national_id}
                  onChange={(e) => handleChange('national_id', e.target.value)}
                  placeholder="e.g. P001, P002"
                  required
                />
              </motion.div>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Create User
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-2 glass-panel p-6"
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Users className="text-primary" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Managed Accounts</h2>
            </div>
            <button onClick={fetchUsers} className="btn-secondary">Refresh</button>
          </div>

          <div className="mb-4 text-sm text-slate-500">
            Staff accounts: <span className="font-semibold text-slate-700">{staffUsers.length}</span> / Total users: <span className="font-semibold text-slate-700">{users.length}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Email</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingUsers ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-slate-500">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium text-slate-700">{user.name}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 capitalize border border-blue-100">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${user.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {user.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="xl:col-span-1 glass-panel p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Plus className="text-primary" size={20} />
            <h2 className="text-xl font-semibold text-slate-800">Create Department</h2>
          </div>

          <form onSubmit={handleDepartmentSubmit} className="space-y-4">
            <div>
              <label className="label-text">Department Name</label>
              <input
                type="text"
                className="input-field"
                value={departmentForm.name}
                onChange={(e) => handleDepartmentChange('name', e.target.value)}
                placeholder="General Medicine"
                required
              />
            </div>

            <div>
              <label className="label-text">Code</label>
              <input
                type="text"
                className="input-field uppercase"
                value={departmentForm.code}
                onChange={(e) => handleDepartmentChange('code', e.target.value.toUpperCase())}
                placeholder="GEN"
                required
              />
            </div>

            <div>
              <label className="label-text">Daily Capacity</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={departmentForm.daily_capacity}
                onChange={(e) => handleDepartmentChange('daily_capacity', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label-text">Description (Optional)</label>
              <textarea
                className="input-field min-h-25"
                value={departmentForm.description}
                onChange={(e) => handleDepartmentChange('description', e.target.value)}
                placeholder="Outpatient and routine consultations"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={submittingDepartment}
            >
              {submittingDepartment && <Loader2 size={16} className="animate-spin" />}
              Create Department
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2 glass-panel p-6"
        >
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="text-primary" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Departments</h2>
            </div>
            <button onClick={fetchDepartments} className="btn-secondary">Refresh</button>
          </div>

          <div className="mb-4 text-sm text-slate-500">
            Total departments: <span className="font-semibold text-slate-700">{departments.length}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Code</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Capacity</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-500">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingDepartments ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-slate-500">
                      Loading departments...
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-slate-500">
                      No departments yet.
                    </td>
                  </tr>
                ) : (
                  departments.map((department) => (
                    <tr key={department.id}>
                      <td className="px-4 py-3 font-medium text-slate-700">{department.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                          {department.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{department.daily_capacity}</td>
                      <td className="px-4 py-3 text-slate-600">{department.description || 'No description'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
