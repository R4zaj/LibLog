import {
  Search, Sun, Bell, LayoutDashboard, Calendar, Clock, BookUp, UserCheck, PlusSquare,
  BarChart3, Users, BookOpen, AlertCircle, Bookmark, Armchair, ArrowRightLeft,
  Moon, LogIn, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import NotificationDropdown from '../components/NotificationDropdown';
import { useTheme } from '../components/ThemeContext';
import { clearSession, getDisplayName, getInitials, getUser } from '../auth';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(() => {
    try { return !localStorage.getItem('dashboard_cache'); } catch { return true; }
  });
  const defaultData = {
    totalTitles: 0,
    totalCopies: 0,
    totalBorrowed: 0,
    overdueCount: 0,
    studentsInside: 0,
    availableSlots: 40,
    capacity: 40,
    collectionTarget: 5000,
    avgVisitDuration: 0,
    unpaidAmount: 0,
    unpaidCount: 0,
    activeUsers: [],
    borrowsByProgram: [],
    popularBooks: [],
    recentActivity: []
  };
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem('dashboard_cache');
      return cached ? { ...defaultData, ...JSON.parse(cached) } : defaultData;
    } catch { return defaultData; }
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const containerRef = useRef(null);

  // Full Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [fullLog, setFullLog] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(false);

  const fetchFullLog = async () => {
    setIsLogModalOpen(true);
    setIsLoadingLog(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/dashboard/full-log`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) {
        const data = await res.json();
        setFullLog(data);
      }
    } catch (err) {
      console.error('Failed to fetch full log', err);
    } finally {
      setIsLoadingLog(false);
    }
  };

  useEffect(() => {
    const fetchData = () => {
      fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/dashboard/overview`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => {
          if (!res.ok) throw new Error(`Overview request failed: ${res.status}`);
          return res.json();
        })
        .then(json => {
          setData(prev => ({ ...prev, ...json }));
          setIsLoading(false);
          try { localStorage.setItem('dashboard_cache', JSON.stringify(json)); } catch { }
        })
        .catch(err => {
          console.error('Failed to fetch dashboard data:', err);
          setIsLoading(false);
        });
    };

    fetchData(); // initial fetch
    const dataTimer = setInterval(fetchData, 5000); // refresh every 5 seconds

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(dataTimer);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    const t1 = setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTop = 0;
    }, 100);
    const t2 = setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTop = 0;
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data]);

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const currentCapacity = data.capacity || 40;
  const capacityPercent = (data.studentsInside / currentCapacity) * 100;
  const currentCollectionTarget = data.collectionTarget || 5000;
  const collectionPercent = (data.totalCopies / currentCollectionTarget) * 100;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <header className="h-16 flex items-center justify-between px-8 bg-white/85 dark:bg-dark-card/85 backdrop-blur-md border-b border-gray-200/80 dark:border-dark-border/80 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-slate-400">
            <LayoutDashboard size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 dark:text-slate-200 leading-none">Dashboard</h1>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">Overview of library operations and statistics</span>
          </div>
        </div>
        <div className="flex items-center gap-4">

          <div className="flex items-center gap-3 border-l border-gray-200 dark:border-dark-border pl-4">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-primary-600"></div> Open
            </div>
            <button 
              id="theme-toggle-btn"
              onClick={toggleDarkMode} 
              aria-label="Toggle dark mode"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 relative p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
            >
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <NotificationDropdown />
            <div className="relative">
              <div
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all"
              >
                {getInitials()}
              </div>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border">
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-300">{getDisplayName()}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{getUser()?.email || ''}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 dark:bg-dark-bg flex items-center gap-2">
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div 
        ref={containerRef} 
        style={{ overflowAnchor: 'none' }}
        className="flex-1 overflow-y-auto w-full"
      >
        <div className="p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-b from-purple-500 to-purple-900 rounded-2xl p-6 lg:p-8 text-white flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shadow-lg border border-purple-400/20">

          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <img src="/CCC_icon.png" alt="CCC" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
              <span className="text-white text-sm font-medium">Good Evening</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-1 tracking-tight">Welcome to CCC LIB APP</h2>
            <p className="text-purple-200/80 text-sm">Your library management dashboard - everything at a glance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-white/10 dark:bg-dark-card/30 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 shadow-xs">
              <Calendar size={18} className="text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs lg:text-sm font-semibold text-white">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-[11px] text-white/80">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 dark:bg-dark-card/30 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 shadow-xs">
              <Clock size={18} className="text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs lg:text-sm font-semibold text-white">07:00 - 21:00</span>
                <span className="text-[11px] text-white/80">Library Hours</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 dark:bg-dark-card/30 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 shadow-xs">
              <Calendar size={18} className="text-white shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs lg:text-sm font-semibold text-white">132 days</span>
                <span className="text-[11px] text-white/80">Until Semester Ends</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-6">
          <div onClick={() => navigate('/borrowing')} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-t-4 border-t-orange-400 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
              <BookUp size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Check Out Book</h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Process a book return or borrow</span>
          </div>
          <div onClick={() => navigate('/attendance')} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-t-4 border-t-cyan-400 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-500 flex items-center justify-center mb-3">
              <UserCheck size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Scan Student</h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">QR code check-in or check-out</span>
          </div>
          <div onClick={() => navigate('/literatures')} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-t-4 border-t-primary-500 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
              <PlusSquare size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Add New Book</h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Add literature to the catalog</span>
          </div>
          <div onClick={() => navigate('/reports')} className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-t-4 border-t-blue-400 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
              <BarChart3 size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">View Reports</h3>
            <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">Generate analytics and reports</span>
          </div>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-5 gap-6">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-l-4 border-l-primary-600 p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Total Books</span>
            <span className="text-2xl font-bold text-gray-800 dark:text-slate-300 mb-2">{data.totalTitles}</span>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
              <span className="text-green-500 font-bold">↗</span> catalog size
            </div>
            <BookOpen className="absolute right-[-10px] bottom-[-10px] text-gray-50 opacity-50 dark:hidden" size={80} />
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-l-4 border-l-orange-400 p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Total Borrowed</span>
            <span className="text-2xl font-bold text-gray-800 dark:text-slate-300 mb-2">{data.totalBorrowed}</span>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
              <span className="text-orange-500 font-bold">●</span> active borrows
            </div>
            <ArrowRightLeft className="absolute right-[-10px] bottom-[-10px] text-gray-50 opacity-50 dark:hidden" size={80} />
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-l-4 border-l-cyan-400 p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Students Inside</span>
            <span className="text-2xl font-bold text-gray-800 dark:text-slate-300 mb-2">{data.studentsInside}</span>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
              <span className="text-cyan-500 font-bold">●</span> live count
            </div>
            <UserCheck className="absolute right-[-10px] bottom-[-10px] text-gray-50 opacity-50 dark:hidden" size={80} />
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-l-4 border-l-red-400 p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Available Slots</span>
            <span className="text-2xl font-bold text-gray-800 dark:text-slate-300 mb-2">{data.availableSlots}</span>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400">
              <span className="text-gray-400 dark:text-slate-500 font-bold">●</span> capacity remaining
            </div>
            <Armchair className="absolute right-[-10px] bottom-[-10px] text-gray-50 opacity-50 dark:hidden" size={80} />
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border border-l-4 border-l-red-600 p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium mb-1">Overdue Books</span>
            <span className="text-2xl font-bold text-red-600 mb-2">{data.overdueCount}</span>
            <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium mt-auto">
              <AlertCircle size={12} /> Needs attention
            </div>
          </div>
        </div>

        {/* Progress Bars Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-500 dark:text-slate-400" />
                <span className="font-bold text-gray-800 dark:text-slate-300 text-sm">Library Capacity</span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full">{capacityPercent}% Full</span>
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-slate-200">{data.studentsInside} <span className="text-xs font-normal text-gray-400 dark:text-slate-500">/ {currentCapacity} seats</span></div>
            </div>
            <div className="flex gap-1 h-3 w-full">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={`flex-1 rounded-full ${i < (capacityPercent / 10) ? 'bg-purple-600' : 'bg-gray-100'}`}></div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-medium text-gray-500 dark:text-slate-400">
              <span>0%</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-600"></div> Available</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Filling</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Critical</span>
              </div>
              <span>100%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-gray-500 dark:text-slate-400" />
                <span className="font-bold text-gray-800 dark:text-slate-300 text-sm">Book Collection Target</span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full">{Math.round(collectionPercent)}%</span>
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-slate-200">{data.totalCopies} <span className="text-xs font-normal text-gray-400 dark:text-slate-500">/ {currentCollectionTarget.toLocaleString()} copies</span></div>
            </div>
            <div className="h-3 w-full bg-purple-50 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: `${collectionPercent}%` }}></div>
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-medium text-gray-500 dark:text-slate-400">
              <span>Collection Progress</span>
              <span>{currentCollectionTarget.toLocaleString()} target</span>
            </div>
          </div>
        </div>

        {/* User Insights Row */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users size={16} className="text-gray-500 dark:text-slate-400" />
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">User Insights</h3>
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">Library usage patterns and top visitors</span>
          </div>

          <div className="grid grid-cols-4 gap-8">
            <div className="col-span-1 flex flex-col gap-3">
              <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Top Visitors</span>
              {data.activeUsers.slice(0, 3).map((user, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800 dark:text-slate-300">{user.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500">{user.visits} visits</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-span-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Peak Hours</span>
              <div className="h-16 flex items-end gap-1 px-2 border-b border-dashed border-gray-200 dark:border-dark-border pb-1">
                <div className="w-full bg-purple-100 rounded-t h-[20%]"></div>
                <div className="w-full bg-purple-300 rounded-t h-[60%]"></div>
                <div className="w-full bg-purple-500 rounded-t h-[100%] relative"><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-purple-700 whitespace-nowrap">Peak: 8:00</span></div>
                <div className="w-full bg-purple-300 rounded-t h-[40%]"></div>
                <div className="w-full bg-purple-200 rounded-t h-[30%]"></div>
              </div>
              <div className="flex justify-between text-[8px] text-gray-400 dark:text-slate-500 px-2 mt-1">
                <span>9</span><span>12</span><span>15</span><span>18</span>
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Avg Visit Duration</span>
              <span className="text-2xl font-bold text-gray-800 dark:text-slate-300">{data.avgVisitDuration || 0} <span className="text-sm font-medium text-gray-500 dark:text-slate-400">min</span></span>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-1">
                <span className="text-orange-500 font-bold">₱</span> {data.unpaidAmount?.toFixed(2) || '0.00'} unpaid penalties
              </span>
            </div>

            <div className="col-span-1 flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Alerts</span>
              <div className="bg-red-50 text-red-600 rounded p-2 flex items-center gap-2 text-xs font-bold border border-red-100">
                <AlertCircle size={14} /> {data.overdueCount} overdue books
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm mb-1 flex items-center gap-2"><BarChart3 size={16} /> Borrows by Program</h3>
            <span className="text-xs text-gray-400 dark:text-slate-500 mb-6">Distribution of borrowed books across academic programs</span>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-end mb-4">
                <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-purple-700"></div> Books Borrowed
                </span>
              </div>

              <div className="flex-1 flex items-end justify-around pb-6 border-b border-gray-200 dark:border-dark-border relative h-48">
                {/* Y Axis */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-400 dark:text-slate-500 w-4 pb-6">
                  <span>Max</span><span>...</span><span>0</span>
                </div>

                {/* Bars */}
                {data.borrowsByProgram.length === 0 ? (
                  <span className="text-xs text-gray-400 dark:text-slate-500 m-auto">No borrows yet</span>
                ) : data.borrowsByProgram.map((prog, idx) => {
                  const maxCount = Math.max(...data.borrowsByProgram.map(p => p.count), 1);
                  const heightPercent = (prog.count / maxCount) * 100;
                  return (
                    <div key={idx} className="w-12 bg-purple-700 rounded-t flex flex-col justify-end items-center relative group" style={{ height: `${heightPercent}%` }}>
                      <span className="absolute -bottom-6 text-[10px] font-medium text-gray-600 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis w-16 text-center">{prog.program}</span>
                      <span className="absolute -top-5 text-[10px] font-bold text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity">{prog.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 flex flex-col items-center">
            <div className="w-full flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm mb-1 flex items-center gap-2"><Bookmark size={16} className="text-orange-400" /> Popular Books</h3>
                <span className="text-xs text-gray-400 dark:text-slate-500">Most borrowed books in the library</span>
              </div>
            </div>

            <div className="relative w-64 h-64 flex items-center justify-center">
              {data.popularBooks.length === 0 ? (
                <span className="text-xs text-gray-400 dark:text-slate-500">No data available</span>
              ) : (
                <>
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="20" />
                    {(() => {
                      let currentOffset = 0;
                      const colors = ['#7e22ce', '#ef4444', '#f97316', '#06b6d4', '#22c55e'];
                      return data.popularBooks.map((pb, idx) => {
                        const dashVal = (pb.percentage / 100) * 251.2;
                        const el = <circle key={idx} cx="50" cy="50" r="40" fill="transparent" stroke={colors[idx % colors.length]} strokeWidth="20" strokeDasharray={`${dashVal} 251.2`} strokeDashoffset={-currentOffset} />;
                        currentOffset += dashVal;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-gray-800 dark:text-slate-300">{data.popularBooks.length}</span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Top Books</span>
                  </div>

                  {/* Labels */}
                  {(() => {
                    let cumulativePercent = 0;
                    return data.popularBooks.map((pb, idx) => {
                      const startPercent = cumulativePercent;
                      const endPercent = cumulativePercent + pb.percentage;
                      cumulativePercent += pb.percentage;

                      const midPercent = (startPercent + endPercent) / 2;
                      const angle = (midPercent / 100) * 2 * Math.PI;

                      const labelRadius = 52;
                      const x = 50 + labelRadius * Math.sin(angle);
                      const y = 50 - labelRadius * Math.cos(angle);

                      const colors = ['text-purple-700', 'text-red-500', 'text-orange-500', 'text-cyan-600', 'text-green-500'];

                      return (
                        <div
                          key={idx}
                          className={`absolute text-[10px] font-bold ${colors[idx % 5]} whitespace-nowrap`}
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: `translate(${x > 50 ? 5 : -105}%, ${y > 50 ? 5 : -105}%)`
                          }}
                        >
                          {pb.title.length > 12 ? pb.title.substring(0, 12) + '...' : pb.title} {pb.percentage}%
                        </div>
                      );
                    });
                  })()}
                </>
              )}
            </div>
            <button onClick={() => navigate('/literatures')} className="text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-primary-700 mt-4 flex items-center gap-1">
              <BookOpen size={12} /> View All Books →
            </button>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 flex flex-col">
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm mb-1 flex items-center gap-2"><UserCheck size={16} className="text-cyan-600" /> Currently Inside</h3>
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs text-gray-400 dark:text-slate-500">Students in the library now</span>
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full">{data.studentsInside} inside</span>
            </div>

            <div className="flex-1 flex flex-col">
              {!data.studentsCurrentlyInside || data.studentsCurrentlyInside.length === 0 ? (
                <div className="flex-1 border border-dashed border-gray-200 dark:border-dark-border rounded-lg flex flex-col items-center justify-center p-8 bg-gray-50/50">
                  <Users size={32} className="text-gray-300 mb-2" />
                  <span className="text-sm font-bold text-gray-600 dark:text-slate-300">Library is quiet right now</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 text-center mt-1">Students will appear here as they check in</span>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[220px] space-y-2 pr-1">
                  {data.studentsCurrentlyInside.map((student) => {
                    const initials = student.name
                      ? student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'ST';
                    const checkInTime = student.checked_in_at
                      ? new Date(student.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    return (
                      <div key={student.id} className="p-2.5 bg-gray-50/70 dark:bg-dark-bg/60 border border-gray-200/80 dark:border-dark-border rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-gray-900 dark:text-slate-100 truncate">{student.name}</span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-400 truncate">{student.student_id} • {student.program}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Inside
                          </span>
                          <span className="text-[9px] text-gray-400">{checkInTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-6 flex flex-col h-[300px]">
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm mb-1 flex items-center gap-2"><Activity size={16} className="text-purple-600" /> Recent Activity</h3>
                <span className="text-xs text-gray-400 dark:text-slate-500">Latest library events and transactions</span>
              </div>
              <button onClick={fetchFullLog} className="text-[10px] font-bold text-purple-700 hover:underline">View Full Log</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 relative">
              <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gray-200"></div>

              <div className="flex flex-col gap-5 relative z-10">
                {data.recentActivity.length === 0 ? (
                  <span className="text-xs text-gray-400 dark:text-slate-500 m-auto mt-10">No recent activity</span>
                ) : data.recentActivity.map((act) => (
                  <div key={act.id} className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full bg-white dark:bg-dark-card border flex items-center justify-center shrink-0 shadow-sm z-10 ${act.type === 'BORROW' ? 'border-orange-200' : 'border-gray-200 dark:border-dark-border'}`}>
                      {act.type === 'BORROW' ? <ArrowRightLeft size={14} className="text-orange-500" /> : <Activity size={14} className="text-gray-500 dark:text-slate-400" />}
                    </div>
                    <div className="flex flex-col flex-1 pb-2">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-gray-800 dark:text-slate-300">{act.user} <span className={`px-1.5 py-0.5 ml-1 text-[8px] rounded uppercase ${act.type === 'BORROW' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-100 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-dark-border'}`}>{act.type.replace('_', ' ')}</span></p>
                        <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1"><Clock size={10} /> {new Date(act.date).toLocaleDateString()}</span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">{act.user} {act.details}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Borrowed Slider Cards */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-yellow-500" />
            <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Top Borrowed</h3>
          </div>
          <span className="text-xs text-gray-400 dark:text-slate-500 -mt-2">Most popular titles</span>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {data.popularBooks.length === 0 ? (
              <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">No borrows recorded yet</span>
            ) : data.popularBooks.map((pb, idx) => (
              <div key={idx} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 min-w-[220px] shadow-sm flex flex-col hover:border-purple-300 transition-colors cursor-pointer">
                <div className="flex justify-between mb-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded">{pb.borrows}x</span>
                </div>
                <h4 className="font-bold text-gray-800 dark:text-slate-300 text-xs mb-1 line-clamp-1">{pb.title}</h4>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-1">{pb.author}</span>
                <span className="text-[9px] text-purple-600 font-bold mt-auto pt-2">{pb.genre}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-400 dark:text-slate-500 mt-4 pb-8 flex items-center justify-center gap-4">
          <span>Last updated: Just now • Auto-refreshes every 30s</span>
          <ArrowRightLeft size={10} className="animate-spin-slow" />
        </div>

        </div>
      </div>

      {/* Full Log Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-200 dark:border-dark-border w-full max-w-2xl flex flex-col max-h-[80vh] animate-slide-up">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dark-border shrink-0">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <Activity size={20} className="text-purple-600" /> Full Activity Log
              </h2>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-hover"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingLog ? (
                <div className="flex justify-center items-center h-40">
                  <ArrowRightLeft size={24} className="animate-spin text-purple-600" />
                </div>
              ) : fullLog.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-slate-400 py-10">No activities recorded yet.</div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gray-200 dark:bg-dark-border"></div>
                  <div className="flex flex-col gap-6 relative z-10">
                    {fullLog.map((act) => (
                      <div key={act.id} className="flex gap-4">
                        <div className={`w-8 h-8 rounded-full bg-white dark:bg-dark-card border flex items-center justify-center shrink-0 shadow-sm z-10 ${act.type === 'BORROW' ? 'border-orange-200' : 'border-gray-200 dark:border-dark-border'}`}>
                          {act.type === 'BORROW' ? <ArrowRightLeft size={14} className="text-orange-500" /> : <Activity size={14} className="text-gray-500 dark:text-slate-400" />}
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-gray-800 dark:text-slate-300">
                              {act.user}
                              <span className={`px-1.5 py-0.5 ml-2 text-[10px] rounded uppercase ${act.type === 'BORROW' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-gray-100 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-dark-border'}`}>
                                {act.type.replace('_', ' ')}
                              </span>
                            </p>
                            <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock size={12} /> {new Date(act.date).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-slate-400 mt-1">{act.user} {act.details}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex justify-end shrink-0 rounded-b-xl">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
