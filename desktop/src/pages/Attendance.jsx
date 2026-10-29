import { 
  Search, Sun, Bell, Printer, UserCheck, LogIn, LogOut, Users, Clock, Maximize, CalendarDays, BarChart3, Moon, ArrowRightLeft
} from 'lucide-react';
import ScannerSim from '../components/ScannerSim';
import { useState, useEffect, useMemo, useContext } from 'react';
import NotificationDropdown from '../components/NotificationDropdown';
import { AttendanceScannerContext } from '../context/AttendanceScannerContext';
import { authHeaders } from '../auth';

export default function Attendance() {
  const [stats, setStats] = useState({ checkIns: 0, checkOuts: 0, insideNow: 0, avgDuration: 0, heatmapCounts: null });
  const [activeUsers, setActiveUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    isScanning: globalIsScanning, 
    setIsScanning: onStartScanner, 
    setPortalTarget,
    lastScan,
    handleScan: onScanGlobal,
    selectedDevice: globalSelectedDevice,
    setSelectedDevice: onSelectGlobalDevice
  } = useContext(AttendanceScannerContext);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);

  const fetchActiveUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/attendance/active`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setActiveUsers(data);
        }
      }
    } catch (e) {
      console.error('Error fetching active users:', e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/attendance/stats`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (Array.isArray(data.activeUsers)) {
          setActiveUsers(data.activeUsers);
        }
      } else if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
      }
    } catch (e) {
      console.error('Error fetching attendance stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchActiveUsers();
    // Auto-refresh every 15s to keep "Currently Inside" live
    const interval = setInterval(() => {
      fetchStats();
      fetchActiveUsers();
    }, 15000);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (lastScan) {
      fetchStats();
      fetchActiveUsers();
    }
  }, [lastScan]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const filteredActiveUsers = useMemo(() => {
    if (!searchQuery.trim()) return activeUsers;
    const q = searchQuery.toLowerCase();
    return activeUsers.filter(u => 
      (u.first_name && u.first_name.toLowerCase().includes(q)) ||
      (u.last_name && u.last_name.toLowerCase().includes(q)) ||
      (u.student_id && u.student_id.toLowerCase().includes(q)) ||
      (u.card_no && u.card_no.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  }, [activeUsers, searchQuery]);

  // handleScan is now managed by AttendanceScannerContext

  // Mock data for heatmap
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['7a', '8a', '9a', '10a', '11a', '12a', '1p', '2p', '3p', '4p', '5p', '6p'];
  
  // Calculate heatmap data based on actual logs from API
  const heatmapData = useMemo(() => {
    // If stats are not loaded yet, return an empty grid
    if (!stats.heatmapCounts) {
      return Array(7).fill().map(() => Array(12).fill({ count: 0, intensity: 0 }));
    }
    
    const counts = stats.heatmapCounts;
    let maxVal = 0;
    
    // Find the max value to normalize intensity (0-4)
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 12; c++) {
        if (counts[r][c] > maxVal) maxVal = counts[r][c];
      }
    }
    
    return counts.map(row => row.map(count => ({
      count,
      intensity: count > 0 && maxVal > 0 ? Math.ceil((count / maxVal) * 4) : 0
    })));
  }, [stats.heatmapCounts]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-slate-400">
            <UserCheck size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 dark:text-slate-200 leading-none">Attendance</h1>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">Monitor library visitor attendance</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-l border-gray-200 dark:border-dark-border pl-4">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-primary-600"></div> Open
            </div>
            <button onClick={toggleDarkMode} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 relative p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <NotificationDropdown />
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs ml-1 cursor-pointer">
              AL
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-16 py-8 flex flex-col gap-6 max-w-6xl mx-auto w-full pb-20">
        
        {/* Title and Print */}
        <div className="flex justify-between items-start border-b border-gray-300 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-300 flex items-center gap-2">
              <UserCheck size={24} className="text-gray-500 dark:text-slate-400" /> Attendance Tracking
            </h2>
            <span className="text-sm text-gray-500 dark:text-slate-400">Monitor student log-ins, occupancy, and daily attendance logs</span>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover dark:bg-dark-bg bg-white dark:bg-dark-card">
            <Printer size={16} /> Print
          </button>
        </div>

        {/* Scanner Area */}
        <div className="flex flex-col gap-4 relative">
          <ScannerSim 
            title="Scan Student QR Code"
            subtitle="Scan or enter QR code to log in/out"
            boxTitle="Student QR Scanner"
            prefix="CCC-"
            placeholder="2024-0001"
            helperText="Prefix: CCC- (preset) — 1st scan = in, 2nd = out"
            icon={Maximize}
            onSubmit={onScanGlobal}
            isGlobalScanner={true}
            globalIsScanning={globalIsScanning}
            onStartScanner={() => onStartScanner(true)}
            onStopScanner={() => onStartScanner(false)}
            setPortalTarget={setPortalTarget}
            globalSelectedDevice={globalSelectedDevice}
            onSelectGlobalDevice={onSelectGlobalDevice}
          />
          
          {lastScan && (
            <div className={`absolute top-4 right-4 p-4 rounded-lg border shadow-sm animate-fade-in w-72 ${lastScan.action === 'CHECK_IN' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${lastScan.action === 'CHECK_IN' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {lastScan.action === 'CHECK_IN' ? <LogIn size={20} /> : <LogOut size={20} />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-slate-200 text-sm">{lastScan.user}</p>
                  <p className={`text-xs font-semibold ${lastScan.action === 'CHECK_IN' ? 'text-green-700' : 'text-orange-700'}`}>
                    {lastScan.action === 'CHECK_IN' ? 'Logged In' : 'Logged Out'} • {lastScan.time}
                  </p>
                  {lastScan.duration && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Duration: {lastScan.duration} mins</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Today's Summary */}
        <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 text-purple-600 rounded">
              <BarChart3 size={16} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Today's Summary</h3>
              <span className="text-xs text-gray-500 dark:text-slate-400">Daily attendance overview</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <LogIn size={20} className="text-purple-600 dark:text-purple-400 mb-2" />
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-400 leading-none mb-1">{stats.checkIns}</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Logged In</span>
            </div>
            <div className="bg-cyan-50/50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <LogOut size={20} className="text-cyan-600 dark:text-cyan-400 mb-2" />
              <span className="text-2xl font-bold text-cyan-900 dark:text-cyan-400 leading-none mb-1">{stats.checkOuts}</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Logged Out</span>
            </div>
            <div className="bg-yellow-50/50 dark:bg-orange-900/10 border border-yellow-100 dark:border-orange-900/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <Users size={20} className="text-yellow-600 dark:text-orange-400 mb-2" />
              <span className="text-2xl font-bold text-yellow-900 dark:text-orange-400 leading-none mb-1">{stats.insideNow}</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Inside Now</span>
            </div>
            <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <Clock size={20} className="text-purple-600 dark:text-purple-400 mb-2" />
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-400 leading-none mb-1">{stats.avgDuration}m</span>
              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Avg Duration</span>
            </div>
          </div>
        </div>

        {/* Weekly Heatmap */}
        <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-100 text-purple-600 rounded">
              <CalendarDays size={16} />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Weekly Heatmap</h3>
              <span className="text-xs text-gray-500 dark:text-slate-400">Log-in density by day and hour</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header Row */}
              <div className="flex mb-2">
                <div className="w-10"></div>
                {hours.map(h => (
                  <div key={h} className="flex-1 text-center text-[10px] text-gray-400 dark:text-slate-500 font-medium">{h}</div>
                ))}
              </div>
              
              {/* Grid */}
              <div className="flex flex-col gap-1">
                {days.map((day, dIdx) => (
                  <div key={day} className="flex items-center">
                    <div className="w-10 text-[10px] text-gray-400 dark:text-slate-500 font-medium text-right pr-3">{day}</div>
                    <div className="flex-1 flex gap-1">
                      {hours.map((_, hIdx) => {
                        const cell = heatmapData[dIdx][hIdx];
                        const intensity = cell.intensity;
                        // Map intensity 0-4 to tailwind classes
                        let bgClass = 'bg-gray-50 dark:bg-transparent border border-transparent dark:border-white/5';
                        if (intensity === 1) bgClass = 'bg-purple-200 dark:bg-purple-900/40 border border-transparent dark:border-white/5';
                        if (intensity === 2) bgClass = 'bg-purple-400 dark:bg-purple-800/60 border border-transparent dark:border-white/5';
                        if (intensity === 3) bgClass = 'bg-purple-600 dark:bg-purple-700/80 border border-transparent dark:border-white/5';
                        if (intensity === 4) bgClass = 'bg-purple-800 dark:bg-purple-600 border border-transparent dark:border-white/5';
                        
                        return (
                          <div 
                            key={hIdx} 
                            className={`flex-1 h-6 rounded-sm ${bgClass} transition-colors`}
                            title={`${cell.count} log-in${cell.count !== 1 ? 's' : ''}`}
                          >
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-gray-50 dark:bg-transparent border border-transparent dark:border-white/5"></div>
                  <div className="w-3 h-3 rounded-sm bg-purple-200 dark:bg-purple-900/40 border border-transparent dark:border-white/5"></div>
                  <div className="w-3 h-3 rounded-sm bg-purple-400 dark:bg-purple-800/60 border border-transparent dark:border-white/5"></div>
                  <div className="w-3 h-3 rounded-sm bg-purple-600 dark:bg-purple-700/80 border border-transparent dark:border-white/5"></div>
                  <div className="w-3 h-3 rounded-sm bg-purple-800 dark:bg-purple-600 border border-transparent dark:border-white/5"></div>
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Split Row */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-purple-100 text-purple-600 rounded">
                <Users size={16} />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Library Capacity</h3>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">Current occupancy status</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-4">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-purple-900">{stats.insideNow}</span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400">Inside</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-orange-500">{40 - stats.insideNow}</span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400">Available</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-gray-800 dark:text-slate-300">40</span>
                <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400">Total</span>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <div className="flex justify-between text-[10px] font-bold text-gray-500 dark:text-slate-400">
                <span>Occupancy</span>
                <span>{Math.round((stats.insideNow / 40) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(stats.insideNow / 40) * 100}%` }}></div>
              </div>
            </div>
          </div>

          <div className="col-span-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 rounded-lg">
                  <LogIn size={18} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 dark:text-slate-200 text-base">Currently Inside</h3>
                    <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-bold rounded-full flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${activeUsers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                      {activeUsers.length} {activeUsers.length === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-400">Students present in the library right now</span>
                </div>
              </div>

              {activeUsers.length > 2 && (
                <div className="relative w-48">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inside..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              {activeUsers.length === 0 ? (
                <div className="border border-dashed border-gray-200 dark:border-dark-border rounded-lg flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-dark-bg/20 min-h-[160px]">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-center mb-3">
                    <Users size={20} className="text-gray-400 dark:text-slate-500" />
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-slate-300">No students inside</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 text-center mt-1">The library is currently empty. Scanned log-ins will appear here immediately.</span>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-72 space-y-2 pr-1">
                  {filteredActiveUsers.map((student) => {
                    const initials = ((student.first_name?.[0] || '') + (student.last_name?.[0] || '')).toUpperCase() || 'ST';
                    const checkInTime = student.checked_in_at
                      ? new Date(student.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    
                    const minutesInside = student.checked_in_at
                      ? Math.max(0, Math.round((Date.now() - new Date(student.checked_in_at).getTime()) / (1000 * 60)))
                      : 0;

                    return (
                      <div 
                        key={student.id} 
                        className="p-3 bg-white dark:bg-dark-bg/60 border border-gray-200 dark:border-dark-border hover:border-purple-300 dark:hover:border-purple-600/60 rounded-xl flex items-center justify-between gap-3 shadow-2xs transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-purple-100 dark:ring-purple-900/40">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-900 dark:text-slate-100 truncate">
                                {student.first_name} {student.last_name}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                {student.student_id || student.card_no || 'Student'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                              {student.department || 'General'} {student.year_level ? `• ${student.year_level}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Inside
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-400 flex items-center gap-1 mt-1">
                            <Clock size={11} /> In at {checkInTime} ({minutesInside}m)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredActiveUsers.length === 0 && searchQuery && (
                    <div className="text-center py-6 text-xs text-gray-400 dark:text-slate-500">
                      No matching students found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full Log Block */}
        <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-gray-50/50 border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-500 dark:text-slate-400 rounded">
                <Clock size={16} />
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Today's Full Log</h3>
                <span className="text-[10px] text-gray-500 dark:text-slate-400">All attendance records for today — {stats.checkIns + stats.checkOuts} total visits</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full">{stats.insideNow} Inside</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:text-slate-300 text-[10px] font-bold rounded-full">{stats.checkOuts} Outside</span>
              <button className="text-xs font-bold text-gray-700 hover:text-purple-600 ml-2">v Expand</button>
            </div>
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-400 dark:text-slate-500 mt-2 flex items-center justify-center gap-4">
          <span>Last updated: 5s ago • Auto-refreshes every 15s</span>
          <ArrowRightLeft size={10} className="animate-spin-slow" />
        </div>

      </div>
    </div>
  );
}
