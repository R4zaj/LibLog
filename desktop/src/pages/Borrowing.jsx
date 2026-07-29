import { useState, useEffect, useContext } from 'react';
import { 
  ArrowRightLeft, Search, Sun, Moon, Bell, Printer, Maximize, Camera, DollarSign, BookUp
} from 'lucide-react';
import ScannerSim from '../components/ScannerSim';
import { useTheme } from '../components/ThemeContext';
import { BorrowingContext } from '../context/BorrowingContext';

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
    handleScan
  } = useContext(BorrowingContext);
  
  // Penalties State
  const [penalties, setPenalties] = useState([]);
  
  // Records State
  const [records, setRecords] = useState([]);

  // Stats State
  const [stats, setStats] = useState({ active: 0, overdue: 0, returned: 0 });

  useEffect(() => {
    fetchStats();
    if (activeTab === '$ Penalties') fetchPenalties();
    if (activeTab === 'Records') fetchRecords();
  }, [activeTab]);

  const fetchRecords = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/borrowing/records', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setRecords(await res.json());
    } catch (e) {
      console.error('Failed to fetch records');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/borrowing/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Failed to fetch stats');
    }
  };

  const handleCheckout = async () => {
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/borrowing/checkout', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ bookId: scannedBook.id, userId: scannedUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Checkout successful!');
        // Reset flow
        setStep(1);
        setScannedBook(null);
        setScannedUser(null);
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
      const res = await fetch('http://localhost:5000/api/borrowing/return', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ borrowId: returnRecord.id })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Book returned successfully!');
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

  const fetchPenalties = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/borrowing/penalties', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setPenalties(await res.json());
    } catch (e) {
      console.error('Failed to fetch penalties');
    }
  };

  const handlePayPenalty = async (id) => {
    if (!confirm('Mark this penalty as Paid?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/borrowing/penalties/${id}/pay`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, method: 'POST' });
      if (res.ok) {
        fetchPenalties();
        fetchStats();
      }
    } catch (e) {
      console.error('Failed to pay penalty');
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border shrink-0">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search books, students..." 
              className="pl-9 pr-12 py-1.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <span className="px-1.5 py-0.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded text-[10px] text-gray-400 dark:text-slate-500">⌘K</span>
            </div>
          </div>
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
      <div className="flex-1 overflow-y-auto px-16 py-8 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        
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
          {['Borrow', 'Return', 'Records', '$ Penalties'].map((tab) => (
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
              {tab === '$ Penalties' && <DollarSign size={16} />}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Borrow' && (
          <div className="flex flex-col gap-8 mt-4 animate-fade-in">
            {/* Step Progress */}
            <div className="flex items-center justify-between px-16 relative">
              <div className="absolute left-16 right-16 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 -z-10"></div>
              
              <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-dark-bg px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-primary-800 text-white' : 'bg-white dark:bg-transparent border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>1</div>
                <span className={`text-xs ${step >= 1 ? 'font-bold text-primary-800 dark:text-primary-400' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Scan Book</span>
              </div>
              <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-dark-bg px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-primary-800 text-white' : 'bg-white dark:bg-transparent border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>2</div>
                <span className={`text-xs ${step >= 2 ? 'font-bold text-primary-800 dark:text-primary-400' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Select Student</span>
              </div>
              <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-dark-bg px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-primary-800 text-white' : 'bg-white dark:bg-transparent border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>3</div>
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
              />
            )}

            {step === 2 && (
              <ScannerSim 
                title="Scan Student ID"
                subtitle="Scan the student's ID card or enter their Student Number"
                boxTitle="Student ID Scanner"
                placeholder="Enter student ID (e.g., 2021-0001)"
                onSubmit={handleScan}
                isGlobalScanner={false}
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
                  </div>

                  <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Borrower Details</span>
                    <p className="font-bold text-gray-900 dark:text-slate-200 text-lg">{scannedUser.first_name} {scannedUser.last_name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-1">{scannedUser.student_id}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{scannedUser.email}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
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
              <div className="absolute left-16 right-16 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 -z-10"></div>
              
              <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-dark-bg px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${returnStep >= 1 ? 'bg-primary-800 text-white' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>1</div>
                <span className={`text-xs ${returnStep >= 1 ? 'font-bold text-primary-800' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Scan Book</span>
              </div>
              <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-dark-bg px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${returnStep >= 2 ? 'bg-primary-800 text-white' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>2</div>
                <span className={`text-xs ${returnStep >= 2 ? 'font-bold text-primary-800' : 'font-medium text-gray-400 dark:text-slate-500'}`}>Verify Student</span>
              </div>
              <div className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-dark-bg px-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${returnStep >= 3 ? 'bg-primary-800 text-white' : 'bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border text-gray-400 dark:text-slate-500'}`}>3</div>
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
        {activeTab === '$ Penalties' && (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden shadow-sm mt-4 flex flex-col animate-fade-in">
            <div className="p-5 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-slate-300">Unpaid Penalties</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">Manage overdue and damage fines</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-slate-400 uppercase">
                    <th className="px-6 py-3 font-bold">Student</th>
                    <th className="px-6 py-3 font-bold">Book Details</th>
                    <th className="px-6 py-3 font-bold">Type</th>
                    <th className="px-6 py-3 font-bold text-right">Amount</th>
                    <th className="px-6 py-3 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {penalties.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium">No unpaid penalties</td></tr>
                  ) : (
                    penalties.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-gray-900 dark:text-slate-200">{p.user.first_name} {p.user.last_name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{p.user.student_id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-sm text-gray-800 dark:text-slate-300 line-clamp-1">{p.borrow.book.title}</p>
                          <p className="text-xs text-red-500">{p.days_overdue} days overdue</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold">{p.type}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-gray-900 dark:text-slate-200">₱{parseFloat(p.amount).toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => handlePayPenalty(p.id)} className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-bold transition-colors">
                            Mark Paid
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                    <th className="px-6 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {records.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium">No records found</td></tr>
                  ) : (
                    records.map((record) => (
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
          </div>
        )}

      </div>
    </div>
  );
}
