import { useState, useEffect } from 'react';
import { 
  Search, Filter, BookOpen, Clock, AlertTriangle, ArrowRightLeft, 
  History, UserCheck, CalendarDays, BarChart, Download, GraduationCap, User, AlertCircle, TrendingUp, CheckCircle, Flame
} from 'lucide-react';
import { authHeaders } from '../auth';

export default function StudentActivities() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Analytics');

  useEffect(() => {
    fetchStudents();
  }, [searchQuery, selectedProgram, selectedStatus]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchDossier(selectedStudentId);
    } else {
      setDossier(null);
    }
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (searchQuery) q.append('search', searchQuery);
      if (selectedProgram !== 'All') q.append('program', selectedProgram);
      if (selectedStatus !== 'All') q.append('status', selectedStatus);
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/student-activities/students?${q.toString()}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        setStudents(await res.json());
      }
    } catch (e) {
      console.error('Error fetching students', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDossier = async (id) => {
    setDossierLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/student-activities/students/${id}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        setDossier(await res.json());
      }
    } catch (e) {
      console.error('Error fetching dossier', e);
    } finally {
      setDossierLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const exportStudentActivities = () => {
    if (!dossier) return;
    const { profile, timeline } = dossier;
    
    let csv = `Student Activity Report: ${profile.name} (${profile.student_id})\n`;
    csv += `Date,Time,Event Type,Description,Details\n`;
    
    timeline.forEach(t => {
      const date = new Date(t.date).toLocaleDateString();
      const time = new Date(t.date).toLocaleTimeString();
      csv += `"${date}","${time}","${t.type}","${t.title}","${t.subtitle}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Activity_Report_${profile.student_id}.csv`;
    link.click();
  };

  const renderStudentList = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin text-primary-600"><Clock size={24} /></div>
        </div>
      );
    }
    
    if (students.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
          <User size={32} className="mb-2 opacity-50" />
          <p className="text-sm">No students found matching your filters.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-1 px-3">
        {students.map(s => (
          <div 
            key={s.id} 
            onClick={() => setSelectedStudentId(s.id)}
            className={`p-3 rounded-xl cursor-pointer transition-all border ${
              selectedStudentId === s.id 
                ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' 
                : 'bg-white border-transparent hover:border-gray-200 dark:bg-dark-card dark:hover:border-dark-border'
            } flex items-center gap-3`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
              selectedStudentId === s.id ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-800 dark:bg-dark-bg dark:text-primary-400'
            }`}>
              {getInitials(s.name)}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <span className={`text-sm font-bold truncate ${selectedStudentId === s.id ? 'text-primary-900 dark:text-primary-300' : 'text-gray-900 dark:text-slate-200'}`}>
                {s.name}
              </span>
              <div className="flex flex-wrap gap-x-2 gap-y-1 items-center mt-0.5 text-[10px]">
                <span className="text-gray-500 font-medium">{s.student_id}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-dark-border"></span>
                <span className="text-primary-600 dark:text-primary-400 font-semibold">{s.program_code}</span>
              </div>
            </div>
            {s.activeBorrows > 0 && (
              <div className="shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                <BookOpen size={10} />
                <span>{s.activeBorrows}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDossierContent = () => {
    if (dossierLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full">
          <div className="animate-spin text-primary-600"><Clock size={32} /></div>
          <p className="mt-4 text-sm text-gray-500">Loading student dossier...</p>
        </div>
      );
    }
    
    if (!dossier) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center h-full text-center px-6">
          <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/10 flex items-center justify-center mb-6">
            <GraduationCap size={40} className="text-primary-300 dark:text-primary-700/50" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200 mb-2">Select a Student</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md">
            Click on a student from the directory to view their complete reading habits, borrowing history, attendance logs, and activity timeline.
          </p>
        </div>
      );
    }

    const { profile, stats, analytics, borrowHistory, attendanceHistory, timeline } = dossier;

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Profile Header */}
        <div className="p-6 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-dark-border shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
              {getInitials(profile.name)}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{profile.name}</h2>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                  profile.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {profile.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-600 dark:text-slate-400">
                <span className="font-semibold text-primary-700 dark:text-primary-400">{profile.student_id}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-dark-border"></span>
                <span>{profile.program}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-dark-border"></span>
                <span>{profile.year_level || 'N/A'}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-dark-border"></span>
                <span>{profile.email}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={exportStudentActivities}
            className="px-4 py-2 bg-white dark:bg-dark-hover border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 shadow-sm shrink-0"
          >
            <Download size={16} />
            Export Activities
          </button>
        </div>

        {/* 8 KPI Cards */}
        <div className="p-6 pb-2 grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Borrows</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeBorrows}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Completed Reads</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.returnedCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Overdue Borrows</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.overdueCount}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 flex items-center justify-center shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Visits</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalVisits}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Time in Library</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalTimeInLibrary > 60 ? `${(stats.totalTimeInLibrary/60).toFixed(1)}h` : `${stats.totalTimeInLibrary}m`}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Visit Streak</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.streak} Days</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">On-Time Return</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.returnPunctuality}%</p>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-100 dark:border-dark-border shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Unpaid Fines</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">₱{stats.unpaidPenalties.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mt-4 shrink-0">
          <div className="flex border-b border-gray-200 dark:border-dark-border gap-6">
            {['Analytics', 'Borrowing History', 'Attendance & Visits', 'Activity Timeline'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeTab === tab 
                    ? 'border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300' 
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'Analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <BarChart size={16} className="text-primary-500" />
                  Most Borrowed / Read Books
                </h3>
                {analytics.mostBorrowedBooks.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.mostBorrowedBooks.map((b, i) => (
                      <div key={b.book.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-100 dark:border-dark-border">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {i+1}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-gray-900 dark:text-slate-200 truncate">{b.book.title}</span>
                            <span className="text-[11px] text-gray-500">{b.book.author?.name} • {b.book.genre?.name}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{b.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-6 text-center">No borrowing history yet.</p>
                )}
              </div>
              
              <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <BookOpen size={16} className="text-primary-500" />
                  Favorite Reading Genres
                </h3>
                {analytics.topReadingGenres.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topReadingGenres.map(g => (
                      <div key={g.name} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-semibold text-gray-700 dark:text-slate-300">{g.name}</span>
                          <span className="text-gray-500 text-xs">{g.percentage}% ({g.count})</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 dark:bg-dark-bg rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500 rounded-full" 
                            style={{ width: `${g.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-6 text-center">No genres explored yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Borrowing History' && (
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-dark-border">
                      <th className="px-4 py-3 font-semibold">Book Info</th>
                      <th className="px-4 py-3 font-semibold">Borrow Date</th>
                      <th className="px-4 py-3 font-semibold">Due Date</th>
                      <th className="px-4 py-3 font-semibold">Return Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {borrowHistory.length > 0 ? borrowHistory.map(br => (
                      <tr key={br.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-slate-200">{br.book?.title}</span>
                            <span className="text-xs text-gray-500">{br.book?.isbn} • {br.book?.author?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                          {new Date(br.borrow_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                          {new Date(br.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
                          {br.return_date ? new Date(br.return_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                            br.status === 'BORROWED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            br.status === 'RETURNED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {br.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">No borrowing records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Attendance & Visits' && (
            <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-dark-border">
                      <th className="px-4 py-3 font-semibold">Date & Time</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                      <th className="px-4 py-3 font-semibold text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {attendanceHistory.length > 0 ? attendanceHistory.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-slate-200">
                          {new Date(log.logged_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 text-sm font-bold ${
                            log.action === 'CHECK_IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {log.action === 'CHECK_IN' ? <UserCheck size={14} /> : <History size={14} />}
                            {log.action === 'CHECK_IN' ? 'Logged In' : 'Logged Out'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-slate-300">
                          {log.duration_minutes ? `${log.duration_minutes} mins` : '-'}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500">No library visits recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Activity Timeline' && (
            <div className="max-w-3xl border-l-2 border-gray-200 dark:border-dark-border ml-4 pl-6 py-2 space-y-6">
              {timeline.length > 0 ? timeline.map(event => (
                <div key={event.id} className="relative">
                  {/* Timeline Node */}
                  <div className={`absolute -left-[35px] w-4 h-4 rounded-full border-4 border-white dark:border-dark-bg ${
                    event.type === 'CHECK_IN' ? 'bg-emerald-500' :
                    event.type === 'CHECK_OUT' ? 'bg-amber-500' :
                    event.type === 'BORROW' ? 'bg-blue-500' :
                    event.type === 'RETURN' ? 'bg-emerald-400' :
                    event.type === 'PENALTY' ? 'bg-red-500' :
                    'bg-primary-500'
                  }`}></div>
                  
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 uppercase mb-0.5">
                      {new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">{event.title}</h4>
                    {event.subtitle && <p className="text-xs text-gray-500 dark:text-slate-400">{event.subtitle}</p>}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 py-4">No activities found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-dark-bg overflow-hidden animate-fade-in">
      {/* Top Header */}
      <div className="h-20 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-6 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Student Activities
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium tracking-wide mt-1">
            Monitor reading habits, borrowing history, and library attendance.
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Filters & Student List */}
        <div className="w-80 bg-gray-50 dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border flex flex-col shrink-0 z-10">
          <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card flex flex-col gap-3 shrink-0">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search name or ID..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white transition-shadow"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <select 
                  value={selectedProgram}
                  onChange={e => setSelectedProgram(e.target.value)}
                  className="w-full appearance-none pl-8 pr-6 py-1.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-slate-200 font-medium"
                >
                  <option value="All">All Programs</option>
                  <option value="BSIT">BSIT</option>
                  <option value="BSBA">BSBA</option>
                  <option value="BSED">BSED</option>
                  <option value="BEED">BEED</option>
                </select>
                <Filter className="absolute left-2.5 top-2 text-gray-400" size={12} />
              </div>
              <div className="flex-1 relative">
                <select 
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className="w-full appearance-none pl-8 pr-6 py-1.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-slate-200 font-medium"
                >
                  <option value="All">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <AlertCircle className="absolute left-2.5 top-2 text-gray-400" size={12} />
              </div>
            </div>
          </div>
          
          {/* List Area */}
          {renderStudentList()}
        </div>

        {/* Right Panel: Dossier */}
        <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-dark-bg overflow-hidden relative">
          {renderDossierContent()}
        </div>
      </div>
    </div>
  );
}
