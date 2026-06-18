import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotifContext';
import Topbar from '../components/Topbar';
import { Metric, Badge, Card, Btn, Modal, Field, ProgressBar, Spinner, Empty, inr, pct } from '../components/UI';
import toast from 'react-hot-toast';

export default function Ledger() {
  const { user } = useAuth();
  const { addLocal } = useNotifs();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClass, setActiveClass] = useState('All');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState(null); // student obj
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), mode: '', utr_number: '', cheque_number: '', bank_name: '', remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeClass !== 'All') params.class = activeClass.split('-')[0];
      const { data } = await api.get('/students', { params });
      setStudents(data);
    } catch (e) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [activeClass]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    api.get('/students/classes/list').then(({ data }) => {
      setClasses([{ label: 'All' }, ...data]);
    }).catch(() => {});
  }, []);

  const filtered = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.parent_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFee  = filtered.reduce((a, s) => a + parseFloat(s.total_fee || 0), 0);
  const totalPaid = filtered.reduce((a, s) => a + parseFloat(s.paid || 0), 0);
  const totalDue  = filtered.reduce((a, s) => a + parseFloat(s.due || 0), 0);

  const openPayModal = (s) => {
    setPayModal(s);
    setPayForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), mode: '', utr_number: '', cheque_number: '', bank_name: '', remarks: '' });
  };

  const submitPayment = async () => {
    if (!payForm.amount || !payForm.mode) return toast.error('Amount and mode are required');
    if (payForm.mode === 'online' && !payForm.utr_number) return toast.error('UTR number is mandatory for online payments');
    if (payForm.mode === 'cheque' && !payForm.cheque_number) return toast.error('Cheque number is required');
    setSubmitting(true);
    try {
      const { data } = await api.post('/payments', { student_id: payModal.id, ...payForm });
      toast.success(`Payment recorded! Receipt: ${data.receipt_no}`);
      addLocal('Payment recorded', `₹${parseFloat(payForm.amount).toLocaleString('en-IN')} received for ${payModal.name}`, 'success');
      setPayModal(null);
      fetchStudents();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Fee Ledger" />
      <div className="p-6">
        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Metric label="Total fee" value={inr(totalFee)} color="blue" />
          <Metric label="Collected" value={inr(totalPaid)} sub={`${pct(totalPaid, totalFee)}% recovery`} color="green" />
          <Metric label="Outstanding" value={inr(totalDue)} color="red" />
          <Metric label="With dues" value={filtered.filter(s => parseFloat(s.due) > 0).length} sub="students" color="amber" />
        </div>

        <Card>
          {/* Class tabs */}
          <div className="flex gap-0 border-b border-gray-100 mb-4 overflow-x-auto -mx-5 px-5">
            {classes.map(c => (
              <button key={c.label}
                onClick={() => setActiveClass(c.label)}
                className={`px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                  ${activeClass === c.label ? 'text-blue-600 border-blue-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student or parent name…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-forest-300"
            />
          </div>

          {loading ? <Spinner /> : filtered.length === 0 ? <Empty message="No students found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Student', 'Class', 'Parent · Phone', 'Annual Fee', 'Paid', 'Due', 'Recovery', 'Status', user.role === 'accountant' || user.role === 'admin' ? 'Action' : ''].filter(Boolean).map(h => (
                      <th key={h} className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const p = pct(parseFloat(s.paid), parseFloat(s.total_fee));
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 pr-4 font-medium text-gray-800">{s.name}</td>
                        <td className="py-3 pr-4 text-gray-500">{s.class}-{s.section}</td>
                        <td className="py-3 pr-4">
                          <div className="text-gray-700">{s.parent_name}</div>
                          <div className="text-xs text-gray-400">{s.phone}</div>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{inr(s.total_fee)}</td>
                        <td className="py-3 pr-4 text-forest-600 font-medium">{inr(s.paid)}</td>
                        <td className="py-3 pr-4 text-red-600 font-semibold">{inr(s.due)}</td>
                        <td className="py-3 pr-4">
                          <ProgressBar pct={p} />
                          <div className="text-xs text-gray-400 mt-1">{p}%</div>
                        </td>
                        <td className="py-3 pr-4"><Badge status={s.status}>{s.status}</Badge></td>
                        {(user.role === 'accountant' || user.role === 'admin') && (
                          <td className="py-3">
                            {parseFloat(s.due) > 0 && (
                              <Btn variant="success" size="sm" onClick={() => openPayModal(s)}>
                                ✅ Mark paid
                              </Btn>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Record payment — ${payModal?.name}`}>
        {payModal && (
          <div className="space-y-4">
            {/* Student summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Total fee</span><span>{inr(payModal.total_fee)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Already paid</span><span className="text-forest-600">{inr(payModal.paid)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1"><span className="font-medium">Balance due</span><span className="font-semibold text-red-600">{inr(payModal.due)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount received (₹)" required>
                <input type="number" value={payForm.amount} max={parseFloat(payModal.due)}
                  onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
              </Field>
              <Field label="Payment date" required>
                <input type="date" value={payForm.payment_date}
                  onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
              </Field>
            </div>

            <Field label="Payment mode" required>
              <select value={payForm.mode} onChange={e => setPayForm(f => ({ ...f, mode: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300">
                <option value="">— Select mode —</option>
                <option value="cash">Cash</option>
                <option value="online">Online (UPI / NEFT / RTGS)</option>
                <option value="cheque">Cheque / DD</option>
              </select>
            </Field>

            {payForm.mode === 'online' && (
              <Field label="UTR / Transaction reference no." required hint="Mandatory for online payments — needed for reconciliation">
                <input value={payForm.utr_number} onChange={e => setPayForm(f => ({ ...f, utr_number: e.target.value }))}
                  placeholder="e.g. UTR4821993 or UPI ref no."
                  className="border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </Field>
            )}

            {payForm.mode === 'cheque' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cheque / DD number" required>
                  <input value={payForm.cheque_number} onChange={e => setPayForm(f => ({ ...f, cheque_number: e.target.value }))}
                    placeholder="e.g. 001234"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
                </Field>
                <Field label="Bank name">
                  <input value={payForm.bank_name} onChange={e => setPayForm(f => ({ ...f, bank_name: e.target.value }))}
                    placeholder="e.g. SBI"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
                </Field>
              </div>
            )}

            <Field label="Remarks">
              <input value={payForm.remarks} onChange={e => setPayForm(f => ({ ...f, remarks: e.target.value }))}
                placeholder="e.g. Partial — balance next month"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-300" />
            </Field>

            <div className="flex gap-2 pt-1">
              <Btn variant="success" onClick={submitPayment} disabled={submitting}>
                {submitting ? 'Saving…' : '✅ Confirm & generate receipt'}
              </Btn>
              <Btn onClick={() => setPayModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
