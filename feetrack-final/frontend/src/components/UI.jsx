import React from 'react';

// ── Metric card ───────────────────────────────────────────────────────────────
export function Metric({ label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:  { bar: 'bg-blue-600',   text: 'text-blue-700' },
    green: { bar: 'bg-forest-600', text: 'text-forest-700' },
    red:   { bar: 'bg-red-700',    text: 'text-red-700' },
    amber: { bar: 'bg-amber-700',  text: 'text-amber-800' },
    purple:{ bar: 'bg-purple-600', text: 'text-purple-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl p-4 overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${c.bar}`} />
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${c.text}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      {trend && <div className={`text-xs mt-1 font-medium ${trend.up ? 'text-forest-600' : 'text-red-600'}`}>
        {trend.up ? '↑' : '↓'} {trend.label}
      </div>}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────
const BADGE = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-forest-50 text-forest-700',
  rejected: 'bg-red-100 text-red-700',
  waived:   'bg-purple-100 text-purple-700',
  paid:     'bg-forest-50 text-forest-700',
  partial:  'bg-blue-50 text-blue-700',
  overdue:  'bg-red-100 text-red-700',
  upcoming: 'bg-gray-100 text-gray-600',
  cash:     'bg-forest-50 text-forest-700',
  online:   'bg-blue-50 text-blue-700',
  cheque:   'bg-amber-50 text-amber-700',
  urgent:   'bg-red-100 text-red-700',
  info:     'bg-blue-50 text-blue-700',
  success:  'bg-forest-50 text-forest-700',
  warning:  'bg-amber-100 text-amber-800',
  danger:   'bg-red-100 text-red-700',
};

export function Badge({ status, children }) {
  const label = children || status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[status] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

// ── Alert box ─────────────────────────────────────────────────────────────────
export function Alert({ type = 'info', children }) {
  const styles = {
    info:    'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-forest-50 text-forest-800 border-forest-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger:  'bg-red-50 text-red-800 border-red-200',
  };
  return (
    <div className={`flex gap-2 p-3 rounded-lg border text-sm mb-3 ${styles[type]}`}>
      {children}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ title, actions, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 mb-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ variant = 'default', size = 'md', onClick, disabled, children, className = '' }) {
  const variants = {
    default: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
    primary: 'bg-forest-700 border-forest-700 text-forest-100 hover:bg-forest-900',
    success: 'bg-forest-600 border-forest-600 text-white hover:bg-forest-700',
    danger:  'bg-red-700 border-red-700 text-white hover:bg-red-800',
    warning: 'bg-amber-700 border-amber-700 text-white hover:bg-amber-800',
    info:    'bg-blue-600 border-blue-600 text-white hover:bg-blue-700',
    purple:  'bg-purple-600 border-purple-600 text-white hover:bg-purple-700',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full ${width} max-h-[90vh] overflow-y-auto`}
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Form field ────────────────────────────────────────────────────────────────
export function Field({ label, required, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ pct }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-forest-500 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-forest-200 border-t-forest-600 rounded-full animate-spin" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ message = 'No data found' }) {
  return <div className="text-center py-12 text-gray-400 text-sm">{message}</div>;
}

// ── Format helpers ────────────────────────────────────────────────────────────
export const inr = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN');
export const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
