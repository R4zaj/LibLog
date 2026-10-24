import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Mail, KeyRound, AlertOctagon, Activity, CheckCheck, RefreshCw, 
  Copy, ExternalLink, Eye, Code2, Send, FileText, Check, Search, 
  Filter, Clock, BookOpen, ShieldCheck, ArrowRightLeft, DollarSign,
  Maximize2, Sparkles, Smartphone, Monitor
} from 'lucide-react';
import { getToken } from '../auth';
import {
  generateOtpEmailHtml,
  generateOtpEmailText,
  generateOverdueEmailHtml,
  generateOverdueEmailText
} from '../utils/emailTemplates';

function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export default function Notifications() {
  const [mainTab, setMainTab] = useState('templates'); // 'templates' | 'feed'
  
  // Template Studio States
  const [templateType, setTemplateType] = useState('otp'); // 'otp' | 'penalty'
  const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'html' | 'text'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // OTP Form States
  const [otpActionType, setOtpActionType] = useState('verify'); // 'verify' | 'reset'
  const [otpCode, setOtpCode] = useState('849201');
  const [otpStudentName, setOtpStudentName] = useState('Juan Dela Cruz');
  const [otpStudentEmail, setOtpStudentEmail] = useState('jdelacruz@calauan.edu.ph');

  // Penalty Form States
  const [penStudentName, setPenStudentName] = useState('Maria Santos');
  const [penStudentId, setPenStudentId] = useState('CCC-2023-0149');
  const [penStudentEmail, setPenStudentEmail] = useState('msantos@calauan.edu.ph');
  const [penBookTitle, setPenBookTitle] = useState('Data Structures and Algorithms in Java (4th Edition)');
  const [penBookAuthor, setPenBookAuthor] = useState('Robert Lafore');
  const [penDaysOverdue, setPenDaysOverdue] = useState(10);
  const [penDailyRate, setPenDailyRate] = useState(5.00);
  const [testSendStatus, setTestSendStatus] = useState({ loading: false, message: null, error: false });

  // Activity Feed States
  const [notifications, setNotifications] = useState([]);
  const [feedFilter, setFeedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedLoading, setFeedLoading] = useState(false);
  const [runningOverdueCheck, setRunningOverdueCheck] = useState(false);

  const calculatedPenaltyTotal = useMemo(() => {
    return (Math.max(0, parseInt(penDaysOverdue || 0, 10)) * parseFloat(penDailyRate || 0)).toFixed(2);
  }, [penDaysOverdue, penDailyRate]);

  // Generate Email Preview Instantly (Client-Side 0ms latency & 100% offline support)
  const previewData = useMemo(() => {
    if (templateType === 'otp') {
      const html = generateOtpEmailHtml({
        otp: otpCode,
        type: otpActionType,
        studentName: otpStudentName
      });
      const text = generateOtpEmailText({
        otp: otpCode,
        type: otpActionType,
        studentName: otpStudentName
      });
      return { html, text };
    } else {
      const user = {
        first_name: penStudentName.split(' ')[0] || 'Student',
        last_name: penStudentName.split(' ').slice(1).join(' ') || '',
        student_id: penStudentId,
        email: penStudentEmail
      };
      const book = {
        title: penBookTitle,
        author: { name: penBookAuthor }
      };
      const borrowDate = new Date();
      borrowDate.setDate(borrowDate.getDate() - (parseInt(penDaysOverdue || 0, 10) + 7));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - parseInt(penDaysOverdue || 0, 10));
      const record = {
        borrow_date: borrowDate.toISOString(),
        due_date: dueDate.toISOString()
      };
      const html = generateOverdueEmailHtml({
        user,
        book,
        record,
        daysOverdue: penDaysOverdue,
        penaltyAmount: calculatedPenaltyTotal,
        dailyRate: penDailyRate
      });
      const text = generateOverdueEmailText({
        user,
        book,
        record,
        daysOverdue: penDaysOverdue,
        penaltyAmount: calculatedPenaltyTotal,
        dailyRate: penDailyRate
      });
      return { html, text };
    }
  }, [
    templateType,
    otpCode,
    otpActionType,
    otpStudentName,
    penStudentName,
    penStudentId,
    penStudentEmail,
    penBookTitle,
    penBookAuthor,
    penDaysOverdue,
    penDailyRate,
    calculatedPenaltyTotal
  ]);

  const handleRefreshPreview = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 250);
  };

  const handleOpenFullWindow = () => {
    if (!previewData.html) return;
    const blob = new Blob([previewData.html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  };

  // Regenerate random 6-digit OTP
  const generateRandomOtp = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(randomCode);
  };

  // Fetch Activity Feed
  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      const token = getToken();
      if (!token) {
        setFeedLoading(false);
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        console.warn('Session expired or unauthorized for notifications feed');
      }
    } catch (err) {
      console.warn('Network offline or error fetching notification feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'feed') {
      fetchFeed();
    }
  }, [mainTab]);

  const handleCopyCode = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkAsRead = async (id) => {
    try {
      const token = getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      }
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const handleTriggerOverdueScan = async () => {
    setRunningOverdueCheck(true);
    try {
      const token = getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/check-overdue`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchFeed();
      }
    } catch (e) {
      console.error('Failed to run overdue scanner', e);
    } finally {
      setRunningOverdueCheck(false);
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesFilter = feedFilter === 'All' ? true :
        feedFilter === 'Attendance' ? n.category === 'ATTENDANCE' :
        feedFilter === 'Borrowing' ? n.category === 'BORROWING' :
        feedFilter === 'Penalties' ? n.category === 'PENALTIES' :
        feedFilter === 'System' ? n.category === 'SYSTEM' : true;
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        n.title?.toLowerCase().includes(q) || 
        n.message?.toLowerCase().includes(q) ||
        n.trigger_user?.first_name?.toLowerCase().includes(q) ||
        n.trigger_user?.last_name?.toLowerCase().includes(q) ||
        n.trigger_user?.student_id?.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [notifications, feedFilter, searchQuery]);

  const unreadFeedCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/60 dark:bg-dark-bg/60 p-4 md:p-6 gap-5 min-w-[760px]">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border rounded-xl px-6 py-4 shadow-xs shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Mail size={18} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              Communications and Notifications
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Calauan Community Campus Library: Automated Brevo email dispatch templates and operational activity logs
          </p>
        </div>

        {/* Top-Level Tabs & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-dark-hover p-1 rounded-lg border border-gray-200 dark:border-dark-border">
            <button
              onClick={() => setMainTab('templates')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                mainTab === 'templates'
                  ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <FileText size={14} />
              Email Templates UI
            </button>
            <button
              onClick={() => setMainTab('feed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 relative ${
                mainTab === 'feed'
                  ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity size={14} />
              System Activity Feed
              {unreadFeedCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              )}
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200 dark:border-dark-border hidden md:block" />

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Brevo Engine Active</span>
          </div>
        </div>
      </div>

      {/* Main Tab 1: Email Notification Templates Studio */}
      {mainTab === 'templates' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-visible lg:overflow-hidden">
          
          {/* Left Column: Template Configurator (5 cols) */}
          <div className="lg:col-span-5 flex flex-col bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border rounded-xl shadow-xs overflow-hidden min-h-[460px] lg:min-h-0">
            
            {/* Header & Template Selector */}
            <div className="p-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50">
              <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-slate-500 block mb-2">
                Select Email Template
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTemplateType('otp')}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                    templateType === 'otp'
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 text-sky-950 dark:text-sky-200 shadow-xs'
                      : 'border-gray-200 dark:border-dark-border hover:bg-gray-100/50 dark:hover:bg-dark-hover text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className={templateType === 'otp' ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400'} />
                    <span className="font-bold text-xs">Steam Guard OTP</span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
                    High contrast dark theme with electric blue code box
                  </span>
                </button>

                <button
                  onClick={() => setTemplateType('penalty')}
                  className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                    templateType === 'penalty'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 shadow-xs'
                      : 'border-gray-200 dark:border-dark-border hover:bg-gray-100/50 dark:hover:bg-dark-hover text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertOctagon size={16} className={templateType === 'penalty' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'} />
                    <span className="font-bold text-xs">Overdue Notice</span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
                    Antislop circulation fine alert and return guide
                  </span>
                </button>
              </div>
            </div>

            {/* Template Specific Form Controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Form for Steam Guard OTP */}
              {templateType === 'otp' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                      Authentication Purpose
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOtpActionType('verify')}
                        className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all ${
                          otpActionType === 'verify'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-dark-hover'
                        }`}
                      >
                        Account Verification
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpActionType('reset')}
                        className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-all ${
                          otpActionType === 'reset'
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-dark-hover'
                        }`}
                      >
                        Password Reset
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                        Generated Security Code
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomOtp}
                        className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw size={11} /> Random Code
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 text-base font-mono font-bold tracking-widest text-center rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                      Recipient Student Name
                    </label>
                    <input
                      type="text"
                      value={otpStudentName}
                      onChange={(e) => setOtpStudentName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      value={otpStudentEmail}
                      onChange={(e) => setOtpStudentEmail(e.target.value)}
                      placeholder="e.g. jdelacruz@calauan.edu.ph"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  {/* Specification Reference Box */}
                  <div className="p-3 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-[11px] text-sky-900 dark:text-sky-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-sky-600 dark:text-sky-400" /> Steam Guard Specifications
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-gray-600 dark:text-slate-400">
                      <li>Deep slate background (#171a21) with card border (#2a3f5a)</li>
                      <li>Electric blue monospace code box (#0d1217 container, #38bdf8 font)</li>
                      <li>Strict 10-minute expiry warning and security reminder</li>
                      <li>Calauan Community Campus institutional branding</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Form for Antislop Overdue Penalty Notice */}
              {templateType === 'penalty' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                        Student Name
                      </label>
                      <input
                        type="text"
                        value={penStudentName}
                        onChange={(e) => setPenStudentName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={penStudentId}
                        onChange={(e) => setPenStudentId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                      Borrowed Book Title
                    </label>
                    <input
                      type="text"
                      value={penBookTitle}
                      onChange={(e) => setPenBookTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                        Author
                      </label>
                      <input
                        type="text"
                        value={penBookAuthor}
                        onChange={(e) => setPenBookAuthor(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                        Days Overdue
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={penDaysOverdue}
                        onChange={(e) => setPenDaysOverdue(Math.max(1, parseInt(e.target.value || 1, 10)))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-slate-300 block mb-1.5">
                        Daily Rate (PHP)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={penDailyRate}
                        onChange={(e) => setPenDailyRate(parseFloat(e.target.value || 0))}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div className="pt-5">
                      <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase block">Accrued Fine</span>
                        <span className="text-base font-extrabold text-rose-700 dark:text-rose-300 font-mono">
                          ₱{calculatedPenaltyTotal}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Antislop Design Reference Box */}
                  <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-[11px] text-rose-900 dark:text-rose-300 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertOctagon size={13} className="text-rose-600 dark:text-rose-400" /> Antislop Design Standards
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 text-gray-600 dark:text-slate-400">
                      <li>Strictly zero em dashes: clean punctuation only</li>
                      <li>High contrast focal card displaying total penalty and duration</li>
                      <li>Itemized loan details table with clean tabular alignment</li>
                      <li>Direct return guidelines for Calauan Community Campus circulation desk</li>
                    </ul>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRefreshPreview}
                disabled={isRefreshing}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh Preview
              </button>

              <button
                type="button"
                onClick={handleOpenFullWindow}
                className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ExternalLink size={13} />
                Open Full Window
              </button>
            </div>

          </div>

          {/* Right Column: Visual Preview / Code Studio (7 cols) */}
          <div className="lg:col-span-7 flex flex-col bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border rounded-xl shadow-xs overflow-hidden min-h-[520px] lg:min-h-0">
            
            {/* View Mode Switcher Header */}
            <div className="p-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-dark-hover p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === 'preview'
                      ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Eye size={13} />
                  Visual Client Preview
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('html')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === 'html'
                      ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Code2 size={13} />
                  HTML Source
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    viewMode === 'text'
                      ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText size={13} />
                  Plaintext
                </button>
              </div>

              {/* Viewport and Copy Controls */}
              <div className="flex items-center gap-2">
                {viewMode === 'preview' && (
                  <div className="flex items-center bg-gray-200/70 dark:bg-dark-hover p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      title="Desktop view (600px width)"
                      className={`p-1.5 rounded-md transition-colors ${
                        previewDevice === 'desktop'
                          ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-slate-400'
                      }`}
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      title="Mobile view (380px width)"
                      className={`p-1.5 rounded-md transition-colors ${
                        previewDevice === 'mobile'
                          ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-slate-400'
                      }`}
                    >
                      <Smartphone size={14} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleCopyCode(viewMode === 'text' ? previewData.text : previewData.html)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Email Metadata Simulation Header */}
            <div className="px-4 py-2.5 bg-gray-100/70 dark:bg-dark-bg/80 border-b border-gray-200/60 dark:border-dark-border text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-400 dark:text-slate-500 w-14">From:</span>
                <span className="font-medium text-gray-800 dark:text-slate-200">
                  Calauan Community Campus Library &lt;noreply@liblog.com&gt;
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-400 dark:text-slate-500 w-14">To:</span>
                <span className="font-mono text-gray-700 dark:text-slate-300">
                  {templateType === 'otp' ? otpStudentEmail : penStudentEmail}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-400 dark:text-slate-500 w-14">Subject:</span>
                <span className="font-bold text-gray-900 dark:text-slate-100">
                  {templateType === 'otp'
                    ? (otpActionType === 'reset'
                        ? `[Security] Password Reset Code: ${otpCode} - Calauan Community Campus Library`
                        : `[Verification] Your Verification Code: ${otpCode} - Calauan Community Campus Library`)
                    : `[Overdue Notice] Please Return "${penBookTitle}" - Calauan Community Campus Library`
                  }
                </span>
              </div>
            </div>

            {/* Content Display Area */}
            <div className="flex-1 min-h-0 bg-slate-900 p-4 overflow-auto flex items-center justify-center">
              
              {/* Visual Preview Mode */}
              {viewMode === 'preview' && (
                <div 
                  className={`h-full transition-all duration-200 shadow-2xl rounded-lg overflow-hidden bg-[#171a21] border border-slate-700 ${
                    previewDevice === 'mobile' ? 'w-[380px]' : 'w-full max-w-[620px]'
                  }`}
                >
                  <iframe
                    title="Email Template Live Preview"
                    srcDoc={previewData.html}
                    className="w-full h-full border-0 bg-[#171a21]"
                    sandbox="allow-same-origin"
                  />
                </div>
              )}

              {/* HTML Source Code Mode */}
              {viewMode === 'html' && (
                <pre className="w-full h-full p-4 text-xs font-mono text-sky-300 bg-[#0d1217] rounded-lg border border-slate-800 overflow-auto whitespace-pre leading-relaxed select-all">
                  {previewData.html || '<!-- Generating HTML... -->'}
                </pre>
              )}

              {/* Plaintext Mode */}
              {viewMode === 'text' && (
                <pre className="w-full h-full p-4 text-xs font-mono text-gray-300 bg-[#0d1217] rounded-lg border border-slate-800 overflow-auto whitespace-pre-wrap leading-relaxed select-all">
                  {previewData.text || 'Generating plaintext fallback...'}
                </pre>
              )}

            </div>

          </div>

        </div>
      )}

      {/* Main Tab 2: System Activity Feed */}
      {mainTab === 'feed' && (
        <div className="flex-1 flex flex-col bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border rounded-xl shadow-xs overflow-hidden min-h-0">
          
          {/* Feed Toolbar */}
          <div className="p-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/70 dark:bg-dark-bg/50 flex flex-wrap items-center justify-between gap-3">
            
            {/* Category Filters */}
            <div className="flex items-center gap-1 bg-gray-200/60 dark:bg-dark-hover p-1 rounded-lg">
              {['All', 'Attendance', 'Borrowing', 'Penalties', 'System'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFeedFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    feedFilter === cat
                      ? 'bg-white dark:bg-dark-card text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search and Action Buttons */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-gray-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 w-52"
                />
              </div>

              <button
                type="button"
                onClick={handleTriggerOverdueScan}
                disabled={runningOverdueCheck}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-hover flex items-center gap-1.5 transition-colors"
                title="Scan database for overdue borrows and trigger notices"
              >
                <RefreshCw size={13} className={runningOverdueCheck ? 'animate-spin' : ''} />
                <span>Check Overdues</span>
              </button>

              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <CheckCheck size={14} />
                <span>Mark All Read</span>
              </button>
            </div>
          </div>

          {/* Feed Content List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-dark-border">
            {feedLoading ? (
              <div className="p-12 text-center text-gray-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw size={24} className="animate-spin text-sky-500" />
                <p className="text-xs">Loading operational activity...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                <Activity size={32} className="text-gray-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-gray-600 dark:text-slate-400">No events found</p>
                <p className="text-xs">System activity and student notifications will display here in real time.</p>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const isAttendance = item.category === 'ATTENDANCE';
                const isBorrow = item.category === 'BORROWING';
                const isPenalty = item.category === 'PENALTIES';

                const badgeColor = isAttendance 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/60'
                  : isBorrow
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                  : isPenalty
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                  : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';

                return (
                  <div
                    key={item.id}
                    onClick={() => !item.is_read && handleMarkAsRead(item.id)}
                    className={`p-4 flex items-start gap-4 transition-colors cursor-pointer ${
                      !item.is_read
                        ? 'bg-sky-50/40 dark:bg-sky-950/15 hover:bg-sky-50/70 dark:hover:bg-sky-950/25'
                        : 'hover:bg-gray-50/60 dark:hover:bg-dark-hover'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${badgeColor}`}>
                        {isAttendance && <Activity size={16} />}
                        {isBorrow && <ArrowRightLeft size={16} />}
                        {isPenalty && <DollarSign size={16} />}
                        {!isAttendance && !isBorrow && !isPenalty && <Mail size={16} />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-xs font-bold ${!item.is_read ? 'text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300'}`}>
                            {item.title}
                          </h4>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {item.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!item.is_read && (
                            <span className="w-2 h-2 rounded-full bg-sky-500" title="Unread event" />
                          )}
                          <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                      </div>

                      <p className={`text-xs leading-relaxed ${!item.is_read ? 'text-gray-800 dark:text-slate-200 font-medium' : 'text-gray-600 dark:text-slate-400'}`}>
                        {item.message}
                      </p>

                      {item.trigger_user && (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
                          <span className="font-semibold text-gray-700 dark:text-slate-300">
                            Student: {item.trigger_user.first_name} {item.trigger_user.last_name}
                          </span>
                          {item.trigger_user.student_id && (
                            <span className="font-mono bg-gray-100 dark:bg-dark-bg px-1.5 py-0.5 rounded border border-gray-200 dark:border-dark-border text-gray-600 dark:text-slate-400">
                              {item.trigger_user.student_id}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

    </div>
  );
}
