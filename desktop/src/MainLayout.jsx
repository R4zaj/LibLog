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
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import { AttendanceScannerProvider } from './context/AttendanceScannerContext';
import { BorrowingProvider } from './context/BorrowingContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useNetwork } from './contexts/NetworkContext';
import { clearSession, getDisplayName, getInitials, getRoleLabel } from './auth';
import { AlertCircle, X } from 'lucide-react';
import cccCrest from './assets/CCC_icon.png';

const NavItem = ({ to, icon: Icon, label, badge, subItems }) => {
  const location = useLocation();
  const isPathActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(isPathActive);

  // Sync expanded state with route changes
  useEffect(() => {
    setIsManuallyExpanded(isPathActive);
  }, [isPathActive]);

  const isExpanded = subItems ? isManuallyExpanded : false;
  const isMainActive = isPathActive && (!subItems || !isExpanded);
  const isSectionActive = isPathActive && subItems && isExpanded;

  const handleToggle = (e) => {
    if (subItems) {
      e.preventDefault();
      setIsManuallyExpanded(!isManuallyExpanded);
    }
  };

  return (
    <div className="flex flex-col mb-0.5">
      <NavLink
        to={to}
        end={to === '/'}
        onClick={subItems ? handleToggle : undefined}
        className={`group flex items-center justify-between h-[34px] px-3 rounded-md text-xs transition-colors ${
          isMainActive
            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-950 dark:text-primary-100 font-semibold'
            : isSectionActive
              ? 'bg-primary-50 dark:bg-dark-hover text-primary-900 dark:text-primary-200 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-hover hover:text-slate-900 dark:hover:text-slate-100 font-medium'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon
            size={16}
            className={`shrink-0 transition-colors ${
              isMainActive || isSectionActive
                ? 'text-primary-700 dark:text-primary-400'
                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
            }`}
          />
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
          {subItems && (
            <ChevronDown
              size={13}
              className={`transition-transform duration-150 ${
                isExpanded ? 'rotate-180' : ''
              } ${
                isMainActive || isSectionActive
                  ? 'text-primary-700 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
              }`}
            />
          )}
        </div>
      </NavLink>

      {subItems && isExpanded && (
        <div className="ml-7 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200 dark:border-dark-border pl-2.5 py-0.5">
          {subItems.map((sub, idx) => {
            const expectedSearch = '?' + sub.to.split('?')[1];
            const isSubActive = location.pathname.startsWith('/literatures') && (
              location.search === expectedSearch ||
              (!location.search && sub.to.includes('tab=catalog'))
            );

            return (
              <NavLink
                key={idx}
                to={sub.to}
                className={`group/sub flex items-center gap-2 h-7 px-2.5 rounded-md text-xs transition-colors ${
                  isSubActive
                    ? 'text-primary-950 dark:text-primary-100 font-semibold bg-primary-100 dark:bg-primary-900/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-dark-hover font-medium'
                }`}
              >
                <sub.icon
                  size={13}
                  className={`shrink-0 transition-colors ${
                    isSubActive
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-slate-400 dark:text-slate-500 group-hover/sub:text-slate-600 dark:group-hover/sub:text-slate-300'
                  }`}
                />
                <span className="truncate">{sub.label}</span>
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
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/dashboard/overview`, {
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

  const { isOnline, syncQueue, isSyncing, processSyncQueue, syncErrors, dismissSyncError } = useNetwork();

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const literaturesSubItems = [
    { to: '/literatures?tab=catalog', icon: BookCopy, label: 'Literature Catalog' },
    { to: '/literatures?tab=author', icon: BookA, label: 'Author Catalog' },
    { to: '/literatures?tab=genre', icon: BookKey, label: 'Genre Catalog' },
    { to: '/literatures?tab=qr', icon: QrCode, label: 'QR of Literatures' },
  ];

  return (
    <AttendanceScannerProvider>
    <BorrowingProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-[#0f0f12] font-sans text-slate-900 dark:text-slate-100">
      
      {/* Global Sync Error Notifications */}
      {syncErrors.length > 0 && (
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
          {syncErrors.map(error => (
            <div key={error.id} className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg shadow-lg flex items-start gap-3 w-80 animate-fade-in">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1">Offline Sync Failed</h4>
                <p className="text-xs opacity-90">{error.message}</p>
              </div>
              <button 
                onClick={() => dismissSyncError(error.id)}
                className="text-red-400 hover:text-red-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Collegiate Academic Sidebar */}
      <aside className="w-[260px] bg-sidebar-bg dark:bg-dark-sidebar border-r border-slate-200 dark:border-dark-border flex flex-col shadow-xs z-10 shrink-0 print:hidden">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-dark-border gap-3">
          <img src={cccCrest} alt="CCC Crest" className="w-9 h-9 object-contain shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">Calauan Community Campus</span>
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Library Workstation</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto pt-5 pb-4 px-3 flex flex-col gap-0.5 scrollbar-hide">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-1.5 px-3 tracking-normal">Navigation</span>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/literatures" icon={BookCopy} label="Literatures" subItems={literaturesSubItems} />
          <NavItem to="/borrowing" icon={ArrowRightLeft} label="Borrowing" badge={stats.overdue > 0 ? stats.overdue.toString() : null} />
          <NavItem to="/attendance" icon={UserCheck} label="Attendance" />
          <NavItem to="/student-activities" icon={GraduationCap} label="Student Activities" />
          <NavItem to="/reports" icon={BarChart3} label="Reports" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </div>

        {/* Bottom Section: Quick Stats & Profile */}
        <div className="p-3.5 border-t border-slate-200 dark:border-dark-border bg-sidebar-bg dark:bg-dark-sidebar flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-1 tracking-normal">Quick stats</span>
            <div className="grid grid-cols-3 gap-1 px-1 py-1.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
              <div className="flex flex-col items-center justify-center py-1">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{stats.inside}</span>
                <span className="text-[10px] text-slate-500 font-medium">Inside</span>
              </div>
              <div className="flex flex-col items-center justify-center py-1 border-x border-slate-200 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{stats.borrowed}</span>
                <span className="text-[10px] text-slate-500 font-medium">Borrowed</span>
              </div>
              <div className="flex flex-col items-center justify-center py-1">
                <span className={`text-sm font-bold tabular-nums ${stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>{stats.overdue}</span>
                <span className="text-[10px] text-slate-500 font-medium">Overdue</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Open for study</span>
              </div>
              <span className="tabular-nums font-medium">{stats.capacity - stats.inside} seats left</span>
            </div>
            
            {/* Network Status */}
            <div className={`mt-1 p-2 rounded-md border flex items-center justify-between transition-colors ${
              isOnline 
                ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800' 
                : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
            }`}>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi size={13} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <WifiOff size={13} className="text-amber-600 dark:text-amber-400" />
                )}
                <div className="flex flex-col">
                  <span className={`text-[10px] font-semibold ${isOnline ? 'text-slate-700 dark:text-slate-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {isOnline ? 'Connected' : 'Offline Mode'}
                  </span>
                  {syncQueue.length > 0 && (
                    <span className="text-[9px] text-slate-500 tabular-nums">
                      {syncQueue.length} pending sync{syncQueue.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              {isOnline && syncQueue.length > 0 && (
                <button 
                  onClick={processSyncQueue}
                  disabled={isSyncing}
                  className={`p-1.5 rounded-md ${isSyncing ? 'animate-spin text-slate-400' : 'text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800'} transition-colors`}
                  title="Sync Now"
                >
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
            
          </div>
          
          {/* Profile */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-dark-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                {getInitials()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{getDisplayName()}</span>
                <span className="text-[10px] text-slate-500 truncate">{getRoleLabel()}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0f0f12] text-slate-900 dark:text-slate-100 transition-colors">
        <div className="flex-1 flex flex-col overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
    </BorrowingProvider>
    </AttendanceScannerProvider>
  );
}
