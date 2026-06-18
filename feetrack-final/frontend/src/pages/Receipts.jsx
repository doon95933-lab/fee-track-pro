import React, { useState, useEffect } from 'react';
import api from '../api';
import Topbar from '../components/Topbar';
import { Card, Badge, Btn, Modal, Spinner, Empty, inr } from '../components/UI';
import toast from 'react-hot-toast';

export default function Receipts() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [viewReceipt, setViewReceipt] = useState(null);

  useEffect(() => {
    api.get('/payments').then(({ data }) => setPayments(data))
      .catch(() => toast.error('Failed to load receipts'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => {
    const matchSearch = !search || p.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.receipt_no?.toLowerCase().includes(search.toLowerCase()) ||
      p.utr_number?.toLowerCase().includes(search.toLowerCase());
    const matchMode = modeFilter === 'all' || p.mode === modeFilter;
    return matchSearch && matchMode;
  });

  const totalAmount = filtered.reduce((a, p) => a + parseFloat(p.amount), 0);

  const printReceipt = (p) => {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Receipt ${p.receipt_no}</title>
      <style>
        body{font-family:Arial,sans-serif;max-width:400px;margin:40px auto;padding:20px;border:2px solid #173404}
        h2{color:#173404;text-align:center;margin-bottom:4px}
        .sub{text-align:center;color:#666;font-size:13px;margin-bottom:20px}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px}
        .row:last-child{border-bottom:none}
        .label{color:#666}.value{font-weight:500}
        .total{background:#173404;color:#fff;padding:12px;border-radius:6px;display:flex;justify-content:space-between;margin-top:16px;font-size:16px;font-weight:600}
        .footer{text-align:center;font-size:11px;color:#999;margin-top:20px}
        .receipt-no{text-align:center;color:#185FA5;font-size:12px;font-weight:600;margin-bottom:16px}
      </style></head><body>
      <h2>🏫 FeeTrack Pro</h2>
      <div class="sub">School Fee Payment Receipt</div>
      <div class="receipt-no">${p.receipt_no}</div>
      <div class="row"><span class="label">Student</span><span class="value">${p.student_name}</span></div>
      <div class="row"><span class="label">Class</span><span class="value">${p.class}-${p.section}</span></div>
      <div class="row"><span class="label">Parent</span><span class="value">${p.parent_name}</span></div>
      <div class="row"><span class="label">Payment Date</span><span class="value">${p.payment_date?.slice(0,10)}</span></div>
      <div class="row"><span class="label">Payment Mode</span><span class="value" style="text-transform:capitalize">${p.mode}</span></div>
      ${p.utr_number ? `<div class="row"><span class="label">UTR / Ref No.</span><span class="value" style="font-family:monospace">${p.utr_number}</span></div>` : ''}
      ${p.cheque_number ? `<div class="row"><span class="label">Cheque No.</span><span class="value">${p.cheque_number}</span></div>` : ''}
      ${p.bank_name ? `<div class="row"><span class="label">Bank</span><span class="value">${p.bank_name}</span></div>` : ''}
      ${p.remarks ? `<div class="row"><span class="label">Remarks</span><span class="value">${p.remarks}</span></div>` : ''}
      <div class="row"><span class="label">Recorded by</span><span class="value">${p.recorded_by_name}</span></div>
      <div class="total"><span>Amount Paid</span><span>₹${parseFloat(p.amount).toLocaleString('en-IN')}</span></div>
      <div class="footer">This is a computer-generated receipt. No signature required.</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Payment Receipts" />
      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total receipts</div>
            <div className="text-2xl font-semibold text-gray-800">{filtered.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total amount</div>
            <div className="text-2xl font-semibold text-forest-700">{inr(totalAmount)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Online payments</div>
            <div className="text-2xl font-semibold text-blue-700">{payments.filter(p => p.mode === 'online').length}</div>
          </div>
        </div>

        <Card>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by student, receipt no, UTR…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-forest-300" />
            <select value={modeFilter} onChange={e => setModeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="all">All modes</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {loading ? <Spinner /> : filtered.length === 0 ? <Empty message="No receipts found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Receipt No.', 'Student', 'Class', 'Date', 'Amount', 'Mode', 'UTR / Ref', 'Recorded by', 'Action'].map(h => (
                      <th key={h} className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 pr-3 font-mono text-xs text-blue-600 font-medium">{p.receipt_no}</td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-gray-800">{p.student_name}</div>
                        <div className="text-xs text-gray-400">{p.parent_name}</div>
                      </td>
                      <td className="py-3 pr-3 text-gray-500">{p.class}-{p.section}</td>
                      <td className="py-3 pr-3 text-gray-600">{p.payment_date?.slice(0, 10)}</td>
                      <td className="py-3 pr-3 font-semibold text-forest-700">{inr(p.amount)}</td>
                      <td className="py-3 pr-3"><Badge status={p.mode}>{p.mode}</Badge></td>
                      <td className="py-3 pr-3 font-mono text-xs text-gray-500">{p.utr_number || p.cheque_number || '—'}</td>
                      <td className="py-3 pr-3 text-xs text-gray-500">{p.recorded_by_name}</td>
                      <td className="py-3">
                        <Btn size="sm" onClick={() => printReceipt(p)}>🖨 Print</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
