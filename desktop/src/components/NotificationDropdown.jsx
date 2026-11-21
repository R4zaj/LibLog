import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Activity, ArrowRightLeft, AlertCircle, Check, Loader2 } from 'lucide-react';

function formatTimeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'Just now';
}

const TAB_TO_CATEGORY = {
  All: null,
  Attendance: 'ATTENDANCE',
  Borrowing: 'BORROWING',
  Penalties: 'PENALTIES',
  System: 'SYSTEM'
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOverdue, setIsCheckingOverdue] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [statusNote, setStatusNote] = useState(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async (tabName = activeTab) => {
    const token = localStorage.getItem('token');
    if (!token) return; // Don't fetch if not logged in

    const category = TAB_TO_CATEGORY[tabName];
    const query = category ? `?category=${category}` : '';
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/notifications${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(await res.json());
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchNotifications(activeTab);
    const interval = setInterval(() => fetchNotifications(activeTab), 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    const category = TAB_TO_CATEGORY[activeTab];
    const query = category ? `?category=${category}` : '';
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/notifications/read-all${query}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      }
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const handleClearAll = async () => {
    if (isClearing) return;
    const category = TAB_TO_CATEGORY[activeTab];
    const query = category ? `?category=${category}` : '';
    setIsClearing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/notifications/clear${query}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setNotifications([]);
        setStatusNote(category ? `Cleared ${activeTab} notifications.` : 'Cleared all notifications.');
      }
    } catch (e) {
      console.error('Failed to clear notifications', e);
    } finally {
      setIsClearing(false);
    }
  };

  const getIconForCategory = (category) => {
    switch (category) {
      case 'ATTENDANCE': return { Icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' };
      case 'BORROWING': return { Icon: ArrowRightLeft, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' };
      case 'PENALTIES': return { Icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30' };
      default: return { Icon: Bell, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' };
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = activeTab === 'All' 
    ? notifications 
    : notifications.filter(n => {
      // Map tabs to categories
      if (activeTab === 'Attendance') return n.category === 'ATTENDANCE';
      if (activeTab === 'Borrowing') return n.category === 'BORROWING';
      if (activeTab === 'Penalties') return n.category === 'PENALTIES';
      if (activeTab === 'System') return n.category === 'SYSTEM';
      return true;
    });

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 relative p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-dark-card"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[400px] bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl z-50 flex flex-col max-h-[500px]">
          <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50/50 dark:bg-dark-bg rounded-t-xl">
            <h3 className="font-bold text-gray-800 dark:text-slate-200">Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
            <div className="flex gap-2">
              <button onClick={handleMarkAllAsRead} className="text-gray-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-500 flex items-center gap-1 text-xs font-medium">
                <Check size={14} /> Mark all read
              </button>
            </div>
          </div>
          
          <div className="flex gap-4 px-4 border-b border-gray-100 dark:border-dark-border text-sm font-medium">
            {['All', 'Attendance', 'Borrowing', 'Penalties', 'System'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 border-b-2 transition-colors ${activeTab === tab ? 'border-primary-600 dark:border-primary-500 text-primary-800 dark:text-primary-400 font-bold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {statusNote && (
              <div className="px-4 py-2 bg-primary-50/70 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800/40 flex items-center justify-between text-xs text-primary-800 dark:text-primary-300 font-medium">
                <span>{statusNote}</span>
                <button type="button" onClick={() => setStatusNote(null)} className="text-[11px] opacity-70 hover:opacity-100">Dismiss</button>
              </div>
            )}
            {isLoading && filtered.length === 0 ? (
              <div className="p-8 flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 text-sm">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm">No new notifications</div>
            ) : (
              filtered.map(n => {
                const { Icon, color, bg } = getIconForCategory(n.category);
                return (
                  <div 
                    key={n.id} 
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    className={`flex gap-4 p-4 border-b border-gray-50 dark:border-dark-border cursor-pointer transition-colors ${!n.is_read ? 'bg-primary-50/50 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-dark-hover'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-bold ${!n.is_read ? 'text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300'}`}>
                            {n.title}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${bg} ${color}`}>
                            {n.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0"></span>}
                          <span className="text-xs text-gray-400 dark:text-slate-500">{formatTimeAgo(n.created_at)}</span>
                        </div>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${!n.is_read ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-500 dark:text-slate-400'}`}>
                        {n.message}
                      </p>
                      {n.trigger_user && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-dark-bg/60 px-2 py-0.5 rounded border border-gray-100 dark:border-dark-border/50 w-fit">
                          <span className="font-semibold text-gray-700 dark:text-slate-300">User:</span>
                          <span>{n.trigger_user.first_name} {n.trigger_user.last_name}</span>
                          {n.trigger_user.student_id && <span className="text-gray-400 dark:text-slate-500">({n.trigger_user.student_id})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg rounded-b-xl flex gap-2">
            <button 
              type="button"
              disabled={isCheckingOverdue}
              onClick={async () => {
                if (isCheckingOverdue) return;
                setIsCheckingOverdue(true);
                setStatusNote(null);
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/check-overdue`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok) {
                    const scanned = data.scanned ?? 0;
                    const emails = data.emailsSent ?? 0;
                    setStatusNote(
                      scanned > 0
                        ? `Checked: ${scanned} overdue, ${emails} email(s) sent.`
                        : 'Check complete: No overdue books found.'
                    );
                    await fetchNotifications(activeTab);
                  } else {
                    setStatusNote(data.error || 'Overdue check failed.');
                  }
                } catch (e) {
                  console.error('Failed to run overdue check', e);
                  setStatusNote('Overdue check failed.');
                } finally {
                  setIsCheckingOverdue(false);
                }
              }}
              title="Scan and send overdue reminders"
              className="flex-1 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isCheckingOverdue ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
              <span>{isCheckingOverdue ? 'Checking...' : 'Check Overdue'}</span>
            </button>
            <button 
              type="button"
              disabled={isClearing}
              onClick={handleClearAll}
              className="py-1.5 px-3 text-xs font-semibold text-primary-700 dark:text-primary-400 hover:bg-primary-100/50 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-60"
            >
              {isClearing ? 'Clearing...' : 'Clear All'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
