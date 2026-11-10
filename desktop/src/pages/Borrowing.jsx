import { useState, useEffect, useContext, useMemo, Fragment } from 'react';
import { 
  ArrowRightLeft, Search, Sun, Moon, Bell, Printer, Maximize, Camera, BookUp, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Mail, FileText
} from 'lucide-react';
import ScannerSim from '../components/ScannerSim';
import { useTheme } from '../components/ThemeContext';
import { BorrowingContext } from '../context/BorrowingContext';
import { useOfflineApi } from '../hooks/useOfflineApi';
import Pagination from '../components/Pagination';

export default function Borrowing() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  const {
    activeTab, 
    setActiveTab,
    step, 
    setStep,
    scannedBook, 
    setScannedBook,
    scannedUser, 
    setScannedUser,
    returnStep,
    setReturnStep,
    returnBookIdentifier,
    setReturnBookIdentifier,
    returnRecord,
    setReturnRecord,
    returnScannedUser,
    setReturnScannedUser,
    error, 
    setError,
    handleScan,
    scanFeedback
  } = useContext(BorrowingContext);
  
  // Penalties State
  const [penalties, setPenalties] = useState([]);
  const [penaltiesSubTab, setPenaltiesSubTab] = useState('UNPAID');
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);
  const [resendingReceiptId, setResendingReceiptId] = useState(null);
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());
  const [sendingEmailPenaltyId, setSendingEmailPenaltyId] = useState(null);
  const [sendingEmailUserId, setSendingEmailUserId] = useState(null);
  const [emailToast, setEmailToast] = useState(null);

  const toggleUserExpanded = (userId) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const groupedPenalties = useMemo(() => {
    const map = new Map();
    penalties.forEach((p) => {
      const uId = p.user_id;
      if (!map.has(uId)) {
        map.set(uId, {
          user: p.user,
          penalties: [],
          totalAmount: 0,
          hasUnreturned: false,
        });
      }
      const entry = map.get(uId);
      entry.penalties.push(p);
      entry.totalAmount += parseFloat(p.amount || 0);
      if (!p.is_returned) entry.hasUnreturned = true;
    });
    return Array.from(map.values());
  }, [penalties]);
  
  // Records State
  const [records, setRecords] = useState([]);

  // Pagination States (10 items per page)
  const [recordsPage, setRecordsPage] = useState(1);
  const [penaltiesPage, setPenaltiesPage] = useState(1);

  const [stats, setStats] = useState({ active: 0, overdue: 0, returned: 0 });
  const [successMessage, setSuccessMessage] = useState(null);
  const [confirmPenaltyId, setConfirmPenaltyId] = useState(null);
  const [penaltyCondition, setPenaltyCondition] = useState('RETURNED');
  const [penaltyError, setPenaltyError] = useState(null);
  
  // Borrow Option State
  const [borrowType, setBorrowType] = useState('TAKE_OUT');

  useEffect(() => {
    if (scannedBook?.library_use_only) {
      setBorrowType('READ_IN_LIBRARY');
    } else if (scannedBook) {
      setBorrowType('TAKE_OUT');
    }
  }, [scannedBook]);

  const { fetchWithOfflineSupport } = useOfflineApi();

  useEffect(() => {
    fetchStats();
    if (activeTab === 'Penalties') {
      setPenaltiesPage(1);
      fetchPenalties(penaltiesSubTab);
    }
    if (activeTab === 'Records') {
      setRecordsPage(1);
      fetchRecords();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'Penalties') {
      setPenaltiesPage(1);
      fetchPenalties(penaltiesSubTab);
    }
  }, [penaltiesSubTab]);

  const fetchRecords = async () => {
    try {
      const res = await fetchWithOfflineSupport(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/records`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }, 'borrowing_records');
      if (res.ok) setRecords(await res.json());
    } catch (e) {
      console.error('Failed to fetch records');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetchWithOfflineSupport(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/stats`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }, 'borrowing_stats');
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Failed to fetch stats');
    }
  };

  const handleCheckout = async () => {
    setError(null);
    try {
      const res = await fetchWithOfflineSupport(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/checkout`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ bookId: scannedBook.id, userId: scannedUser.id, borrowType })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.offlineQueued) {
          alert('Saved offline. Will sync when connection is restored.');
        } else {
          setSuccessMessage('Borrowing Successful!');
        }
        setStep(1);
        setScannedBook(null);
        setScannedUser(null);
        setBorrowType('TAKE_OUT');
        fetchStats();
      } else {
        setError(data.error || 'Checkout failed');
      }
    } catch (e) {
      setError('Server error during checkout');
    }
  };

  const handleConfirmReturn = async () => {
    setError(null);
    try {
      const res = await fetchWithOfflineSupport(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/return`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ borrowId: returnRecord.id })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.offlineQueued) {
          setSuccessMessage('Return saved offline. Will sync when connection is restored.');
        } else {
          setSuccessMessage('Return Successful!');
        }
        setReturnStep(1);
        setReturnRecord(null);
        setReturnBookIdentifier(null);
        setReturnScannedUser(null);
        fetchStats();
      } else {
        setError(data.error || 'Return failed');
      }
    } catch (e) {
      setError('Server error during return');
    }
  };

  const fetchPenalties = async (statusOverride) => {
    const status = statusOverride || penaltiesSubTab;
    try {
      const res = await fetchWithOfflineSupport(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/penalties?status=${status}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }, `borrowing_penalties_${status}`);
      if (res.ok) setPenalties(await res.json());
    } catch (e) {
      console.error('Failed to fetch penalties');
    }
  };

  const handlePayPenalty = async (id) => {
    setPenaltyError(null);
    setConfirmPenaltyId(id);
  };

  const confirmPayPenalty = async () => {
    const id = confirmPenaltyId;
    setPenaltyError(null);
    try {
      const currentPenaltyItem = penalties.find(p => p.id === id);
      const res = await fetchWithOfflineSupport(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/penalties/${id}/pay`, { 
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }, 
        method: 'POST',
        body: JSON.stringify({ condition: penaltyCondition })
      });
      if (res.ok) {
        const data = await res.json();
        setConfirmPenaltyId(null);
        const rNo = data.receiptNumber || '';
        const emailMsg = data.emailSent
          ? ` Official receipt ${rNo} was emailed to the student.`
          : (data.emailError ? ` (Note: Email delivery error: ${data.emailError})` : '');
        setSuccessMessage(`Penalty Marked as Paid!${emailMsg}`);
        fetchPenalties();
        fetchStats();

        // Immediately open the receipt modal so the librarian can print or inspect the receipt
        if (data.penalty) {
          setActiveReceiptModal({
            ...data.penalty,
            receipt_number: rNo,
            user: currentPenaltyItem?.user || data.penalty.user,
            borrow: currentPenaltyItem?.borrow || data.penalty.borrow
          });
        }
      } else {
        const data = await res.json();
        setPenaltyError(data.error || 'Failed to pay penalty');
      }
    } catch (e) {
      console.error('Failed to pay penalty');
      setPenaltyError('Server error while processing penalty');
    }
  };

  const handleResendReceiptEmail = async (penaltyId) => {
    setResendingReceiptId(penaltyId);
    setEmailToast(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/penalties/${penaltyId}/resend-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setEmailToast({
          type: 'success',
          message: data.message || 'Official receipt emailed to student successfully.'
        });
      } else {
        setEmailToast({
          type: 'error',
          message: data.error || 'Failed to dispatch receipt email.'
        });
      }
    } catch (e) {
      setEmailToast({
        type: 'error',
        message: 'Network error while dispatching receipt email.'
      });
    } finally {
      setResendingReceiptId(null);
    }
  };

  const handleSendEmailNotice = async (penalty, studentUser) => {
    if (!studentUser?.email) {
      setEmailToast({ type: 'error', message: 'Student does not have a registered email address.' });
      setTimeout(() => setEmailToast(null), 4000);
      return;
    }

    setSendingEmailPenaltyId(penalty.id);
    setEmailToast(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/penalties/${penalty.id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: `Server responded with status ${res.status}` };
      }

      if (res.ok) {
        setEmailToast({
          type: 'success',
          message: data.message || `Overdue notice sent to ${studentUser.email}`
        });
      } else {
        setEmailToast({
          type: 'error',
          message: data.error || 'Failed to dispatch email notice'
        });
      }
    } catch (e) {
      console.error('Error sending email notice:', e);
      setEmailToast({
        type: 'error',
        message: e.message || 'Network error while attempting to send notice'
      });
    } finally {
      setSendingEmailPenaltyId(null);
      setTimeout(() => {
        setEmailToast((prev) => (prev ? null : prev));
      }, 5000);
    }
  };

  const handleSendStudentEmailNotice = async (group) => {
    const studentUser = group?.user;
    if (!studentUser?.email) {
      setEmailToast({ type: 'error', message: 'Student does not have a registered email address.' });
      setTimeout(() => setEmailToast(null), 4000);
      return;
    }

    setSendingEmailUserId(studentUser.id);
    setEmailToast(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/borrowing/penalties/user/${studentUser.id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: `Server responded with status ${res.status}` };
      }

      if (res.ok) {
        setEmailToast({
          type: 'success',
          message: data.message || `Overdue notice sent to ${studentUser.email}`
        });
      } else {
        setEmailToast({
          type: 'error',
          message: data.error || 'Failed to dispatch email notice'
        });
      }
    } catch (e) {
      console.error('Error sending student email notice:', e);
      setEmailToast({
        type: 'error',
        message: e.message || 'Network error while attempting to send notice'
      });
    } finally {
      setSendingEmailUserId(null);
      setTimeout(() => {
        setEmailToast((prev) => (prev ? null : prev));
      }, 5000);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-slate-400">
            <ArrowRightLeft size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 dark:text-slate-200 leading-none">Borrowing</h1>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">05:10:39 PM</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-slate-400">Track book borrowing and returns</span>
          </div>
        </div>
        <div className="flex items-center gap-4">

          <div className="flex items-center gap-3 border-l border-gray-200 dark:border-dark-border pl-4">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-primary-600"></div> Open
            </div>
            <button onClick={toggleDarkMode} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300">
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 relative">
              <Bell size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs">
              AL
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* Title and Print */}
        <div className="flex justify-between items-start border-b border-gray-300 pb-4">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-300">Borrowing & Distribution</h2>
            <span className="text-sm text-gray-500 dark:text-slate-400">Manage book borrowing, returns, and penalties</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover dark:bg-dark-bg bg-white dark:bg-dark-card">
            <Printer size={16} /> Print
          </button>
        </div>

        {/* Currently Borrowed Pills */}
        <div className="flex items-center gap-3 bg-white dark:bg-transparent p-3 rounded-lg border border-gray-200 dark:border-dark-border shadow-sm">
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 ml-2">Currently Borrowed:</span>
          <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 rounded-full text-xs font-bold border border-primary-200 dark:border-primary-500/50">{stats.active} Active</span>
          <span className="px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-bold border border-red-100 dark:border-red-500/50">{stats.overdue} Overdue</span>
          <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-100 dark:border-green-500/50">{stats.returned} Returned</span>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {['Borrow', 'Return', 'Records', 'Penalties'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                activeTab === tab 
                  ? 'bg-primary-800 text-white shadow-md border-transparent' 
                  : 'bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-dark-hover'
              }`}
            >
              {tab === 'Borrow' && <BookUp size={16} />}
              {tab === 'Return' && <ArrowRightLeft size={16} />}
              {tab === 'Records' && <Printer size={16} />}

              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Borrow' && (
          <div className="flex flex-col gap-8 mt-4 animate-fade-in">
            {/* Step Progress */}
            <div className="flex items-center justify-between px-16 relative">
              <div className="absolute left-16 right-16 top-4 h-0.5 bg-gray-200 dark:bg-dark-border -z-10"></div>
              
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${step >= 1 ? 'bg-primary-800 text-white border-transparent' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>1</div>
                <span className={`text-xs ${step >= 1 ? 'font-bold text-primary-800 dark:text-primary-400' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Scan Book</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${step >= 2 ? 'bg-primary-800 text-white border-transparent' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>2</div>
                <span className={`text-xs ${step >= 2 ? 'font-bold text-primary-800 dark:text-primary-400' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Select Student</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${step >= 3 ? 'bg-primary-800 text-white border-transparent' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>3</div>
                <span className={`text-xs ${step >= 3 ? 'font-bold text-primary-800 dark:text-primary-400' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Confirm</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Scanner / Content Area */}
            {step === 1 && (
              <ScannerSim 
                title="Scan or Enter Book QR Code"
                subtitle="Scan the QR code on the book or enter it manually"
                boxTitle="Book QR Scanner"
                placeholder="Enter book ISBN or ID (e.g., 978-0...)"
                onSubmit={handleScan}
                isGlobalScanner={false}
                scanFeedback={scanFeedback}
              />
            )}

            {step === 2 && scannedBook?.library_use_only && (
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-sm">In Circulation: Library Use Only</span>
                    <span>
                      <strong>{scannedBook.title}</strong> cannot be borrowed outside the library. Proceeding will check it out as <strong>Read in Library</strong>.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep(1); setScannedBook(null); setError(null); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-dark-card border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0 transition-colors cursor-pointer"
                >
                  Change Book
                </button>
              </div>
            )}

            {step === 2 && (
              <ScannerSim 
                title="Scan Student ID"
                subtitle="Scan the student's ID card or enter their Student Number"
                boxTitle="Student ID Scanner"
                placeholder="Enter student ID (e.g., 2021-0001)"
                onSubmit={handleScan}
                isGlobalScanner={false}
                scanFeedback={scanFeedback}
              />
            )}

            {step === 3 && scannedBook && scannedUser && (
              <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm p-6 flex flex-col gap-6">
                <h3 className="font-bold text-gray-800 dark:text-slate-300 text-lg border-b border-gray-100 dark:border-dark-border pb-2">Confirm Checkout</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Book Details</span>
                    <p className="font-bold text-gray-900 dark:text-slate-200 text-lg">{scannedBook.title}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">{scannedBook.author?.name || 'Unknown Author'}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">ISBN: {scannedBook.isbn}</p>
                    {scannedBook.library_use_only && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>In Circulation: Library Use Only</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Borrower Details</span>
                    <p className="font-bold text-gray-900 dark:text-slate-200 text-lg">{scannedUser.first_name} {scannedUser.last_name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">{scannedUser.student_id}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{scannedUser.email}</p>
                  </div>
                </div>

                {/* Borrowing Option Toggle */}
                <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border border-gray-200 dark:border-dark-border mt-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-3">Borrowing Option</span>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${borrowType === 'READ_IN_LIBRARY' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-primary-300'}`}>
                      <input type="radio" name="borrowType" value="READ_IN_LIBRARY" checked={borrowType === 'READ_IN_LIBRARY'} onChange={() => setBorrowType('READ_IN_LIBRARY')} className="sr-only" />
                      <BookUp size={24} className={`mb-2 ${borrowType === 'READ_IN_LIBRARY' ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold whitespace-nowrap ${borrowType === 'READ_IN_LIBRARY' ? 'text-primary-800 dark:text-primary-400' : 'text-gray-600 dark:text-slate-400'}`}>Read in Library</span>
                      <span className="text-[10px] text-gray-500 mt-1 text-center">Due today before closing</span>
                    </label>
                    <label className={`flex-1 flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${scannedBook.library_use_only ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-dark-border bg-gray-100 dark:bg-dark-card' : borrowType === 'TAKE_OUT' ? 'cursor-pointer border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'cursor-pointer border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-primary-300'}`}>
                      <input type="radio" name="borrowType" value="TAKE_OUT" disabled={Boolean(scannedBook.library_use_only)} checked={borrowType === 'TAKE_OUT'} onChange={() => { if (!scannedBook.library_use_only) setBorrowType('TAKE_OUT'); }} className="sr-only" />
                      <ArrowRightLeft size={24} className={`mb-2 ${borrowType === 'TAKE_OUT' ? 'text-primary-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-bold whitespace-nowrap ${borrowType === 'TAKE_OUT' ? 'text-primary-800 dark:text-primary-400' : 'text-gray-600 dark:text-slate-400'}`}>Borrow</span>
                      <span className={`text-[10px] mt-1 text-center ${scannedBook.library_use_only ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-500'}`}>
                        {scannedBook.library_use_only ? 'Not allowed: book is In Circulation' : 'Standard due date applies'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button onClick={() => setStep(1)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-hover">Cancel</button>
                  <button onClick={handleCheckout} className="px-6 py-2 bg-primary-800 text-white rounded-lg font-bold shadow-sm hover:bg-primary-900">Confirm Checkout</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RETURN TAB */}
        {activeTab === 'Return' && (
          <div className="flex flex-col gap-8 mt-4 animate-fade-in">
            <div className="flex items-center justify-between px-16 relative">
              <div className="absolute left-16 right-16 top-4 h-0.5 bg-gray-200 dark:bg-dark-border -z-10"></div>
              
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${returnStep >= 1 ? 'bg-primary-800 text-white border-transparent' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>1</div>
                <span className={`text-xs ${returnStep >= 1 ? 'font-bold text-primary-800' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Scan Book</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${returnStep >= 2 ? 'bg-primary-800 text-white border-transparent' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>2</div>
                <span className={`text-xs ${returnStep >= 2 ? 'font-bold text-primary-800' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Verify Student</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${returnStep >= 3 ? 'bg-primary-800 text-white border-transparent' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>3</div>
                <span className={`text-xs ${returnStep >= 3 ? 'font-bold text-primary-800' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Confirm Return</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-sm font-medium">
                {error}
              </div>
            )}

            {returnStep === 1 && (
              <ScannerSim 
                title="Scan Book to Return"
                subtitle="Scan the QR code on the returning book"
                boxTitle="Book QR Scanner"
                placeholder="Enter book ISBN or ID..."
                onSubmit={handleScan}
                isGlobalScanner={false}
                scanFeedback={scanFeedback}
              />
            )}

            {returnStep === 2 && returnBookIdentifier && (
              <ScannerSim 
                title="Verify Returning Student"
                subtitle="Scan the ID of the student returning the book"
                boxTitle="Student ID Scanner"
                placeholder="Enter student ID..."
                onSubmit={handleScan}
                isGlobalScanner={false}
                scanFeedback={scanFeedback}
              />
            )}

            {returnStep === 3 && returnRecord && returnScannedUser && (
              <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm p-6 flex flex-col gap-6 animate-fade-in">
                <h3 className="font-bold text-gray-800 dark:text-slate-300 text-lg border-b border-gray-100 dark:border-dark-border pb-2">Confirm Return</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Book Info</span>
                    <p className="font-bold text-gray-900 dark:text-slate-200 text-lg">{returnRecord.book.title}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">ISBN: {returnRecord.book.isbn}</p>
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${new Date(returnRecord.due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {new Date(returnRecord.due_date) < new Date() ? 'OVERDUE' : 'ON TIME'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Borrowed By</span>
                    <p className="font-bold text-gray-900 dark:text-slate-200 text-lg">{returnRecord.user.first_name} {returnRecord.user.last_name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300">{returnRecord.user.student_id}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Borrowed on: {new Date(returnRecord.borrow_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => { setReturnStep(1); setReturnRecord(null); setReturnBookIdentifier(null); setReturnScannedUser(null); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-hover">Cancel</button>
                  <button onClick={handleConfirmReturn} className="px-6 py-2 bg-primary-800 text-white rounded-lg font-bold shadow-sm hover:bg-primary-900">Process Return</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PENALTIES TAB */}
        {activeTab === 'Penalties' && (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm mt-4 flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-200 dark:border-dark-border flex flex-wrap justify-between items-center gap-3 bg-gray-50 dark:bg-dark-bg">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPenaltiesSubTab('UNPAID')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    penaltiesSubTab === 'UNPAID'
                      ? 'bg-primary-800 text-white shadow-sm'
                      : 'bg-white dark:bg-dark-card text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-hover'
                  }`}
                >
                  Unpaid Penalties
                </button>
                <button
                  type="button"
                  onClick={() => setPenaltiesSubTab('PAID')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    penaltiesSubTab === 'PAID'
                      ? 'bg-primary-800 text-white shadow-sm'
                      : 'bg-white dark:bg-dark-card text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-hover'
                  }`}
                >
                  <FileText size={13} />
                  Paid Receipts
                </button>
              </div>

              {penaltiesSubTab === 'UNPAID' ? (
                groupedPenalties.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      <strong>{groupedPenalties.length}</strong> Students ({penalties.length} Total Penalties)
                    </span>
                    <button
                      onClick={() => {
                        if (expandedUserIds.size === groupedPenalties.length) {
                          setExpandedUserIds(new Set());
                        } else {
                          setExpandedUserIds(new Set(groupedPenalties.map(g => g.user.id)));
                        }
                      }}
                      className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 transition-colors"
                    >
                      {expandedUserIds.size === groupedPenalties.length ? 'Collapse All' : 'Expand All'}
                    </button>
                  </div>
                )
              ) : (
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  <strong>{penalties.length}</strong> Settled Official Receipts
                </div>
              )}
            </div>

            {emailToast && (
              <div
                className={`mx-5 my-3 p-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                  emailToast.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {emailToast.type === 'success' ? (
                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                  )}
                  <span>{emailToast.message}</span>
                </div>
                <button
                  onClick={() => setEmailToast(null)}
                  className="text-[11px] underline opacity-75 hover:opacity-100 ml-4 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
            
            {penaltiesSubTab === 'UNPAID' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-slate-400 uppercase">
                      <th className="px-6 py-3 font-bold">Student</th>
                      <th className="px-6 py-3 font-bold">Penalties Summary</th>
                      <th className="px-6 py-3 font-bold">Status</th>
                      <th className="px-6 py-3 font-bold text-right">Total Unpaid</th>
                      <th className="px-6 py-3 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {groupedPenalties.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium">No unpaid penalties</td></tr>
                    ) : (
                      groupedPenalties.slice((penaltiesPage - 1) * 10, penaltiesPage * 10).map((group) => {
                        const isExpanded = expandedUserIds.has(group.user.id);
                        return (
                          <Fragment key={group.user.id}>
                            <tr className={`border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${isExpanded ? 'bg-primary-50/20 dark:bg-primary-900/10' : ''}`}>
                              <td className="px-6 py-4">
                                <p className="font-bold text-sm text-gray-900 dark:text-slate-200">
                                  {group.user.first_name} {group.user.last_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                  {group.user.student_id} {group.user.email ? `• ${group.user.email}` : ''}
                                </p>
                                <button
                                  onClick={() => toggleUserExpanded(group.user.id)}
                                  className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp size={13} /> Hide Penalties ({group.penalties.length})
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={13} /> View Penalties ({group.penalties.length})
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-dark-border">
                                    {group.penalties.length} Item{group.penalties.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-1 max-w-xs" title={group.penalties.map(p => p.borrow?.book?.title).filter(Boolean).join(', ')}>
                                  {group.penalties.map(p => p.borrow?.book?.title).filter(Boolean).slice(0, 2).join(', ')}
                                  {group.penalties.length > 2 && ` +${group.penalties.length - 2} more`}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                {group.hasUnreturned ? (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                                    Has Active Overdue
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                                    All Returned (Unpaid)
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="font-bold text-base text-gray-900 dark:text-slate-200">
                                  ₱{group.totalAmount.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSendStudentEmailNotice(group)}
                                    disabled={sendingEmailUserId === group.user.id || !group.user?.email}
                                    title={group.user?.email ? `Send consolidated overdue notice to ${group.user.email}` : 'No email address registered for student'}
                                    className="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/40 border border-sky-200/60 dark:border-sky-800/60 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    <Mail size={12} className={sendingEmailUserId === group.user.id ? 'animate-pulse' : ''} />
                                    <span>{sendingEmailUserId === group.user.id ? 'Sending...' : 'Send Notice'}</span>
                                  </button>
                                  <button
                                    onClick={() => toggleUserExpanded(group.user.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                      isExpanded
                                        ? 'bg-gray-200 dark:bg-dark-hover text-gray-800 dark:text-slate-200'
                                        : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50'
                                    }`}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp size={13} /> Close
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown size={13} /> Details
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* EXPANDED BREAKDOWN SUB-ROW */}
                            {isExpanded && (
                              <tr className="bg-gray-50/70 dark:bg-dark-bg/60 border-b border-gray-200 dark:border-dark-border">
                                <td colSpan="5" className="px-8 py-4">
                                  <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4 shadow-sm">
                                    <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-dark-border pb-2">
                                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                                        Penalties for {group.user.first_name} {group.user.last_name} ({group.penalties.length} Item{group.penalties.length !== 1 ? 's' : ''})
                                      </span>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-500 dark:text-slate-400">
                                          Subtotal: <strong className="text-gray-900 dark:text-slate-200 font-bold">₱{group.totalAmount.toFixed(2)}</strong>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleSendStudentEmailNotice(group)}
                                          disabled={sendingEmailUserId === group.user.id || !group.user?.email}
                                          title={group.user?.email ? `Send consolidated overdue notice to ${group.user.email}` : 'No email address registered for student'}
                                          className="px-3 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/40 border border-sky-200/60 dark:border-sky-800/60 rounded text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                        >
                                          <Mail size={12} className={sendingEmailUserId === group.user.id ? 'animate-pulse' : ''} />
                                          <span>{sendingEmailUserId === group.user.id ? 'Sending...' : 'Send Notice'}</span>
                                        </button>
                                      </div>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs">
                                        <thead>
                                          <tr className="border-b border-gray-100 dark:border-dark-border text-gray-400 uppercase text-[10px]">
                                            <th className="pb-2 font-bold">Book Title</th>
                                            <th className="pb-2 font-bold">Overdue Details</th>
                                            <th className="pb-2 font-bold">Type</th>
                                            <th className="pb-2 font-bold text-right">Fine Amount</th>
                                            <th className="pb-2 font-bold text-center">Action</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                                          {group.penalties.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                                              <td className="py-2.5 font-semibold text-gray-800 dark:text-slate-300">
                                                {p.borrow?.book?.title || 'Unknown Book'}
                                              </td>
                                              <td className="py-2.5">
                                                <span className="text-red-500 font-semibold">{p.days_overdue} days overdue</span>
                                                {p.is_returned ? (
                                                  <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                                                    Returned {p.return_date ? new Date(p.return_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                                  </span>
                                                ) : (
                                                  <span className="ml-2 text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                                                    Not Returned
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5">
                                                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-[10px] font-bold">
                                                  {p.type}
                                                </span>
                                              </td>
                                              <td className="py-2.5 text-right font-bold text-gray-900 dark:text-slate-200">
                                                ₱{parseFloat(p.amount).toFixed(2)}
                                                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal block">
                                                  ₱{p.daily_rate || 5}/day
                                                </span>
                                              </td>
                                              <td className="py-2.5 text-center">
                                                <button
                                                  onClick={() => handlePayPenalty(p.id)}
                                                  className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold transition-colors shadow-sm cursor-pointer"
                                                >
                                                  Mark Paid
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse table-auto">
                  <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-slate-400 uppercase sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-dark-bg">
                      <th className="w-[145px] px-3.5 py-3 font-bold text-left whitespace-nowrap">Receipt No.</th>
                      <th className="min-w-[140px] px-3.5 py-3 font-bold text-left">Student</th>
                      <th className="min-w-[170px] px-3.5 py-3 font-bold text-left">Book Details</th>
                      <th className="w-[80px] px-2.5 py-3 font-bold text-center">Type</th>
                      <th className="w-[110px] px-3.5 py-3 font-bold text-right">Amount Settled</th>
                      <th className="w-[125px] px-3.5 py-3 font-bold text-left">Settled On</th>
                      <th className="w-[160px] px-3.5 py-3 font-bold text-center whitespace-nowrap">Receipt Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {penalties.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium">No paid receipts found</td></tr>
                    ) : (
                      penalties.slice((penaltiesPage - 1) * 10, penaltiesPage * 10).map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                          <td className="px-3.5 py-2.5 w-[145px] whitespace-nowrap">
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-gray-100 dark:bg-dark-bg text-primary-800 dark:text-primary-300 border border-gray-200 dark:border-dark-border inline-flex items-center gap-1.5 whitespace-nowrap">
                              <FileText size={12} className="shrink-0" />
                              {p.receipt_number || `CCC-OR-${new Date().getFullYear()}-${String(p.id).padStart(5, '0')}`}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 min-w-[140px]">
                            <p className="font-bold text-sm text-gray-900 dark:text-slate-200 truncate max-w-[170px]">
                              {p.user?.first_name} {p.user?.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[170px]" title={p.user?.email || p.user?.student_id}>
                              {p.user?.student_id} {p.user?.email ? `• ${p.user?.email}` : ''}
                            </p>
                          </td>
                          <td className="px-3.5 py-2.5 min-w-[170px]">
                            <p className="font-semibold text-xs text-gray-900 dark:text-slate-200 truncate max-w-[200px]" title={p.borrow?.book?.title}>
                              {p.borrow?.book?.title || 'Library Book'}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400">
                              {p.days_overdue} days overdue
                            </p>
                          </td>
                          <td className="px-2.5 py-2.5 w-[80px] text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-dark-border inline-block">
                              {p.type}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 w-[110px] text-right">
                            <p className="font-bold text-sm text-gray-900 dark:text-slate-200 tabular-nums">
                              ₱{parseFloat(p.amount || 0).toFixed(2)}
                            </p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              PAID
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 w-[125px] text-left">
                            <p className="text-xs text-gray-800 dark:text-slate-300 whitespace-nowrap">
                              {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Settled'}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate max-w-[120px]">
                              {p.collector ? `${p.collector.first_name} ${p.collector.last_name}` : 'Library Cashier'}
                            </p>
                          </td>
                          <td className="px-3.5 py-2.5 w-[160px] text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActiveReceiptModal(p)}
                                className="px-2.5 py-1 bg-white dark:bg-dark-card text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border rounded text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                                title="View and Print Official Receipt"
                              >
                                <Printer size={12} />
                                <span>Print</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResendReceiptEmail(p.id)}
                                disabled={resendingReceiptId === p.id || !p.user?.email}
                                title={p.user?.email ? `Resend receipt email to ${p.user.email}` : 'No student email on file'}
                                className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/40 border border-sky-200/60 dark:border-sky-800/60 rounded text-xs font-semibold inline-flex items-center gap-1 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                              >
                                <Mail size={12} className={resendingReceiptId === p.id ? 'animate-pulse' : ''} />
                                <span>{resendingReceiptId === p.id ? 'Sending...' : 'Email'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card">
              <Pagination
                currentPage={penaltiesPage}
                totalItems={penaltiesSubTab === 'UNPAID' ? groupedPenalties.length : penalties.length}
                itemsPerPage={10}
                onPageChange={setPenaltiesPage}
              />
            </div>
          </div>
        )}

        {/* Records TAB */}
        {activeTab === 'Records' && (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm mt-4 flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-dark-bg">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-slate-300">All Borrowing Records</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Complete history of all borrowed and returned books</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-slate-400 uppercase">
                    <th className="px-6 py-3 font-bold">Book Title</th>
                    <th className="px-6 py-3 font-bold">Student</th>
                    <th className="px-6 py-3 font-bold">Borrow Date</th>
                    <th className="px-6 py-3 font-bold">Due Date</th>
                    <th className="px-6 py-3 font-bold">Type</th>
                    <th className="px-6 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {records.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium">No records found</td></tr>
                  ) : (
                    records.slice((recordsPage - 1) * 10, recordsPage * 10).map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-gray-900 dark:text-slate-200">{record.book?.title}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">ISBN: {record.book?.isbn}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-gray-900 dark:text-slate-200">{record.user?.first_name} {record.user?.last_name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{record.user?.student_id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 dark:text-slate-300">{new Date(record.borrow_date).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 dark:text-slate-300">{new Date(record.due_date).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                            {record.type === 'READ_IN_LIBRARY' ? 'Read in Library' : 'Borrow'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            record.status === 'RETURNED' ? 'bg-green-100 text-green-700' :
                            record.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card">
              <Pagination
                currentPage={recordsPage}
                totalItems={records.length}
                itemsPerPage={10}
                onPageChange={setRecordsPage}
              />
            </div>
          </div>
        )}

      </div>

      {/* Success Modal */}
      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div 
            className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center animate-fade-in"
            style={{ minWidth: '320px' }}
          >
            <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-full mb-6">
              <CheckCircle className="text-primary-600 dark:text-primary-400 w-16 h-16" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              {successMessage}
            </h2>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="bg-primary-800 text-white px-10 py-3 rounded-xl font-bold text-lg hover:bg-primary-900 transition-colors shadow-lg shadow-primary-800/30 w-full"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Confirm Penalty Modal */}
      {confirmPenaltyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div 
            className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center animate-fade-in"
            style={{ minWidth: '340px' }}
          >
            <div className="bg-primary-100 dark:bg-primary-900/30 p-4 rounded-full mb-6">
              <CheckCircle className="text-primary-600 dark:text-primary-400 w-14 h-14" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              Mark as Paid?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              Confirm the book condition and mark this penalty as paid.
            </p>
            {penaltyError && (
              <div className="w-full p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-800">
                {penaltyError}
              </div>
            )}
            <div className="w-full mb-6">
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Book Condition</label>
              <select 
                value={penaltyCondition}
                onChange={(e) => setPenaltyCondition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:ring-1 focus:ring-primary-500 bg-white dark:bg-dark-bg dark:text-slate-200"
              >
                <option value="RETURNED">Returned</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setConfirmPenaltyId(null)}
                className="flex-1 py-3 rounded-xl font-bold text-base border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmPayPenalty}
                className="flex-1 bg-primary-800 text-white py-3 rounded-xl font-bold text-base hover:bg-primary-900 transition-colors shadow-lg shadow-primary-800/30"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {activeReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-official-receipt, #printable-official-receipt * {
                visibility: visible !important;
              }
              #printable-official-receipt {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 32px !important;
                background: #ffffff !important;
                color: #0f172a !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
          
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border max-w-lg w-full overflow-hidden flex flex-col animate-fade-in my-8">
            {/* Header Toolbar (no-print) */}
            <div className="no-print p-4 bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary-700 dark:text-primary-400" />
                <span className="font-bold text-sm text-gray-800 dark:text-slate-200">Official Settlement Receipt</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer size={13} />
                  Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReceiptModal(null)}
                  className="px-3 py-1.5 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Receipt Canvas */}
            <div id="printable-official-receipt" className="p-8 bg-white text-slate-900 flex flex-col gap-6">
              {/* Institution Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center">
                <div className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Calauan Community Campus
                </div>
                <div className="text-xl font-black tracking-tight text-slate-900 mt-0.5">
                  UNIVERSITY LIBRARY CLEARANCE &amp; SETTLEMENT
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Km 74, National Highway, Dayap, Calauan, Laguna 4012 | library@calauan.edu.ph
                </div>
              </div>

              {/* Receipt Reference Bar */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receipt Number</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {activeReceiptModal.receipt_number || `CCC-OR-${new Date().getFullYear()}-${String(activeReceiptModal.id).padStart(5, '0')}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Settlement Date</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {activeReceiptModal.paid_at
                      ? new Date(activeReceiptModal.paid_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                      : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              </div>

              {/* Student Identification */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Student Information</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Student Name:</span>
                    <strong className="text-slate-900 font-bold">
                      {activeReceiptModal.user?.first_name} {activeReceiptModal.user?.last_name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Student ID:</span>
                    <strong className="font-mono font-bold text-slate-900">
                      {activeReceiptModal.user?.student_id || 'N/A'}
                    </strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px]">Registered Email:</span>
                    <span className="text-slate-800 font-mono">
                      {activeReceiptModal.user?.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Settlement Line Item Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Basis</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-3">
                        <strong className="text-slate-900 block font-semibold">
                          {activeReceiptModal.borrow?.book?.title || 'Library Circulation Fine'}
                        </strong>
                        <span className="text-slate-500 text-[11px] block">
                          Penalty Type: {activeReceiptModal.type}
                        </span>
                        {activeReceiptModal.borrow?.due_date && (
                          <span className="text-slate-400 text-[10px] block">
                            Due date: {new Date(activeReceiptModal.borrow.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">
                        {activeReceiptModal.days_overdue ? `${activeReceiptModal.days_overdue} days` : '1 incident'}
                        {activeReceiptModal.daily_rate ? ` @ ₱${activeReceiptModal.daily_rate}/day` : ''}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₱{parseFloat(activeReceiptModal.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                      <td colSpan="2" className="py-3 px-3 text-slate-800 uppercase text-[11px] tracking-wider">
                        Total Amount Settled
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-base text-emerald-700">
                        ₱{parseFloat(activeReceiptModal.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Clearance Stamp & Signature */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-2">
                <div className="border-2 border-emerald-700 text-emerald-800 rounded px-3 py-1.5 uppercase font-black text-xs tracking-wider text-center">
                  PAID IN FULL - CLEARED
                </div>
                <div className="text-right text-xs">
                  <div className="border-b border-slate-400 pb-1 mb-1 w-44 font-semibold text-slate-900">
                    {activeReceiptModal.collector
                      ? `${activeReceiptModal.collector.first_name} ${activeReceiptModal.collector.last_name}`
                      : 'Authorized Staff'}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    Authorized Library Cashier
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-2">
                This document serves as official library clearance for the stated transaction. Calauan Community Campus.
              </div>
            </div>

            {/* Modal Bottom Actions (no-print) */}
            <div className="no-print p-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="px-4 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-primary-800 hover:bg-primary-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-primary-800/20 transition-all cursor-pointer"
              >
                <Printer size={14} />
                Print Official Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
