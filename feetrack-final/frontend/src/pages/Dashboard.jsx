import React, { useState, useEffect } from 'react';
import api from '../api';
import Topbar from '../components/Topbar';
import { Metric, Card, Badge, ProgressBar, Spinner, inr } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [concessions, setConcessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/summary'),
      api.get('/concessions', { params: { status: 'pending' } }),
    ]).then(([s, c]) => {
      setSummary(s.data);
      setConcessions(c.data.slice(0, 3));
    }).catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-1 flex flex-col"><Topbar title="Dashboard" /><Spinner /></div>;

  const t = summary?.totals || {};
  const recoveryPct = t.total_fee ? Math.round((t.total_paid / t.total_fee) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Dashboard" />
      <div className="p-6">
        {/* Welcome */}
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-800">Welcome back, {user.name} 👋</h2>
          <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with fee collections today.</p>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Metric label="Total fee (2026-27)" value={inr(t.total_fee)} color="blue" />
          <Metric label="Collected" value={inr(t.total_paid)} sub={`${recoveryPct}% recovery`} color="green" trend={{ up: true, label: 'on track' }} />
          <Metric label="Outstanding dues" value={inr(t.total_due)} color="red" />
          <Metric label="Pending approvals" value={concessions.length} color="amber" sub="concession requests" />
        </div>

        {/* Student status breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Fully paid', value: t.fully_paid || 0, color: 'bg-forest-500', pct: t.total_students ? Math.round((t.fully_paid / t.total_students) * 100) : 0 },
            { label: 'Partially paid', value: t.partial || 0, color: 'bg-amber-500', pct: t.total_students ? Math.round((t.partial / t.total_students) * 100) : 0 },
            { label: 'Not paid at all', value: t.unpaid || 0, color: 'bg-red-500', pct: t.total_students ? Math.round((t.unpaid / t.total_students) * 100) : 0 },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{s.label}</span>
                <span className="text-lg font-semibold text-gray-800">{s.value}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
              </div>
              <div className="text-xs text-gray-400 mt-1">{s.pct}% of students</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Recovery by class */}
          <Card title="Fee recovery by class">
            {(summary?.byClass || []).slice(0, 6).map(c => {
              const p = c.fee ? Math.round((c.paid / c.fee) * 100) : 0;
              return (
                <div key={c.label} className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-medium">Class {c.label}</span>
                    <span>{inr(c.due)} due · {p}%</span>
                  </div>
                  <ProgressBar pct={p} />
                </div>
              );
            })}
            {!summary?.byClass?.length && <div className="text-sm text-gray-400 text-center py-4">No data — upload fee list first</div>}
          </Card>

          {/* Pending approvals */}
          <Card title="Urgent approvals needed" actions={
            (user.role === 'director' || user.role === 'admin') &&
            <button onClick={() => navigate('/approvals')} className="text-xs text-blue-600 hover:underline">View all →</button>
          }>
            {concessions.length === 0 && <div className="text-sm text-gray-400 text-center py-4">✅ No pending approvals</div>}
            {concessions.map(r => (
              <div key={r.id} className={`border rounded-lg p-3 mb-2 ${r.is_urgent ? 'border-l-4 border-l-red-400 border-gray-200' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">{r.student_name} <span className="text-xs text-gray-400">{r.class}-{r.section}</span></div>
                    <div className="text-xs text-gray-500 mt-0.5">By {r.requested_by_name} · {r.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-amber-700">{inr(r.waiver_requested)}</div>
                    {r.is_urgent && <Badge status="urgent">urgent</Badge>}
                  </div>
                </div>
              </div>
            ))}
            {(user.role === 'management') && concessions.length === 0 &&
              <button onClick={() => navigate('/requests')} className="text-xs text-blue-600 hover:underline mt-2 block">+ Raise new request</button>
            }
          </Card>
        </div>

        {/* Payment mode breakdown */}
        <Card title="Payment mode breakdown">
          <div className="grid grid-cols-3 gap-4">
            {(summary?.modeBreakdown || []).map(m => (
              <div key={m.mode} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl mb-1">{m.mode === 'cash' ? '💵' : m.mode === 'online' ? '📱' : '🏦'}</div>
                <div className="text-lg font-semibold text-gray-800">{inr(m.total)}</div>
                <div className="text-xs text-gray-500 mt-1 capitalize">{m.mode} · {m.count} payments</div>
              </div>
            ))}
            {!summary?.modeBreakdown?.length && <div className="col-span-3 text-sm text-gray-400 text-center py-4">No payments recorded yet</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
