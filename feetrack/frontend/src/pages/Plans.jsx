import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotifContext';
import Topbar from '../components/Topbar';
import { Card, Badge, Btn, Modal, Field, Alert, Spinner, Empty, ProgressBar, inr } from '../components/UI';
import toast from 'react-hot-toast';

export default function Plans() {
  const { user } = useAuth();
  const { addLocal } = useNotifs();
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ student_id: '', note: '', deadline: '', num_instalments: 2, first_due: '' });
  const [generatedInstalments, setGeneratedInstalments] = useState([]);

  const fetchPlans = () => {
    Promise.all([
      api.get('/plans'),
      api.get('/students'),
    ]).then(([p, s]) => {
      setPlans(p.data);
      setStudents(s.data.filter(s => parseFloat(s.due) > 0));
    }).catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlans(); }, []);

  const selectedStudent = students.find(s => s.id === form.student_id);

  const generateInstalments = () => {
    if (!selectedStudent || !form.first_due || !form.num_instalments) return;
    const due = parseFloat(selectedStudent.due);
    const n = parseInt(form.num_instalments);
    const baseAmt = Math.floor(due / n);
    const lastAmt = due - baseAmt * (n - 1);
    const firstDate = new Date(form.first_due);
    const result = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(firstDate);
      d.setMonth(d.getMonth() + i);
      result.push({
        instalment_no: i + 1,
        amount: i === n - 1 ? lastAmt : baseAmt,
        due_date: d.toISOString().slice(0, 10),
      });
    }
    setGeneratedInstalments(result);
  };

  useEffect(() => { generateInstalments(); }, [form.student_id, form.num_instalments, form.first_due]);

  const submitPlan = async () => {
    if (!form.student_id) return toast.error('Select a student');
    if (!form.deadline) return toast.error('Set a final deadline');
    if (!form.note) return toast.error('Note is mandatory — it is logged permanently');
    if (!generatedInstalments.length) return toast.error('Set first due date to generate instalments');

    setSubmitting(true);
    try {
      await api.post('/plans', { student_id: form.student_id, note: form.note, deadline: form.deadline, instalments: generatedInstalments });
      toast.success('Payment plan created! Accountant notified.');
      addLocal('Payment plan created', `New plan created for ${selectedStudent?.name}`, 'info');
      setShowForm(false);
      setForm({ student_id: '', note: '', deadline: '', num_instalments: 2, first_due: '' });
      setGeneratedInstalments([]);
      fetchPlans();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  const markInstalment = async (instId, status) => {
    try {
      await api.patch(`/plans/instalments/${instId}`, { status });
      toast.success(`Instalment marked as ${status}`);
      fetchPlans();
    } catch { toast.error('Failed to update'); }
  };

  const revokePlan = async (planId) => {
    if (!window.confirm('Revoke this payment plan?')) return;
    try {
      await api.delete(`/plans/${planId}`, { data: { reason: 'Revoked by director' } });
      toast.success('Plan revoked');
      fetchPlans();
    } catch { toast.error('Failed to revoke'); }
  };

  const instStatusColor = { paid: 'green', overdue: 'red', upcoming: 'default' };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Payment Plans" />
      <div className="p-6">
        {(user.role === 'director' || user.role === 'admin') && (
          <div className="mb-4">
            <Btn variant="primary" onClick={() => setShowForm(true)}>📅 Create new payment plan</Btn>
          </div>
        )}

        {loading ? <Spinner /> : plans.length === 0 ? (
          <Card><Empty message="No payment plans created yet" /></Card>
        ) : plans.map(plan => {
          const paidCount = plan.instalments?.filter(i => i.status === 'paid').length || 0;
          const total = plan.instalments?.length || 1;
          const paidAmt = plan.instalments?.filter(i => i.status === 'paid').reduce((a, i) => a + parseFloat(i.amount), 0) || 0;
          const overdueCount = plan.instalments?.filter(i => i.status === 'overdue').length || 0;
          return (
            <Card key={plan.id} className="mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-base font-semibold text-gray-800">{plan.student_name}
                    <span className="text-sm font-normal text-gray-500 ml-2">{plan.class}-{plan.section}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Parent: {plan.parent_name} · {plan.phone}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Created by {plan.created_by_name} · Deadline: {plan.deadline}</div>
                </div>
                <div className="flex gap-2">
                  {overdueCount > 0 && <Badge status="overdue">⚠ {overdueCount} overdue</Badge>}
                  {overdueCount === 0 && <Badge status="approved">On track</Badge>}
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                <div><div className="text-xs text-gray-400">Total due</div><div className="font-semibold">{inr(plan.total_due || 0)}</div></div>
                <div><div className="text-xs text-gray-400">Paid so far</div><div className="font-semibold text-forest-600">{inr(paidAmt)}</div></div>
                <div><div className="text-xs text-gray-400">Progress</div><div className="font-semibold">{paidCount}/{total} instalments</div></div>
              </div>

              <ProgressBar pct={Math.round((paidCount / total) * 100)} />
              <div className="text-xs text-gray-400 mt-1 mb-3">{Math.round((paidCount / total) * 100)}% complete</div>

              {/* Instalments */}
              <div className="space-y-2">
                {plan.instalments?.map(inst => (
                  <div key={inst.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                      ${inst.status === 'paid' ? 'bg-forest-100 text-forest-700' : inst.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                      {inst.status === 'paid' ? '✓' : inst.instalment_no}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{inr(inst.amount)}</div>
                      <div className="text-xs text-gray-400">Due: {inst.due_date}</div>
                    </div>
                    <Badge status={inst.status}>{inst.status}</Badge>
                    {(user.role === 'accountant' || user.role === 'admin') && inst.status !== 'paid' && (
                      <Btn size="sm" variant="success" onClick={() => markInstalment(inst.id, 'paid')}>Mark paid</Btn>
                    )}
                    {(user.role === 'accountant' || user.role === 'admin') && inst.status === 'upcoming' && (
                      <Btn size="sm" variant="danger" onClick={() => markInstalment(inst.id, 'overdue')}>Overdue</Btn>
                    )}
                  </div>
                ))}
              </div>

              {plan.note && (
                <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2 italic">📝 {plan.note}</div>
              )}

              {(user.role === 'director' || user.role === 'admin') && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Btn size="sm" variant="danger" onClick={() => revokePlan(plan.id)}>Revoke plan</Btn>
                </div>
              )}
            </Card>
          );
        })}

        {/* Create Plan Modal */}
        <Modal open={showForm} onClose={() => setShowForm(false)} title="Create payment plan" width="max-w-2xl">
          <Alert type="info">📅 This plan will be logged permanently. Accountant will be notified to track instalments.</Alert>
          <div className="space-y-4">
            <Field label="Select student" required>
              <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-forest-300">
                <option value="">— Select student with dues —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.class}-{s.section}) — Due: {inr(s.due)}</option>
                ))}
              </select>
            </Field>

            {selectedStudent && (
              <div className="bg-red-50 rounded-lg p-3 text-sm">
                <span className="text-gray-500">Balance due: </span>
                <span className="font-semibold text-red-600">{inr(selectedStudent.due)}</span>
                <span className="text-gray-400 ml-2">This will be split into instalments</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Number of instalments" required>
                <select value={form.num_instalments} onChange={e => setForm(f => ({ ...f, num_instalments: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300">
                  {[2, 3, 4, 6].map(n => <option key={n} value={n}>{n} instalments</option>)}
                </select>
              </Field>
              <Field label="First instalment date" required>
                <input type="date" value={form.first_due} onChange={e => setForm(f => ({ ...f, first_due: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
              </Field>
              <Field label="Final deadline" required>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
              </Field>
            </div>

            {generatedInstalments.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Generated instalment schedule</div>
                {generatedInstalments.map((inst, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-200 last:border-0">
                    <span className="text-gray-600">Instalment {inst.instalment_no}</span>
                    <span className="font-medium">{inr(inst.amount)}</span>
                    <span className="text-gray-400">{inst.due_date}</span>
                  </div>
                ))}
              </div>
            )}

            <Field label="Director note" required hint="Reason for granting time extension — logged permanently">
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                rows={3} placeholder="e.g. Parent requested time extension due to medical emergency. Committed to clear by deadline."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
            </Field>

            <div className="flex gap-2">
              <Btn variant="primary" onClick={submitPlan} disabled={submitting}>
                {submitting ? 'Creating…' : '📅 Create plan & notify accountant'}
              </Btn>
              <Btn onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
