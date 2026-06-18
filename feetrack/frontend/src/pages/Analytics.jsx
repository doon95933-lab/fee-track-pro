import React, { useState, useEffect } from 'react';
import api from '../api';
import Topbar from '../components/Topbar';
import { Metric, Card, Spinner, inr } from '../components/UI';
import toast from 'react-hot-toast';

function BarChart({ data, valueKey, labelKey, color = 'bg-forest-500' }) {
  const max = Math.max(...data.map(d => parseFloat(d[valueKey]) || 0));
  if (!max) return <div className="text-sm text-gray-400 text-center py-4">No data</div>;
  return (
    <div className="flex items-end gap-2 h-32 mt-2">
      {data.map((d, i) => {
        const pct = Math.round((parseFloat(d[valueKey]) / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="text-xs text-gray-500">{pct > 10 ? inr(d[valueKey]).replace('₹', '₹') : ''}</div>
            <div className={`w-full ${color} rounded-t`} style={{ height: `${Math.max(pct, 2)}%`, minHeight: 3 }} />
            <div className="text-xs text-gray-400 truncate w-full text-center">{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-1 flex flex-col"><Topbar title="Analytics" /><Spinner /></div>;

  const t = summary?.totals || {};
  const recoveryPct = t.total_fee ? Math.round((t.total_paid / t.total_fee) * 100) : 0;
  const byClass = summary?.byClass || [];
  const modes = summary?.modeBreakdown || [];
  const concs = summary?.concessions || [];
  const totalWaived = concs.filter(c => ['approved', 'waived'].includes(c.status)).reduce((a, c) => a + parseFloat(c.total_waived || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Analytics" />
      <div className="p-6">
        {/* Top metrics */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <Metric label="Total fee (year)" value={inr(t.total_fee)} color="blue" />
          <Metric label="Collected" value={inr(t.total_paid)} sub={`${recoveryPct}% recovery`} color="green" />
          <Metric label="Outstanding" value={inr(t.total_due)} color="red" />
          <Metric label="Total waived" value={inr(totalWaived)} color="purple" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* By class */}
          <Card title="Due amount by class">
            {byClass.length === 0
              ? <div className="text-sm text-gray-400 text-center py-4">No data — upload fee list first</div>
              : <BarChart data={byClass} valueKey="due" labelKey="label" color="bg-red-400" />
            }
          </Card>

          {/* Collection by class */}
          <Card title="Collection rate by class (%)">
            {byClass.length === 0
              ? <div className="text-sm text-gray-400 text-center py-4">No data</div>
              : (
                <div className="space-y-2 mt-1">
                  {byClass.map(c => {
                    const p = c.fee ? Math.round((c.paid / c.fee) * 100) : 0;
                    return (
                      <div key={c.label}>
                        <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                          <span className="font-medium">Class {c.label}</span>
                          <span>{p}% · {inr(c.paid)} collected</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${p >= 75 ? 'bg-forest-500' : p >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Payment modes */}
          <Card title="Payment modes">
            {modes.length === 0
              ? <div className="text-sm text-gray-400 text-center py-4">No payments yet</div>
              : modes.map(m => (
                <div key={m.mode} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xl">{m.mode === 'cash' ? '💵' : m.mode === 'online' ? '📱' : '🏦'}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{m.mode}</div>
                    <div className="text-xs text-gray-400">{m.count} payments</div>
                  </div>
                  <div className="text-sm font-semibold text-forest-700">{inr(m.total)}</div>
                </div>
              ))
            }
          </Card>

          {/* Student status */}
          <Card title="Student payment status">
            {[
              { label: 'Fully paid', value: t.fully_paid || 0, color: 'bg-forest-500' },
              { label: 'Partially paid', value: t.partial || 0, color: 'bg-amber-400' },
              { label: 'Not paid', value: t.unpaid || 0, color: 'bg-red-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`w-3 h-3 rounded-full ${s.color}`} />
                <div className="flex-1 text-sm text-gray-700">{s.label}</div>
                <div className="text-sm font-semibold text-gray-800">{s.value} students</div>
              </div>
            ))}
            <div className="pt-2 text-xs text-gray-400 text-center">Total: {t.total_students || 0} students</div>
          </Card>

          {/* Concession summary */}
          <Card title="Concession summary">
            {concs.length === 0
              ? <div className="text-sm text-gray-400 text-center py-4">No concession data</div>
              : concs.map(c => (
                <div key={c.status} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{c.status}</div>
                    <div className="text-xs text-gray-400">{c.count} requests</div>
                  </div>
                  {parseFloat(c.total_waived) > 0 && (
                    <div className="text-sm font-semibold text-purple-700">{inr(c.total_waived)}</div>
                  )}
                </div>
              ))
            }
          </Card>
        </div>
      </div>
    </div>
  );
}
