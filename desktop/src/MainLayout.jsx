import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookCopy, 
  ArrowRightLeft, 
  UserCheck, 
  BarChart3, 
  Settings,
  BookA,
  BookKey,
  QrCode,
  LogOut,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { AttendanceScannerProvider } from './context/AttendanceScannerContext';
import { BorrowingProvider } from './context/BorrowingContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useNetwork } from './contexts/NetworkContext';

const NavItem = ({ to, icon: Icon, label, badge, subItems }) => {
  const location = useLocation();
  const isPathActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(isPathActive);

  // Update initial state if path changes
  useEffect(() => {
    if (isPathActive) {
      setIsManuallyExpanded(true);
    }
  }, [isPathActive]);

  const isExpanded = isManuallyExpanded;

  const handleToggle = (e) => {
    if (subItems) {
      e.preventDefault();
      setIsManuallyExpanded(!isManuallyExpanded);
    }
  };

  return (
    <div className="flex flex-col mb-1">
      <NavLink
        to={to}
        end={to === '/'}
        onClick={subItems ? handleToggle : undefined}
        className={({ isActive }) =>
          `flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${
            isActive || (isPathActive && !subItems)
              ? 'bg-primary-50 dark:bg-dark-hover text-primary-800 dark:text-primary-300 font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-white'
          }`
        }
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className={isExpanded ? 'text-primary-600' : 'text-gray-500'} />
          <span className="text-sm">{label}</span>
        </div>
        {badge && (
          <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {subItems && (
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        )}
      </NavLink>
      
      {subItems && isExpanded && (
        <div className="ml-9 mt-1 flex flex-col gap-1 border-l-2 border-gray-200 dark:border-dark-border pl-3">
          {subItems.map((sub, idx) => {
            // Fix: location.search includes the '?' (e.g. '?tab=author')
            const expectedSearch = '?' + sub.to.split('?')[1];
            const isSubActive = location.search === expectedSearch || (location.search === '' && sub.to.includes('tab=catalog') && location.pathname === '/literatures');
            
            return (
              <NavLink
                key={idx}
                to={sub.to}
                className={() =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isSubActive ? 'text-primary-700 dark:text-primary-300 font-bold bg-primary-50/50 dark:bg-dark-hover' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-dark-hover/50'
                  }`
                }
              >
                <sub.icon size={14} className={isSubActive ? 'text-primary-600' : 'text-gray-400'} />
                {sub.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function MainLayout() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ inside: 0, borrowed: 0, overdue: 0, capacity: 40 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!navigator.onLine) return; // Skip background fetch if offline
      try {
        const res = await fetch('http://localhost:5000/api/dashboard/overview', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats({
            inside: data.studentsInside || 0,
            borrowed: data.totalBorrowed || 0,
            overdue: data.overdueCount || 0,
            capacity: data.capacity || 40
          });
        }
      } catch (err) {
        // Silently ignore network errors to prevent console spam
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const { isOnline, syncQueue, isSyncing, processSyncQueue } = useNetwork();

  const literaturesSubItems = [
    { to: '/literatures?tab=catalog', icon: BookCopy, label: 'Literature Catalog' },
    { to: '/literatures?tab=author', icon: BookA, label: 'Author Catalog' },
    { to: '/literatures?tab=genre', icon: BookKey, label: 'Genre Catalog' },
    { to: '/literatures?tab=qr', icon: QrCode, label: 'QR of Literatures' },
  ];

  return (
    <AttendanceScannerProvider>
    <BorrowingProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-dark-bg font-sans text-gray-900 dark:text-slate-200">
      {/* Light Sidebar */}
      <aside className="w-64 bg-sidebar-bg dark:bg-dark-sidebar border-r border-gray-200 dark:border-dark-border flex flex-col shadow-sm z-10 shrink-0 print:hidden">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-dark-border gap-3">
          <div className="rounded-md shadow-sm overflow-hidden flex items-center justify-center w-8 h-8">
            <img src="/CCC_icon.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-primary-900 dark:text-primary-300 leading-tight">LibLog</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Library System</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1 scrollbar-hide">
          <span className="text-xs font-semibold text-gray-400 mb-2 px-2 tracking-wider">NAVIGATION</span>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/literatures" icon={BookCopy} label="Literatures" subItems={literaturesSubItems} />
          <NavItem to="/borrowing" icon={ArrowRightLeft} label="Borrowing" badge={stats.overdue > 0 ? stats.overdue.toString() : null} />
          <NavItem to="/attendance" icon={UserCheck} label="Attendance" />
          <NavItem to="/reports" icon={BarChart3} label="Reports" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </div>

        {/* Bottom Section: Quick Stats & Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-sidebar-bg dark:bg-dark-sidebar flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Stats</span>
            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col items-center">
                <UserCheck size={14} className="text-cyan-500 mb-1" />
                <span className="text-sm font-bold">{stats.inside}</span>
                <span className="text-[10px] text-gray-400">Inside</span>
              </div>
              <div className="flex flex-col items-center">
                <BookCopy size={14} className="text-yellow-500 mb-1" />
                <span className="text-sm font-bold">{stats.borrowed}</span>
                <span className="text-[10px] text-gray-400">Borrowed</span>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRightLeft size={14} className="text-red-500 mb-1" />
                <span className="text-sm font-bold">{stats.overdue}</span>
                <span className="text-[10px] text-gray-400">Overdue</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 px-2">
              <div className="w-2 h-2 rounded-full bg-primary-600"></div>
              <span>Open • {stats.capacity - stats.inside}/{stats.capacity} seats</span>
            </div>
            
            {/* Network Status */}
            <div className={`mt-3 p-2 rounded-lg border flex items-center justify-between transition-colors ${
              isOnline 
                ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' 
                : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30'
            }`}>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi size={14} className="text-green-600 dark:text-green-500" />
                ) : (
                  <WifiOff size={14} className="text-orange-600 dark:text-orange-500" />
                )}
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold ${isOnline ? 'text-green-700' : 'text-orange-700'}`}>
                    {isOnline ? 'System Online' : 'Offline Mode'}
                  </span>
                  {syncQueue.length > 0 && (
                    <span className="text-[9px] text-gray-500">
                      {syncQueue.length} pending sync{syncQueue.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {isOnline && syncQueue.length > 0 && (
                <button 
                  onClick={processSyncQueue}
                  disabled={isSyncing}
                  className={`p-1.5 rounded-full ${isSyncing ? 'animate-spin text-gray-400' : 'text-primary-600 hover:bg-primary-50'} transition-colors`}
                  title="Sync Now"
                >
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
            
          </div>
          
          {/* Profile */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-dark-border mt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs">
                AL
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Admin Librarian</span>
                <span className="text-[10px] text-gray-400">Admin Access</span>
              </div>
            </div>
            <button onClick={() => navigate('/login')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-dark-bg">
        <Outlet />
      </main>
    </div>
    </BorrowingProvider>
    </AttendanceScannerProvider>
  );
}
