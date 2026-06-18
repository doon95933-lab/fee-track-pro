import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import { Card, Badge, Btn, Modal, Field, Alert, Spinner, Empty } from '../components/UI';
import toast from 'react-hot-toast';

const ROLES = ['director', 'accountant', 'management', 'admin'];
const ROLE_DESC = {
  director: 'Can approve/reject concessions, create payment plans, view all',
  accountant: 'Can upload due list, mark payments, view ledger',
  management: 'Can raise concession requests, view ledger',
  admin: 'Full access to everything including user management',
};

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'management' });

  const fetchUsers = () => {
    api.get('/users').then(({ data }) => setUsers(data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const createUser = async () => {
    if (!form.name || !form.email || !form.password || !form.role)
      return toast.error('All fields are required');
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters');
    setSubmitting(true);
    try {
      await api.post('/users', form);
      toast.success(`User ${form.name} created successfully!`);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'management' });
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUser = async (uid, active) => {
    if (uid === user.id) return toast.error("You can't deactivate yourself");
    try {
      await api.patch(`/users/${uid}/toggle`);
      toast.success(active ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const roleColors = { director: 'blue', accountant: 'green', management: 'amber', admin: 'red' };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="User Management" />
      <div className="p-6">
        {user.role !== 'admin' && (
          <Alert type="warning">⚠️ Only admins can manage users.</Alert>
        )}

        <div className="grid grid-cols-4 gap-3 mb-5">
          {ROLES.map(r => (
            <div key={r} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1 capitalize">{r}</div>
              <div className="text-2xl font-semibold text-gray-800">{users.filter(u => u.role === r).length}</div>
            </div>
          ))}
        </div>

        {user.role === 'admin' && (
          <div className="mb-4">
            <Btn variant="primary" onClick={() => setShowForm(true)}>+ Add new user</Btn>
          </div>
        )}

        <Card title={`${users.length} users`}>
          {loading ? <Spinner /> : users.length === 0 ? <Empty /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Name', 'Email', 'Role', 'Status', 'Created', user.role === 'admin' ? 'Action' : ''].filter(Boolean).map(h => (
                      <th key={h} className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-800">{u.name}</div>
                        {u.id === user.id && <span className="text-xs text-blue-500">You</span>}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{u.email}</td>
                      <td className="py-3 pr-4"><Badge status={roleColors[u.role] || 'default'}>{u.role}</Badge></td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.active ? 'text-forest-600' : 'text-red-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-forest-500' : 'bg-red-400'}`} />
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400 text-xs">{u.created_at?.slice(0, 10)}</td>
                      {user.role === 'admin' && (
                        <td className="py-3">
                          <Btn size="sm" variant={u.active ? 'danger' : 'success'}
                            onClick={() => toggleUser(u.id, u.active)}
                            disabled={u.id === user.id}>
                            {u.active ? 'Deactivate' : 'Activate'}
                          </Btn>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Role guide */}
        <Card title="Role permissions guide">
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(r => (
              <div key={r} className="border border-gray-100 rounded-lg p-3">
                <Badge status={roleColors[r] || 'default'} className="mb-2">{r}</Badge>
                <div className="text-xs text-gray-500 mt-1">{ROLE_DESC[r]}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Add user modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)} title="Add new user">
          <Alert type="warning">⚠️ Share the credentials securely. Ask the user to change password after first login.</Alert>
          <div className="space-y-4">
            <Field label="Full name" required>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Anjali Verma"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300" />
            </Field>
            <Field label="Email address" required>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="e.g. anjali@school.com"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300" />
            </Field>
            <Field label="Password" required hint="Minimum 6 characters">
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Set a strong password"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300" />
            </Field>
            <Field label="Role" required hint={ROLE_DESC[form.role]}>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300">
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </Field>
            <div className="flex gap-2">
              <Btn variant="primary" onClick={createUser} disabled={submitting}>
                {submitting ? 'Creating…' : '+ Create user'}
              </Btn>
              <Btn onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
