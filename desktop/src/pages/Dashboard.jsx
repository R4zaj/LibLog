import {
  Search, Sun, Bell, LayoutDashboard, Calendar, Clock, BookUp, UserCheck, PlusSquare,
  BarChart3, Users, BookOpen, AlertCircle, Bookmark, Armchair, ArrowRightLeft,
  Moon, LogIn, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import NotificationDropdown from '../components/NotificationDropdown';
import ProfileDropdown from '../components/ProfileDropdown';
import { useTheme } from '../components/ThemeContext';
import cccCrest from '../assets/CCC_icon.png';

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

  const currentCapacity = data.capacity || 40;
  const capacityPercent = (data.studentsInside / currentCapacity) * 100;
  const currentCollectionTarget = data.collectionTarget || 5000;
  const collectionPercent = (data.totalCopies / currentCollectionTarget) * 100;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <header className="h-16 flex items-center justify-between px-8 bg-white/95 dark:bg-dark-card/95 backdrop-blur-sm border-b border-slate-200/90 dark:border-slate-800 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
            <LayoutDashboard size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">Console Dashboard</h1>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Circulation, catalog metrics, and real-time occupancy</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Library Open</span>
            </div>
            <button 
              id="theme-toggle-btn"
              onClick={toggleDarkMode} 
              aria-label="Toggle dark mode"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 relative p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <NotificationDropdown />
            <ProfileDropdown />
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

        {/* Collegiate Operational Context Header */}
        <div className="bg-white dark:bg-dark-card rounded-xl p-6 text-slate-900 dark:text-slate-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shadow-2xs border border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <img src={cccCrest} alt="CCC Crest" className="w-12 h-12 object-contain shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wider text-primary-700 dark:text-primary-400 uppercase">CCC</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Library Services</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">Circulation & Reference Desk</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Academic workstation console and institutional ledger</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2">
              <Calendar size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2">
              <Clock size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">8:00 AM - 5:00 PM</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Regular Library Hours</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2">
              <Bookmark size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">1st Semester</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">A.Y. 2026-2027</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div 
            onClick={() => navigate('/borrowing')} 
            className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-orange-400 p-4.5 flex flex-col items-start text-left cursor-pointer hover:border-orange-300 dark:hover:border-orange-500 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-500 dark:text-orange-400 flex items-center justify-center transition-colors">
              <BookUp size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-3">Check Out Book</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Process circulation return or borrow</span>
            <span className="text-[11px] font-medium text-orange-600 dark:text-orange-400 mt-3 inline-flex items-center gap-1 group-hover:underline">
              Open Circulation Desk →
            </span>
          </div>

          <div 
            onClick={() => navigate('/attendance')} 
            className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-cyan-400 p-4.5 flex flex-col items-start text-left cursor-pointer hover:border-cyan-300 dark:hover:border-cyan-500 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 dark:text-cyan-400 flex items-center justify-center transition-colors">
              <UserCheck size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-3">Scan Student</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">QR attendance log-in or log-out</span>
            <span className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 mt-3 inline-flex items-center gap-1 group-hover:underline">
              Launch Attendance Scanner →
            </span>
          </div>

          <div 
            onClick={() => navigate('/literatures')} 
            className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-primary-500 p-4.5 flex flex-col items-start text-left cursor-pointer hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center transition-colors">
              <PlusSquare size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-3">Add New Book</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Accession literature into catalog</span>
            <span className="text-[11px] font-medium text-primary-700 dark:text-primary-400 mt-3 inline-flex items-center gap-1 group-hover:underline">
              Manage Catalog Entries →
            </span>
          </div>

          <div 
            onClick={() => navigate('/reports')} 
            className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-t-4 border-t-blue-400 p-4.5 flex flex-col items-start text-left cursor-pointer hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xs transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center transition-colors">
              <BarChart3 size={20} />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-3">View Reports</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Circulation statistics and analytics</span>
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-3 inline-flex items-center gap-1 group-hover:underline">
              Generate Institutional Summary →
            </span>
          </div>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-primary-600 p-4.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Titles</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums my-1">{data.totalTitles}</span>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{data.totalCopies}</span> physical copies registered
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-orange-400 p-4.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Borrowed</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums my-1">{data.totalBorrowed}</span>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{data.totalBorrowed}</span> items in circulation
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-cyan-400 p-4.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Students Inside</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums my-1">{data.studentsInside}</span>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block"></span>
              <span>Currently in library</span>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 p-4.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Available Slots</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums my-1">{data.availableSlots}</span>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{data.availableSlots}</span> of {currentCapacity} seats open
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-red-500 p-4.5 flex flex-col justify-between shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Overdue Books</span>
            <span className={`text-2xl font-bold tabular-nums my-1 ${data.overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
              {data.overdueCount}
            </span>
            <div className="text-[11px] font-medium">
              {data.overdueCount > 0 ? (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={12} /> Notice required
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">All accounts cleared</span>
              )}
            </div>
          </div>
        </div>

        {/* Institutional Progress Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col shadow-2xs">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-500 dark:text-slate-400" />
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Library Occupancy</span>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold tabular-nums rounded-md">
                  {Math.round(capacityPercent)}% Capacity
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {data.studentsInside} <span className="font-normal text-slate-500 dark:text-slate-400">/ {currentCapacity} seats</span>
              </div>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  capacityPercent > 90 ? 'bg-red-500' : capacityPercent > 70 ? 'bg-amber-500' : 'bg-emerald-600'
                }`} 
                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Reading room capacity</span>
              <span className="tabular-nums">{data.availableSlots} seats available</span>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col shadow-2xs">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-slate-500 dark:text-slate-400" />
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Collection Target</span>
                <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-[10px] font-semibold tabular-nums rounded-md">
                  {Math.round(collectionPercent)}% Met
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                {data.totalCopies} <span className="font-normal text-slate-500 dark:text-slate-400">/ {currentCollectionTarget.toLocaleString()} accessions</span>
              </div>
            </div>
            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary-700 rounded-full transition-all duration-300" style={{ width: `${Math.min(collectionPercent, 100)}%` }}></div>
            </div>
            <div className="flex justify-between mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Catalog volume acquisition</span>
              <span className="tabular-nums">{(currentCollectionTarget - data.totalCopies).toLocaleString()} copies remaining</span>
            </div>
          </div>
        </div>

        {/* User Insights Row */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-500 dark:text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">User Insights</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">Library utilization and patron circulation summary</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1 flex flex-col gap-2.5 border-r border-slate-100 dark:border-slate-800/80 pr-4">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-normal">Top Visitors</span>
              {data.activeUsers.length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 py-2">No visits logged yet</span>
              ) : data.activeUsers.slice(0, 3).map((user, i) => (
                <div key={i} className="flex gap-2.5 items-center">
                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-semibold tabular-nums shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</span>
                    <span className="text-[10px] text-slate-500 tabular-nums">{user.visits} visits recorded</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-span-1 flex flex-col gap-2 border-r border-slate-100 dark:border-slate-800/80 pr-4">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-normal">Peak Attendance</span>
              <div className="h-16 flex items-end gap-1 px-1 border-b border-slate-200 dark:border-slate-800 pb-1">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t h-[20%]"></div>
                <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-t h-[60%]"></div>
                <div className="w-full bg-primary-700 rounded-t h-[100%] relative">
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-primary-700 dark:text-primary-300 whitespace-nowrap">8:00 AM</span>
                </div>
                <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-t h-[40%]"></div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t h-[30%]"></div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 px-1 mt-0.5 tabular-nums">
                <span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span>
              </div>
            </div>

            <div className="col-span-1 flex flex-col gap-1 border-r border-slate-100 dark:border-slate-800/80 pr-4">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-normal">Average Visit</span>
              <div className="flex items-baseline gap-1 my-0.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{data.avgVisitDuration || 0}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">minutes</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span className="font-medium">₱{data.unpaidAmount?.toFixed(2) || '0.00'}</span> unpaid fees
              </span>
            </div>

            <div className="col-span-1 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-normal">Notice Status</span>
              {data.overdueCount > 0 ? (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg p-2.5 flex items-center gap-2 text-xs font-semibold border border-red-200 dark:border-red-900/40">
                  <AlertCircle size={15} className="shrink-0" />
                  <span className="tabular-nums">{data.overdueCount} overdue item{data.overdueCount > 1 ? 's' : ''} require action</span>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-lg p-2.5 flex items-center gap-2 text-xs font-semibold border border-emerald-200 dark:border-emerald-900/40">
                  <UserCheck size={15} className="shrink-0" />
                  <span>All borrowed books within due period</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Borrows by Academic Program */}
          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col shadow-2xs">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <BarChart3 size={16} className="text-slate-500 dark:text-slate-400" /> Borrows by Academic Program
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">Distribution across student degree curricula</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary-700 inline-block"></span>
                <span>Active Borrows</span>
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-end pt-4">
              <div className="flex items-end justify-around pb-6 border-b border-slate-200 dark:border-slate-800 relative h-48">
                {data.borrowsByProgram.length === 0 ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500 m-auto">No program borrow records logged yet</span>
                ) : data.borrowsByProgram.map((prog, idx) => {
                  const maxCount = Math.max(...data.borrowsByProgram.map(p => p.count), 1);
                  const heightPercent = Math.max((prog.count / maxCount) * 100, 8);
                  return (
                    <div key={idx} className="w-12 bg-primary-700 hover:bg-primary-800 rounded-t flex flex-col justify-end items-center relative group transition-colors" style={{ height: `${heightPercent}%` }}>
                      <span className="absolute -bottom-6 text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate w-16 text-center">
                        {prog.program}
                      </span>
                      <span className="absolute -top-5 text-[10px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {prog.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Popular Books Ranked Catalog Ledger */}
          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col shadow-2xs">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Bookmark size={16} className="text-slate-500 dark:text-slate-400" /> Popular Books Ledger
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">Highest circulation titles ranked by borrowing frequency</span>
              </div>
              <button 
                onClick={() => navigate('/literatures')} 
                className="text-xs font-medium text-primary-700 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Full Catalog</span>
                <span>→</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-between pt-1">
              {data.popularBooks.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 py-10">
                  No literature circulation recorded yet
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data.popularBooks.slice(0, 5).map((pb, idx) => {
                    const maxBorrows = Math.max(...data.popularBooks.map(b => b.borrows || 0), 1);
                    const borrowBarWidth = Math.min(Math.round(((pb.borrows || 0) / maxBorrows) * 100), 100);
                    return (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold tabular-nums shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                              {pb.title}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {pb.author}{pb.genre ? ` • ${pb.genre}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-primary-600 rounded-full" style={{ width: `${borrowBarWidth}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums min-w-[36px] text-right">
                            {pb.borrows}x
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Currently Inside */}
          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col shadow-2xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <UserCheck size={16} className="text-slate-500 dark:text-slate-400" /> Currently Inside
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">Live library patron roster</span>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold tabular-nums rounded-md">
                {data.studentsInside} active
              </span>
            </div>

            <div className="flex-1 flex flex-col">
              {!data.studentsCurrentlyInside || data.studentsCurrentlyInside.length === 0 ? (
                <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-900/20">
                  <Users size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Library is quiet right now</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-0.5">Students appear here as attendance QR codes are scanned</span>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[220px] space-y-1.5 pr-1">
                  {data.studentsCurrentlyInside.map((student) => {
                    const initials = student.name
                      ? student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'ST';
                    const checkInTime = student.checked_in_at
                      ? new Date(student.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    return (
                      <div key={student.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">{student.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{student.student_id} • {student.program}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Checked In
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono tabular-nums">{checkInTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[300px] shadow-2xs">
            <div className="flex justify-between items-start mb-4 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Activity size={16} className="text-slate-500 dark:text-slate-400" /> Recent Activity Log
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">Latest circulation events and transactions</span>
              </div>
              <button onClick={fetchFullLog} className="text-xs font-semibold text-primary-700 dark:text-primary-400 hover:underline">
                View Full Log
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 relative">
              <div className="absolute left-[13px] top-0 bottom-0 w-px bg-slate-200 dark:border-slate-800"></div>

              <div className="flex flex-col gap-4 relative z-10">
                {data.recentActivity.length === 0 ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500 m-auto mt-10">No recent activity logged</span>
                ) : data.recentActivity.map((act) => (
                  <div key={act.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-md bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs z-10">
                      {act.type === 'BORROW' ? (
                        <ArrowRightLeft size={13} className="text-primary-700 dark:text-primary-400" />
                      ) : (
                        <Activity size={13} className="text-slate-500 dark:text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 pb-1">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {act.user}
                          <span className="px-1.5 py-0.2 ml-1 text-[9px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                            {act.type === 'CHECK_IN' ? 'LOGGED IN' : act.type === 'CHECK_OUT' ? 'LOGGED OUT' : act.type.replace('_', ' ')}
                          </span>
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono tabular-nums">
                          <Clock size={10} /> {new Date(act.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{act.user} {act.details}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Borrowed Quick Cards */}
        <div className="flex flex-col gap-2.5 mt-1">
          <div className="flex items-center gap-2">
            <Bookmark size={15} className="text-slate-500 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">High Circulation Quick Reference</h3>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {data.popularBooks.length === 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">No borrows recorded yet</span>
            ) : data.popularBooks.map((pb, idx) => (
              <div key={idx} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-800 rounded-lg p-3 min-w-[210px] shadow-2xs flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="w-4.5 h-4.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold tabular-nums rounded">
                    {pb.borrows}x
                  </span>
                </div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs mb-0.5 line-clamp-1">{pb.title}</h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{pb.author}</span>
                <span className="text-[9px] text-primary-700 dark:text-primary-400 font-semibold mt-auto pt-2">{pb.genre}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2 pb-6 flex items-center justify-center gap-2 font-medium">
          <span>Official Workstation • Auto-synchronizes live records</span>
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
                                {act.type === 'CHECK_IN' ? 'LOGGED IN' : act.type === 'CHECK_OUT' ? 'LOGGED OUT' : act.type.replace('_', ' ')}
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
