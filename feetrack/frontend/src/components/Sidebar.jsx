import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifs } from '../context/NotifContext';

const NAV = {
  accountant: [
    { to: '/upload',    label: 'Upload due list',   icon: '⬆' },
    { to: '/ledger',    label: 'Fee ledger',         icon: '📋' },
    { to: '/payments',  label: 'Mark payment',       icon: '✅' },
    { to: '/receipts',  label: 'Receipts',           icon: '🧾' },
    { to: '/concessions', label: 'Concessions',      icon: '🏷' },
    { to: '/defaulters',  label: 'Defaulters',       icon: '⚠' },
    { to: '/audit',     label: 'Audit trail',        icon: '📜' },
    { to: '/analytics', label: 'Analytics',          icon: '📊' },
  ],
  director: [
    { to: '/dashboard', label: 'Dashboard',          icon: '🏠' },
    { to: '/approvals', label: 'Approvals',          icon: '🛡', badge: true },
    { to: '/plans',     label: 'Payment plans',      icon: '📅' },
    { to: '/ledger',    label: 'Fee ledger',         icon: '📋' },
    { to: '/concessions', label: 'Concessions',      icon: '🏷' },
    { to: '/defaulters',  label: 'Defaulters',       icon: '⚠' },
    { to: '/audit',     label: 'Audit trail',        icon: '📜' },
    { to: '/analytics', label: 'Analytics',          icon: '📊' },
    { to: '/users',     label: 'User management',    icon: '👥' },
  ],
  management: [
    { to: '/dashboard', label: 'Dashboard',          icon: '🏠' },
    { to: '/requests',  label: 'My requests',        icon: '📝' },
    { to: '/ledger',    label: 'Fee ledger',         icon: '📋' },
    { to: '/defaulters',label: 'Defaulters',         icon: '⚠' },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard',          icon: '🏠' },
    { to: '/upload',    label: 'Upload due list',    icon: '⬆' },
    { to: '/ledger',    label: 'Fee ledger',         icon: '📋' },
    { to: '/payments',  label: 'Mark payment',       icon: '✅' },
    { to: '/approvals', label: 'Approvals',          icon: '🛡', badge: true },
    { to: '/plans',     label: 'Payment plans',      icon: '📅' },
    { to: '/concessions', label: 'Concessions',      icon: '🏷' },
    { to: '/defaulters',  label: 'Defaulters',       icon: '⚠' },
    { to: '/audit',     label: 'Audit trail',        icon: '📜' },
    { to: '/analytics', label: 'Analytics',          icon: '📊' },
    { to: '/users',     label: 'User management',    icon: '👥' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unread } = useNotifs();
  const navigate = useNavigate();
  const items = NAV[user?.role] || [];
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside className="w-56 bg-forest-900 flex flex-col min-h-screen flex-shrink-0">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="text-forest-100 font-semibold text-sm">🏫 FeeTrack Pro</div>
        <div className="text-white/35 text-xs mt-0.5">School Fee Management</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-5 py-2.5 text-sm transition-all border-l-2
               ${isActive
                 ? 'text-forest-100 border-forest-400 bg-forest-600/20'
                 : 'text-white/50 border-transparent hover:text-white hover:bg-white/5'}`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && unread > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User box */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-forest-600 text-forest-100 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-white text-xs font-medium leading-tight">{user?.name}</div>
            <div className="text-white/35 text-xs capitalize">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full text-left text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
