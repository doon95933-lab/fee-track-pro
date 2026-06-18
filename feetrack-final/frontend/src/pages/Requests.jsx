import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotifContext';
import Topbar from '../components/Topbar';
import { Card, Badge, Btn, Modal, Field, Alert, Spinner, Empty, inr } from '../components/UI';
import toast from 'react-hot-toast';

const CATEGORIES = ['Financial Hardship', 'Job Loss', 'Medical Emergency', 'Family Crisis', 'Business Loss', 'Single Parent', 'Other'];

export default function Requests() {
  const { user } = useAuth();
  const { addLocal } = useNotifs();
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ student_id: '', waiver_requested: '', category: '', reason: '', is_urgent: false });

  const fetchAll = () => {
    Promise.all([
      api.get('/concessions'),
      api.get('/students'),
    ]).then(([c, s]) => {
      setRequests(c.data);
      setStudents(s.data.filter(s => parseFloat(s.due) > 0));
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const selectedStudent = students.find(s => s.id === form.student_id);

  const submitRequest = async () => {
    if (!form.student_id) return toast.error('Please select a student');
    if (!form.waiver_requested) return toast.error('Enter waiver amount');
    if (!form.category) return toast.error('Select a category');
    if (!form.reason || form.reason.length < 20) return toast.error('Please write a detailed reason (min 20 characters)');
    if (selectedStudent && parseFloat(form.waiver_requested) > parseFloat(selectedStudent.due))
      return toast.error(`Waiver cannot exceed due amount (${inr(selectedStudent.due)})`);

    setSubmitting(true);
    try {
      await api.post('/concessions', form);
      toast.success('Request submitted! Director has been notified.');
      addLocal('Request submitted', `Your concession request for ${selectedStudent?.name} has been sent to the Director.`, 'info');
      setShowForm(false);
      setForm({ student_id: '', waiver_requested: '', category: '', reason: '', is_urgent: false });
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = { pending: 'amber', approved: 'green', rejected: 'red', waived: 'purple' };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Concession Requests" />
      <div className="p-6">

        {user.role === 'management' && (
          <Alert type="info">
            📝 You can only see your own requests. The Director is notified instantly when you submit.
          </Alert>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-xl p-4 border text-left transition-all ${filter === s ? 'border-forest-600 bg-forest-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 capitalize">{s === 'all' ? 'Total requests' : s}</div>
              <div className="text-2xl font-semibold text-gray-800">
                {s === 'all' ? requests.length : requests.filter(r => r.status === s).length}
              </div>
            </button>
          ))}
        </div>

        {/* New request button */}
        {(user.role === 'management' || user.role === 'admin') && (
          <div className="mb-4">
            <Btn variant="primary" onClick={() => setShowForm(true)}>
              + New concession request
            </Btn>
          </div>
        )}

        {/* Requests list */}
        <Card title={`${filtered.length} requests`}>
          {loading ? <Spinner /> : filtered.length === 0 ? <Empty message="No requests found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Student', 'Class', 'Total Due', 'Waiver Asked', 'Category', 'Requested By', 'Status', 'Decision'].map(h => (
                      <th key={h} className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 pr-4">
                        <div className="font-medium text-gray-800">{r.student_name}</div>
                        <div className="text-xs text-gray-400">{r.parent_name}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{r.class}-{r.section}</td>
                      <td className="py-3 pr-4 text-gray-700">{inr(r.current_due)}</td>
                      <td className="py-3 pr-4 font-semibold text-amber-700">{inr(r.waiver_requested)}</td>
                      <td className="py-3 pr-4"><Badge status="pending">{r.category}</Badge></td>
                      <td className="py-3 pr-4 text-gray-600">{r.requested_by_name}</td>
                      <td className="py-3 pr-4">
                        <Badge status={r.status}>{r.status}</Badge>
                        {r.is_urgent && <Badge status="urgent" className="ml-1">urgent</Badge>}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 max-w-xs">
                        {r.decision_note ? (
                          <div>
                            <div className="font-medium text-gray-700">{r.approved_by_name}</div>
                            <div className="text-gray-400 truncate">{r.decision_note}</div>
                            {r.approved_amount > 0 && <div className="text-forest-600 font-medium">{inr(r.approved_amount)} approved</div>}
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* New Request Modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)} title="New concession request" width="max-w-2xl">
          <Alert type="warning">
            ⚠️ This request will be permanently logged with your name. Provide honest and accurate information.
          </Alert>
          <div className="space-y-4">
            <Field label="Select student" required hint="Only students with pending dues are shown">
              <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300">
                <option value="">— Select student —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.class}-{s.section}) — Due: {inr(s.due)}</option>
                ))}
              </select>
            </Field>

            {selectedStudent && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-3">
                <div><div className="text-xs text-gray-400">Total fee</div><div className="font-medium">{inr(selectedStudent.total_fee)}</div></div>
                <div><div className="text-xs text-gray-400">Paid so far</div><div className="font-medium text-forest-600">{inr(selectedStudent.paid)}</div></div>
                <div><div className="text-xs text-gray-400">Balance due</div><div className="font-semibold text-red-600">{inr(selectedStudent.due)}</div></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Waiver amount requested (₹)" required>
                <input type="number" value={form.waiver_requested}
                  max={selectedStudent ? parseFloat(selectedStudent.due) : undefined}
                  onChange={e => setForm(f => ({ ...f, waiver_requested: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
              </Field>
              <Field label="Hardship category" required>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300">
                  <option value="">— Select category —</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Detailed reason" required hint="Minimum 20 characters. Be specific — this is reviewed by the Director.">
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={4} placeholder="Describe the family's situation in detail. Mention any supporting documents available..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
              <div className="text-xs text-gray-400 text-right">{form.reason.length} chars</div>
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_urgent} onChange={e => setForm(f => ({ ...f, is_urgent: e.target.checked }))}
                className="w-4 h-4 accent-forest-600" />
              <span className="text-sm text-gray-700">Mark as <strong>urgent</strong> (Director will be alerted immediately)</span>
            </label>

            <div className="flex gap-2 pt-2">
              <Btn variant="primary" onClick={submitRequest} disabled={submitting}>
                {submitting ? 'Submitting…' : '📤 Submit for Director approval'}
              </Btn>
              <Btn onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
