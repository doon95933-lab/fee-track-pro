import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifs(data);
      setUnread(data.filter(n => !n.is_read).length);
    } catch {}
  }, [user]);

  // Poll every 20 seconds for new notifications (free push simulation)
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.patch('/notifications/mark-all-read');
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  // Add a local notification instantly (optimistic UI after user action)
  const addLocal = (title, message, type = 'info') => {
    const n = { id: Date.now(), title, message, type, is_read: false, created_at: new Date().toISOString() };
    setNotifs(prev => [n, ...prev]);
    setUnread(prev => prev + 1);
  };

  return (
    <NotifContext.Provider value={{ notifs, unread, markRead, markAllRead, addLocal, fetchNotifs }}>
      {children}
    </NotifContext.Provider>
  );
}

export const useNotifs = () => useContext(NotifContext);
