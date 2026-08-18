import { useState, useRef, useEffect } from 'react';
import { Bell, Activity, ArrowRightLeft, DollarSign, Check, ExternalLink } from 'lucide-react';

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

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // Don't fetch if not logged in

    try {
      const res = await fetch(`http://${window.location.hostname}:5000/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(await res.json());
      } else if (res.status === 401 || res.status === 403) {
        // Token invalid/expired, could redirect or clear token here
        localStorage.removeItem('token');
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

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
      const res = await fetch(`http://${window.location.hostname}:5000/api/notifications/${id}/read`, {
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
    try {
      const res = await fetch(`http://${window.location.hostname}:5000/api/notifications/read-all`, {
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

  const getIconForCategory = (category) => {
    switch (category) {
      case 'ATTENDANCE': return { Icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' };
      case 'BORROWING': return { Icon: ArrowRightLeft, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' };
      case 'PENALTIES': return { Icon: DollarSign, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30' };
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
            {filtered.length === 0 ? (
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
                      <div className="flex justify-between items-start">
                        <p className="text-sm">
                          <span className={`font-bold ${!n.is_read ? 'text-gray-900 dark:text-slate-200' : 'text-gray-700 dark:text-slate-300'}`}>{n.title}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0"></span>}
                          <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">{formatTimeAgo(n.created_at)}</span>
                        </div>
                      </div>
                      <p className={`text-xs mt-0.5 line-clamp-2 ${!n.is_read ? 'text-gray-700 dark:text-slate-300 font-medium' : 'text-gray-500 dark:text-slate-400'}`}>{n.message}</p>
                      {n.trigger_user && (
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                          Triggered by {n.trigger_user.first_name} {n.trigger_user.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg rounded-b-xl">
            <button className="w-full py-2 text-primary-700 dark:text-primary-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-100/50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">
              <ExternalLink size={16} /> View All Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
