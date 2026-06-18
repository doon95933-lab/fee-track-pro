import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNotifs } from '../context/NotifContext';
import Topbar from '../components/Topbar';
import { Metric, Badge, Card, Btn, Alert, Spinner, Empty, inr } from '../components/UI';
import toast from 'react-hot-toast';

export default function Approvals() {
  const { addLocal } = useNotifs();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState({}); // { [id]: { amount, note } }
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    api.get('/concessions', { params: { status: 'pending' } })
      .then(({ data }) => setRequests(data))
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
  }, []);

  const setDecision = (id, field, val) =>
    setDecisions(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const decide = async (id, status, studentName) => {
    const d = decisions[id] || {};
    if (!d.note) return toast.error('Decision note is mandatory — it is permanently logged with your name.');
    if (status !== 'rejected' && !d.amount) return toast.error('Please enter the approved amount.');

    setSubmitting(id + status);
    try {
      await api.patch(`/concessions/${id}/decide`, {
        status,
        approved_amount: d.amount,
        decision_note: d.note,
      });
      const label = status === 'waived' ? 'Full waive-off issued' : status === 'approved' ? 'Approved' : 'Rejected';
      toast.success(`${label} for ${studentName}`);
      addLocal(`Concession ${status}`, `${label} for ${studentName}`, status === 'rejected' ? 'danger' : 'success');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(null);
    }
  };

  const pending = requests.filter(r => r.status === 'pending');

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Pending Approvals" />
      <div className="p-6">
        <Alert type="info">
          🛡 You are reviewing as <strong>Director</strong>. Every decision is permanently logged with your name, timestamp, and reason.
        </Alert>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Metric label="Awaiting decision" value={pending.length} color="amber" />
          <Metric label="Urgent" value={pending.filter(r => r.is_urgent).length} color="red" />
          <Metric label="Total waiver asked" value={inr(pending.reduce((a, r) => a + parseFloat(r.waiver_requested || 0), 0))} color="blue" />
        </div>

        {loading ? <Spinner /> : pending.length === 0 ? (
          <Card>
            <Empty message="✅ All caught up — no pending approvals" />
          </Card>
        ) : pending.map(r => {
          const d = decisions[r.id] || {};
          const waiver = parseFloat(r.waiver_requested);
          const due = parseFloat(r.current_due);
          return (
            <div key={r.id} className={`bg-white border rounded-xl p-5 mb-4 ${r.is_urgent ? 'border-l-4 border-l-red-500 border-gray-200' : 'border-gray-200'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-base font-semibold text-gray-900">
                    {r.student_name} <span className="text-sm font-normal text-gray-500">{r.class}-{r.section}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Parent: {r.parent_name} · Raised by <strong>{r.requested_by_name}</strong>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Category: {r.category}</div>
                </div>
                <div className="flex gap-2">
                  <Badge status={r.category.toLowerCase().replace(' ', '_')}>{r.category}</Badge>
                  {r.is_urgent && <Badge status="urgent">🚨 Urgent</Badge>}
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-4 gap-3 bg-gray-50 rounded-lg p-3 mb-3">
                {[
                  { label: 'Total due', value: inr(due) },
                  { label: 'Waiver requested', value: inr(waiver), color: 'text-amber-700' },
                  { label: '% of due', value: `${Math.round(waiver / due * 100)}%` },
                  { label: 'Remaining if approved', value: inr(due - waiver), color: 'text-forest-600' },
                ].map(a => (
                  <div key={a.label}>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">{a.label}</div>
                    <div className={`text-base font-semibold mt-0.5 ${a.color || 'text-gray-800'}`}>{a.value}</div>
                  </div>
                ))}
              </div>

              {/* Reason */}
              <div className="bg-blue-50/50 border-l-3 border-blue-300 rounded-r-lg p-3 mb-4 text-sm text-gray-600 italic">
                "{r.reason}"
              </div>

              {/* Decision inputs */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Approved amount (₹) — you can modify
                  </label>
                  <input type="number" value={d.amount ?? r.waiver_requested}
                    onChange={e => setDecision(r.id, 'amount', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Decision note <span className="text-red-500">*</span> <span className="text-gray-400">(logged permanently)</span>
                  </label>
                  <input value={d.note || ''} onChange={e => setDecision(r.id, 'note', e.target.value)}
                    placeholder="Reason for this decision…"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <Btn variant="success" disabled={!!submitting} onClick={() => decide(r.id, 'approved', r.student_name)}>
                  ✅ Approve waiver
                </Btn>
                <Btn variant="danger" disabled={!!submitting} onClick={() => decide(r.id, 'rejected', r.student_name)}>
                  ✗ Reject
                </Btn>
                <Btn variant="purple" disabled={!!submitting} onClick={() => decide(r.id, 'waived', r.student_name)}>
                  🏷 Full waive-off
                </Btn>
                <Btn variant="info" disabled={!!submitting} onClick={() => toast('Go to Payment Plans to create a plan for this student')}>
                  📅 Give time (payment plan)
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
