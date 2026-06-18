import React, { useState, useEffect } from 'react';
import api from '../api';
import Topbar from '../components/Topbar';
import { Card, Alert, Spinner, Empty, Btn } from '../components/UI';
import toast from 'react-hot-toast';

const ACTION_ICONS = {
  payment_recorded: { icon: '✅', color: 'bg-forest-50 text-forest-700' },
  fee_list_uploaded: { icon: '⬆️', color: 'bg-blue-50 text-blue-700' },
  concession_approved: { icon: '✔', color: 'bg-forest-50 text-forest-700' },
  concession_rejected: { icon: '✗', color: 'bg-red-50 text-red-700' },
  concession_waived: { icon: '🏷', color: 'bg-purple-50 text-purple-700' },
  concession_requested: { icon: '📝', color: 'bg-blue-50 text-blue-700' },
  payment_plan_created: { icon: '📅', color: 'bg-amber-50 text-amber-700' },
  payment_plan_revoked: { icon: '🗑', color: 'bg-red-50 text-red-700' },
};

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/audit', { params: filter ? { action: filter } : {} })
      .then(({ data }) => setLogs(data))
      .catch(() => toast.error('Failed to load audit trail'))
      .finally(() => setLoading(false));
  }, [filter]);

  const exportCSV = () => {
    const rows = [['Action', 'Performed By', 'Date & Time', 'Details']];
    logs.forEach(l => rows.push([l.action, l.performed_by_name || 'System', l.created_at, JSON.stringify(l.details || {})]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_trail.csv'; a.click();
    toast.success('Audit trail exported!');
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Audit Trail" />
      <div className="p-6">
        <Alert type="info">
          🔒 Read-only. Every action is permanently logged with name, timestamp and details. Cannot be deleted or modified by anyone.
        </Alert>

        <Card>
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All actions</option>
              <option value="payment">Payments</option>
              <option value="concession">Concessions</option>
              <option value="plan">Payment plans</option>
              <option value="upload">Uploads</option>
            </select>
            <Btn size="sm" onClick={exportCSV}>⬇ Export CSV</Btn>
          </div>

          {loading ? <Spinner /> : logs.length === 0 ? <Empty message="No audit entries yet" /> : (
            <div className="space-y-0">
              {logs.map(log => {
                const style = ACTION_ICONS[log.action] || { icon: '📋', color: 'bg-gray-50 text-gray-600' };
                const details = log.details || {};
                return (
                  <div key={log.id} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${style.color}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {log.performed_by_name || 'System'} · {new Date(log.created_at).toLocaleString('en-IN')}
                          </div>
                          {details.student && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              Student: {details.student}
                              {details.amount && ` · ₹${parseFloat(details.amount).toLocaleString('en-IN')}`}
                              {details.mode && ` via ${details.mode}`}
                              {details.receipt_no && ` · ${details.receipt_no}`}
                              {details.utr && ` · UTR: ${details.utr}`}
                              {details.note && ` · "${details.note}"`}
                            </div>
                          )}
                          {details.file && (
                            <div className="text-xs text-gray-400 mt-0.5">File: {details.file} · {details.count} students · {details.year}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
