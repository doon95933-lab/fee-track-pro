import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import { Metric, Card, Badge, Btn, Alert, Spinner, Empty, ProgressBar, inr } from '../components/UI';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Defaulters() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('due');

  useEffect(() => {
    api.get('/students').then(({ data }) => {
      setStudents(data.filter(s => parseFloat(s.due) > 0));
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.parent_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'due' ? parseFloat(b.due) - parseFloat(a.due) : a.name.localeCompare(b.name));

  const totalDue = filtered.reduce((a, s) => a + parseFloat(s.due), 0);
  const highDue = filtered.filter(s => parseFloat(s.due) > 20000);
  const noPay = filtered.filter(s => parseFloat(s.paid) === 0);

  const sendReminder = async (s) => {
    toast.success(`In-app reminder sent to ${s.parent_name} for ${s.name}`);
  };

  const exportCSV = () => {
    const rows = [['Student', 'Class', 'Parent', 'Phone', 'Total Fee', 'Paid', 'Due', 'Recovery%']];
    filtered.forEach(s => {
      const p = Math.round((parseFloat(s.paid) / parseFloat(s.total_fee)) * 100);
      rows.push([s.name, `${s.class}-${s.section}`, s.parent_name, s.phone, s.total_fee, s.paid, s.due, `${p}%`]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'defaulters.csv'; a.click();
    toast.success('Defaulters list exported!');
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Defaulter List" />
      <div className="p-6">
        <Alert type="warning">
          ⚠️ Students with pending dues. Willful defaulters (zero payment despite reminders) should be escalated after Director approval.
        </Alert>

        <div className="grid grid-cols-4 gap-3 mb-5">
          <Metric label="Total outstanding" value={inr(totalDue)} color="red" />
          <Metric label="Students with dues" value={filtered.length} color="amber" />
          <Metric label="High dues (>₹20k)" value={highDue.length} color="red" />
          <Metric label="No payment at all" value={noPay.length} color="red" />
        </div>

        <Card>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student or parent…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-forest-300" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="due">Sort by highest due</option>
              <option value="name">Sort by name</option>
            </select>
            <Btn size="sm" onClick={exportCSV}>⬇ Export CSV</Btn>
          </div>

          {loading ? <Spinner /> : filtered.length === 0 ? <Empty message="No defaulters found 🎉" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Student', 'Class', 'Parent · Phone', 'Total Fee', 'Paid', 'Due', 'Recovery', 'Actions'].map(h => (
                      <th key={h} className="text-left pb-2 text-xs font-medium text-gray-400 uppercase tracking-wide pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const p = Math.round((parseFloat(s.paid) / parseFloat(s.total_fee)) * 100);
                    const isHigh = parseFloat(s.due) > 20000;
                    const isZero = parseFloat(s.paid) === 0;
                    return (
                      <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isHigh ? 'bg-red-50/30' : ''}`}>
                        <td className="py-3 pr-3">
                          <div className="font-medium text-gray-800">{s.name}</div>
                          {isZero && <Badge status="danger" className="mt-0.5">no payment</Badge>}
                        </td>
                        <td className="py-3 pr-3 text-gray-500">{s.class}-{s.section}</td>
                        <td className="py-3 pr-3">
                          <div className="text-gray-700">{s.parent_name}</div>
                          <div className="text-xs text-gray-400">{s.phone}</div>
                        </td>
                        <td className="py-3 pr-3 text-gray-600">{inr(s.total_fee)}</td>
                        <td className="py-3 pr-3 text-forest-600">{inr(s.paid)}</td>
                        <td className="py-3 pr-3 font-semibold text-red-600">{inr(s.due)}</td>
                        <td className="py-3 pr-3">
                          <ProgressBar pct={p} />
                          <div className="text-xs text-gray-400 mt-0.5">{p}%</div>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1 flex-wrap">
                            <Btn size="sm" variant="info" onClick={() => sendReminder(s)}>🔔 Remind</Btn>
                            {(user.role === 'accountant' || user.role === 'admin') && (
                              <Btn size="sm" variant="success" onClick={() => navigate('/ledger')}>✅ Pay</Btn>
                            )}
                            {(user.role === 'director' || user.role === 'admin') && (
                              <Btn size="sm" variant="warning" onClick={() => navigate('/plans')}>📅 Plan</Btn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
