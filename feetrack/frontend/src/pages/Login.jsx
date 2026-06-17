import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (email) => setForm({ email, password: 'password' });

  return (
    <div className="min-h-screen bg-forest-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏫</div>
          <h1 className="text-xl font-semibold text-forest-900">FeeTrack Pro</h1>
          <p className="text-sm text-gray-500 mt-1">School Fee Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@school.com"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-forest-700 text-forest-100 py-2.5 rounded-lg text-sm font-medium hover:bg-forest-900 transition-colors disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Demo accounts (password: <code>password</code>)</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Director', email: 'director@school.com' },
              { label: 'Accountant', email: 'accounts@school.com' },
              { label: 'Management', email: 'rahul@school.com' },
              { label: 'Admin', email: 'admin@school.com' },
            ].map(d => (
              <button
                key={d.email}
                onClick={() => demoLogin(d.email)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 text-left transition-colors"
              >
                <span className="font-medium text-gray-700">{d.label}</span>
                <span className="block text-gray-400 truncate">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
