import { 
  Printer, FileSpreadsheet, FileText, Calendar, BarChart2, 
  BookOpen, Flame, Save, Users, DollarSign, Library, Download, TrendingUp, AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // UI States to match mockup
  const [quickSelect, setQuickSelect] = useState('This Month');
  const [period, setPeriod] = useState('Monthly');
  const [chartType, setChartType] = useState('Bar');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('PDF');
  const [selectedModules, setSelectedModules] = useState({
    summary: true,
    books: true,
    students: true,
    borrows: true,
    penalties: true
  });

  const [errorMsg, setErrorMsg] = useState(null);

  const fetchReportData = () => {
    setData(null);
    fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/reports/summary?startDate=${startDate}&endDate=${endDate}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(json => setData(json))
      .catch(err => {
        console.error('Failed to fetch report data:', err);
        setErrorMsg(err.message);
      });
  };

  useEffect(() => {
    fetchReportData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []); // Run once on mount. Further updates happen via 'Generate Report' button

  const handleQuickSelect = (qs) => {
    setQuickSelect(qs);
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    if (qs === 'Today') {
      start = today;
    } else if (qs === 'This Week') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today.setDate(diff));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (qs === 'This Month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (qs === 'This Year') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const COLORS = ['#6d28d9', '#a855f7', '#d8b4fe', '#f3e8ff', '#4c1d95'];

  if (errorMsg) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#f8f9fc] dark:bg-dark-bg">
        <span className="text-red-500 font-medium bg-red-50 px-4 py-2 rounded">Error fetching data: {errorMsg}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#f8f9fc] dark:bg-dark-bg">
        <span className="text-gray-400 dark:text-slate-500 font-medium animate-pulse">Loading analytics...</span>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[#f8f9fc] dark:bg-dark-bg">
        <span className="text-red-400 font-medium">Error loading analytics: {data.error}</span>
      </div>
    );
  }

  // Derived data for cards
  const mostBorrowedGenre = data.popularGenres.length > 0 ? data.popularGenres[0] : { name: 'N/A', count: 0 };
  const leastBorrowedBook = data.leastBooks.length > 0 ? data.leastBooks[0] : { title: 'N/A', borrows: 0 };
  const mostActiveStudent = data.topStudents.length > 0 ? data.topStudents[0] : { name: 'N/A', visits: 0, program: '' };

  const openExportModal = (format) => {
    setExportFormat(format);
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = async () => {
    setIsExportModalOpen(false);
    if (exportFormat === 'PDF') {
      const doc = generatePDFDoc();
      doc.save(`LibLog_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (exportFormat === 'Print') {
      const doc = generatePDFDoc();
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else if (exportFormat === 'Excel') {
      await handleExportExcel();
    }
  };

  const generatePDFDoc = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    
    const primaryPurple = '#7e22ce'; 
    const darkPurple = '#581c87'; 
    const accentOrange = '#f97316'; 

    doc.setFillColor(primaryPurple);
    doc.rect(0, 0, doc.internal.pageSize.width, 100, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(24);
    doc.text('LibLog Library Report', 40, 40);
    doc.setFontSize(10);
    doc.text(`Period: ${period} | May 12, 2026 to Jun 11, 2026`, 40, 65);
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 40, 80);

    doc.setDrawColor(accentOrange);
    doc.setLineWidth(4);
    doc.line(40, 90, 200, 90);

    let startY = 130;

    const addSectionHeader = (y, text) => {
      doc.setTextColor(primaryPurple);
      doc.setFontSize(14);
      doc.text(text, 40, y);
      doc.setDrawColor(primaryPurple);
      doc.setLineWidth(2);
      doc.line(40, y + 5, 40 + doc.getTextWidth(text) + 20, y + 5);
      return y + 20;
    };

    if (selectedModules.summary) {
      doc.setTextColor(primaryPurple);
      doc.setFontSize(16);
      doc.text('Report Summary', 40, 130);
      doc.setDrawColor(primaryPurple);
      doc.setLineWidth(2);
      doc.line(40, 135, 150, 135);

      const drawCard = (x, y, title, value, borderHex) => {
        doc.setFillColor('#f4f5f8'); 
        doc.rect(x, y, 160, 45, 'F');
        doc.setFillColor(borderHex);
        doc.rect(x, y, 5, 45, 'F');
        doc.setTextColor('#64748b');
        doc.setFontSize(8);
        doc.text(title, x + 15, y + 15);
        doc.setTextColor('#0f172a');
        doc.setFontSize(12);
        doc.text(String(value), x + 15, y + 35);
      };

      startY = 150;
      drawCard(40, startY, 'Total Borrows', data.totalBorrows || 0, primaryPurple);
      drawCard(220, startY, 'Total Returns', data.totalReturned || 0, primaryPurple);
      drawCard(400, startY, 'Total Visits', data.totalVisits || 0, primaryPurple);
      
      startY += 55;
      drawCard(40, startY, 'Overdue Count', data.overdueCount || 0, primaryPurple);
      drawCard(220, startY, 'Total Penalties', `PHP ${(data.financials?.totalPaid + data.financials?.totalUnpaid || 0).toFixed(2)}`, accentOrange);
      
      startY += 55;
      drawCard(40, startY, 'Paid Penalties', `PHP ${(data.financials?.totalPaid || 0).toFixed(2)}`, primaryPurple);
      drawCard(220, startY, 'Unpaid Penalties', `PHP ${(data.financials?.totalUnpaid || 0).toFixed(2)}`, primaryPurple);

      startY += 70;
    }

    if (selectedModules.books) {
      startY = addSectionHeader(startY, 'Most Borrowed Genres');
      autoTable(doc, {
        startY,
        head: [['#', 'Genre', 'Count', 'Share']],
        body: data.popularGenres.map((g, i) => [
          i + 1, g.name, g.count, 
          `${((g.count / Math.max(1, data.totalBorrows)) * 100).toFixed(1)}%`
        ]),
        headStyles: { fillColor: darkPurple, textColor: '#ffffff' },
        margin: { left: 40, right: 40 }
      });
      startY = doc.lastAutoTable.finalY + 30;
    }

    if (selectedModules.students) {
      const maskStudentId = (id) => {
        if (!id || id === 'N/A') return 'N/A';
        if (id.length <= 4) return '***';
        return id.substring(0, 4) + '***';
      };

      startY = addSectionHeader(startY, 'Most Active Students');
      autoTable(doc, {
        startY,
        head: [['#', 'Name', 'Student ID', 'Program', 'Borrows']],
        body: data.topStudents.map((s, i) => [
          i + 1, s.name, maskStudentId(s.student_id), s.program, s.borrows || s.visits
        ]),
        headStyles: { fillColor: darkPurple, textColor: '#ffffff' },
        margin: { left: 40, right: 40 }
      });
      startY = doc.lastAutoTable.finalY + 30;

      startY = addSectionHeader(startY, 'Visits per Program');
      autoTable(doc, {
        startY,
        head: [['#', 'Program', 'Visits', 'Share']],
        body: data.visitsByProgram.map((p, i) => [
          i + 1, p.name, p.value, 
          `${((p.value / Math.max(1, data.totalVisits)) * 100).toFixed(1)}%`
        ]),
        headStyles: { fillColor: darkPurple, textColor: '#ffffff' },
        margin: { left: 40, right: 40 }
      });
      startY = doc.lastAutoTable.finalY + 30;
    }

    if (selectedModules.penalties) {
      startY = addSectionHeader(startY, 'Penalty Breakdown');
      autoTable(doc, {
        startY,
        head: [['Metric', 'Value']],
        body: [
          ['Total Penalties', `PHP ${(data.financials?.totalPaid + data.financials?.totalUnpaid || 0).toFixed(2)}`],
          ['Paid', `PHP ${(data.financials?.totalPaid || 0).toFixed(2)}`],
          ['Unpaid', `PHP ${(data.financials?.totalUnpaid || 0).toFixed(2)}`]
        ],
        headStyles: { fillColor: darkPurple, textColor: '#ffffff' },
        margin: { left: 40, right: 40 }
      });
    }

    doc.setFontSize(8);
    doc.setTextColor('#94a3b8');
    doc.text(`LibLog Library Report | Generated ${new Date().toISOString().split('T')[0]}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 30, { align: 'center' });

    return doc;
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/reports/full?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch full report data');
      const fullData = await res.json();

      const wb = XLSX.utils.book_new();

      if (selectedModules.summary) {
        const summaryData = [
          ['Metric', 'Value'],
          ['Total Borrows', data.totalBorrows || 0],
          ['Total Returns', data.totalReturned || 0],
          ['Total Visits', data.totalVisits || 0],
          ['Overdue Count', data.overdueCount || 0],
          ['Total Penalties', `PHP ${(data.financials?.totalPaid + data.financials?.totalUnpaid || 0).toFixed(2)}`],
          ['Paid Penalties', `PHP ${(data.financials?.totalPaid || 0).toFixed(2)}`],
          ['Unpaid Penalties', `PHP ${(data.financials?.totalUnpaid || 0).toFixed(2)}`]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
      }

      if (selectedModules.borrows) {
        const borrowsData = [['ID', 'Book Title', 'ISBN', 'Student Name', 'Program', 'Borrow Date', 'Due Date', 'Return Date', 'Status', 'Penalty Amount']];
        fullData.allBorrows.forEach(b => {
          borrowsData.push([
            b.id, b.book?.title, b.book?.isbn, `${b.user?.first_name} ${b.user?.last_name}`,
            b.user?.program?.name || 'N/A', new Date(b.borrow_date).toLocaleString(),
            new Date(b.due_date).toLocaleString(), b.return_date ? new Date(b.return_date).toLocaleString() : 'N/A',
            b.status, b.penalty_amount
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(borrowsData), 'All Borrows');
      }

      if (selectedModules.students) {
        const visitsData = [['ID', 'Student Name', 'Program', 'Action', 'Timestamp']];
        fullData.allVisits.forEach(v => {
          visitsData.push([
            v.id, `${v.user?.first_name} ${v.user?.last_name}`, v.user?.program?.name || 'N/A',
            v.action, new Date(v.created_at).toLocaleString()
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(visitsData), 'All Visits');
      }

      if (selectedModules.books) {
        const booksData = [['ID', 'ISBN', 'Title', 'Author', 'Genre', 'Total Copies', 'Available Copies']];
        fullData.allBooks.forEach(b => {
          booksData.push([
            b.id, b.isbn, b.title, b.author, b.genre?.name || 'N/A', b.total_copies, b.available_copies
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(booksData), 'Books Inventory');
      }

      if (selectedModules.penalties) {
        const penaltiesData = [['ID', 'Student Name', 'Amount (PHP)', 'Status', 'Created At', 'Paid At']];
        fullData.allPenalties.forEach(p => {
          penaltiesData.push([
            p.id, `${p.user?.first_name} ${p.user?.last_name}`, p.amount, p.status,
            new Date(p.created_at).toLocaleString(), p.paid_at ? new Date(p.paid_at).toLocaleString() : 'N/A'
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(penaltiesData), 'Penalties');
      }

      XLSX.writeFile(wb, `LibLog_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('Failed to generate full Excel report');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f8] dark:bg-dark-bg overflow-y-auto animate-fade-in print-container">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible !important; background: white !important; }
          .no-print { display: none !important; }
          .shadow-sm { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      <div className="max-w-[1400px] w-full mx-auto px-8 py-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-start no-print">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-200 tracking-tight">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Generate comprehensive library reports and export data</p>
          </div>
          {user?.role === 'ADMIN' && (
            <div className="flex items-center gap-3">
              <button onClick={() => openExportModal('Print')} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-dark-hover">
                <Printer size={14} /> Print
              </button>
              <button onClick={() => openExportModal('Excel')} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-dark-hover">
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button onClick={() => openExportModal('PDF')} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-dark-hover">
                <FileText size={14} /> Export PDF
              </button>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 no-print">
          <div className="flex flex-col gap-6">
            
            {/* Quick Select */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Quick Select</label>
              <div className="flex border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden w-full max-w-4xl">
                {['Today', 'This Week', 'This Month', 'This Year'].map((qs) => (
                  <button 
                    key={qs}
                    onClick={() => setQuickSelect(qs)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors border-r last:border-0 border-gray-200 dark:border-dark-border ${quickSelect === qs ? 'bg-[#5b21b6] text-white' : 'bg-white dark:bg-dark-card text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover'}`}
                  >
                    {qs}
                  </button>
                ))}
              </div>
            </div>

            {/* Report Modules Select */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Report Modules</label>
              <div className="flex border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden w-full max-w-4xl">
                {Object.entries({
                  summary: 'Summary',
                  books: 'Books',
                  students: 'Students',
                  borrows: 'Borrows',
                  penalties: 'Penalties'
                }).map(([key, label]) => (
                  <button 
                    key={key}
                    onClick={() => setSelectedModules(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors border-r last:border-0 border-gray-200 dark:border-dark-border ${selectedModules[key] ? 'bg-[#5b21b6] text-white' : 'bg-white dark:bg-dark-card text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers & Generate */}
            <div className="flex items-end gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Period</label>
                <div className="flex border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden w-64">
                  {['Daily', 'Monthly', 'Yearly'].map((p) => (
                    <button 
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`flex-1 py-2 text-xs font-semibold transition-colors ${period === p ? 'bg-[#5b21b6] text-white' : 'bg-white dark:bg-dark-card text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14} />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 w-40 bg-white dark:bg-dark-card" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14} />
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 w-40 bg-white dark:bg-dark-card" />
                </div>
              </div>

              <button onClick={fetchReportData} className="flex items-center gap-2 px-5 py-2 bg-[#5b21b6] text-white rounded-lg text-xs font-bold hover:bg-[#4c1d95] transition-colors ml-2">
                <BarChart2 size={16} /> Generate Report
              </button>
            </div>

            {/* Footer text */}
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500 font-medium pt-2">
              <ClockIcon />
              <span className="text-gray-400">Last generated: {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {period} report • {startDate} — {endDate}</span>
            </div>
          </div>
        </div>

        {/* Top 5 Summary Cards */}
        {selectedModules.summary && (
        <div className="grid grid-cols-5 gap-4">
          {/* Card 1 */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Total Borrows</span>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
            <span className="text-3xl font-extrabold text-gray-900 dark:text-slate-200">{data.totalBorrows}</span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mt-2">{data.totalReturned} returned</span>
            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-slate-400">
              <TrendingUp size={10} /> monthly period
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Most Borrowed Genre</span>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
              <Flame size={16} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-200 truncate pr-8" title={mostBorrowedGenre.name}>{mostBorrowedGenre.name}</span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mt-2">{mostBorrowedGenre.count} borrows</span>
            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-blue-600">
              <TrendingUp size={10} /> Top genre
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Least Borrowed Book</span>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
              <Save size={16} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-200 truncate pr-8" title={leastBorrowedBook.title}>{leastBorrowedBook.title}</span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mt-2">{leastBorrowedBook.borrows} borrow</span>
            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-red-500">
              <TrendingUp size={10} className="transform rotate-180" /> Lowest activity
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Most Active Student</span>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              <Users size={16} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-200 truncate pr-8" title={mostActiveStudent.name}>{mostActiveStudent.name}</span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mt-2 truncate">{mostActiveStudent.visits} visits • {mostActiveStudent.program}</span>
            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-purple-700">
              <TrendingUp size={10} /> Top visitor
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-5 flex flex-col relative overflow-hidden">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Total Penalties</span>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
            <span className="text-2xl font-extrabold text-gray-900 dark:text-slate-200">₱{(data.financials.totalPaid + data.financials.totalUnpaid).toFixed(2)}</span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400 mt-2">Paid: ₱{data.financials.totalPaid.toFixed(2)} • Unpaid: ₱{data.financials.totalUnpaid.toFixed(2)}</span>
            <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-slate-400">
              <TrendingUp size={10} /> All clear
            </div>
          </div>
        </div>
        )}

        {/* Book Metrics Section Header */}
        {selectedModules.books && (
        <>
        <div className="flex items-center gap-4 mt-2 mb-4">
          <div className="w-1 h-8 rounded-full bg-purple-700"></div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Library size={20} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200">Book Metrics</h2>
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Borrowing analytics by book and genre</span>
          </div>
        </div>

        {/* Book Metrics Cards */}
        <div className="grid grid-cols-12 gap-6 mb-2">
          
          {/* Most Borrowed Books */}
          <div className="col-span-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex items-start gap-2 mb-6">
              <div className="mt-1 text-purple-600"><Flame size={14} /></div>
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Most Borrowed Books</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Top books by borrow frequency</span>
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border">
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 w-8">#</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Title</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Author</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 text-right w-16">Borrows</th>
                </tr>
              </thead>
              <tbody>
                {data.topBooks.map((book, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-[11px] text-gray-500 dark:text-slate-400">{i + 1}</td>
                    <td className="py-3 text-[11px] font-bold text-gray-800 dark:text-slate-300 truncate max-w-[120px] pr-2" title={book.title}>{book.title}</td>
                    <td className="py-3 text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[100px] pr-2">{book.author || 'Unknown'}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center justify-center bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded w-6">{book.borrows}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Least Borrowed Books */}
          <div className="col-span-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex items-start gap-2 mb-6">
              <div className="mt-1 text-purple-600"><Save size={14} /></div>
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Least Borrowed Books</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Books with lowest borrow activity</span>
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border">
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 w-8">#</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Title</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Author</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 text-right w-16">Borrows</th>
                </tr>
              </thead>
              <tbody>
                {data.leastBooks.map((book, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-[11px] text-gray-500 dark:text-slate-400">{i + 1}</td>
                    <td className="py-3 text-[11px] font-bold text-gray-800 dark:text-slate-300 truncate max-w-[120px] pr-2" title={book.title}>{book.title}</td>
                    <td className="py-3 text-[10px] text-gray-500 dark:text-slate-400 truncate max-w-[100px] pr-2">{book.author || 'Unknown'}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center justify-center bg-cyan-50 text-cyan-600 text-[10px] font-bold px-2 py-0.5 rounded w-6">{book.borrows}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Genre Distribution Graph */}
          <div className="col-span-4 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Genre Distribution</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 flex items-center gap-1">Borrow frequency by genre <span className="w-3 h-3 rounded-full border border-gray-300 text-gray-300 flex items-center justify-center text-[8px] cursor-help">?</span></span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <div className="flex border border-gray-200 dark:border-dark-border rounded-full overflow-hidden p-0.5 bg-gray-50">
                  {['Bar', 'Line', 'Pie', 'Area'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors ${chartType === type ? 'bg-purple-700 text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button className="text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"><Download size={14} /></button>
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                {chartType === 'Bar' ? (
                  <BarChart data={data.popularGenres} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', angle: -35, textAnchor: 'end'}} interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                    <Bar dataKey="count" fill="#6d28d9" radius={[2, 2, 0, 0]} barSize={32} />
                  </BarChart>
                ) : chartType === 'Line' ? (
                  <LineChart data={data.popularGenres} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', angle: -35, textAnchor: 'end'}} interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                    <Line type="monotone" dataKey="count" stroke="#6d28d9" strokeWidth={3} dot={{r: 4, fill: '#6d28d9'}} />
                  </LineChart>
                ) : chartType === 'Area' ? (
                  <AreaChart data={data.popularGenres} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', angle: -35, textAnchor: 'end'}} interval={0} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                    <Area type="monotone" dataKey="count" stroke="#6d28d9" fill="#d8b4fe" />
                  </AreaChart>
                ) : (
                  <PieChart>
                    <Pie data={data.popularGenres} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="name">
                      {data.popularGenres.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        </>
        )}

        {/* User Metrics Section */}
        {selectedModules.students && (
        <>
        <div className="flex items-center gap-4 mt-2 mb-4">
          <div className="w-1 h-8 rounded-full bg-cyan-500"></div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-500 flex items-center justify-center">
            <Users size={18} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200">User Metrics</h2>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">Student and program visit analytics</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-2">
          {/* Most Active Students */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex items-start gap-2 mb-6">
              <div className="mt-1 text-purple-600"><Users size={14} /></div>
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Most Active Students</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Top borrowers by frequency</span>
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-dark-border">
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 w-8">#</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Name</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Program</th>
                  <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 text-right w-16">Borrows</th>
                </tr>
              </thead>
              <tbody>
                {data.topStudents.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-[11px] text-gray-500 dark:text-slate-400">{s.rank}</td>
                    <td className="py-3 text-[11px] font-bold text-gray-800 dark:text-slate-300">{s.name}</td>
                    <td className="py-3 text-[10px] text-gray-500 dark:text-slate-400">{s.program}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center justify-center bg-cyan-50 text-cyan-600 text-[10px] font-bold px-2 py-0.5 rounded w-6">{s.visits}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Library Visits by Program */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Library Visits by Program</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Attendance distribution across programs</span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <div className="flex border border-gray-200 dark:border-dark-border rounded-full overflow-hidden p-0.5 bg-gray-50">
                  <button className="px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors bg-purple-700 text-white shadow-sm">Pie</button>
                </div>
                <button className="text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"><Download size={14} /></button>
              </div>
            </div>
            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                <PieChart>
                  <Pie data={data.visitsByProgram} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">
                    {data.visitsByProgram.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Administrative Tracking Section */}
        <>
        <div className="flex items-center gap-4 mt-2 mb-4">
          <div className="w-1 h-8 rounded-full bg-orange-500"></div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <AlertCircle size={18} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200">Administrative Tracking</h2>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">Penalties, unreturned books, and compliance</span>
          </div>
        </div>

        {/* Current Penalty Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-4 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider mb-1">Total Penalties</span>
            <span className="text-xl font-extrabold text-gray-900 dark:text-slate-200">₱{(data.penaltySummary?.totalAmount || 0).toFixed(2)}</span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">{(data.penaltySummary?.paidCount || 0) + (data.penaltySummary?.unpaidCount || 0)} total records</span>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-4 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider mb-1">Paid</span>
            <span className="text-xl font-extrabold text-green-600">₱{(data.penaltySummary?.paidAmount || 0).toFixed(2)}</span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">{data.penaltySummary?.paidCount || 0} records</span>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-4 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider mb-1">Unpaid</span>
            <span className="text-xl font-extrabold text-red-600">₱{(data.penaltySummary?.unpaidAmount || 0).toFixed(2)}</span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">{data.penaltySummary?.unpaidCount || 0} records</span>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-4 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wider mb-1">Overdue Books</span>
            <span className="text-xl font-extrabold text-orange-600">{data.overdueCount || 0}</span>
            <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">currently overdue</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-2">
          {/* Students with Penalties */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex items-start gap-2 mb-4">
              <div className="mt-1 text-orange-500"><AlertCircle size={14} /></div>
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Students with Penalties</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Active penalty balances (₱5/day after 3 days)</span>
              </div>
            </div>
            {data.penalties.length > 0 ? (
              <div className="overflow-auto max-h-52">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-dark-border">
                      <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 w-8">#</th>
                      <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Name</th>
                      <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.penalties.map((p, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-[11px] text-gray-500 dark:text-slate-400">{i + 1}</td>
                        <td className="py-2.5 text-[11px] font-bold text-gray-800 dark:text-slate-300">{p.name}</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center justify-center bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded">₱{p.amount.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2 py-8">
                <DollarSign size={32} strokeWidth={1} />
                <span className="text-[10px] font-bold">No students with penalties</span>
              </div>
            )}
          </div>

          {/* Teachers with Unreturned Books */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex items-start gap-2 mb-4">
              <div className="mt-1 text-purple-600"><BookOpen size={14} /></div>
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Teachers with Unreturned Books</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Faculty with outstanding borrows (semester duration)</span>
              </div>
            </div>
            {(data.facultyUnreturned || []).length > 0 ? (
              <div className="overflow-auto max-h-52">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-dark-border">
                      <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 w-8">#</th>
                      <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Name</th>
                      <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300">Program</th>
                      <th className="pb-2 text-[11px] font-bold text-gray-800 dark:text-slate-300 text-right">Books</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.facultyUnreturned.map((f, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-[11px] text-gray-500 dark:text-slate-400">{i + 1}</td>
                        <td className="py-2.5">
                          <span className="text-[11px] font-bold text-gray-800 dark:text-slate-300 block">{f.name}</span>
                          <span className="text-[9px] text-gray-400 dark:text-slate-500">{f.student_id}</span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-[10px] font-medium px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">{f.program}</span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center justify-center bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded w-6">{f.bookCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2 py-8">
                <BookOpen size={32} strokeWidth={1} />
                <span className="text-[10px] font-bold">No unreturned books by faculty</span>
              </div>
            )}
          </div>

          {/* Penalty Breakdown Chart */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Penalty Breakdown</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Paid vs unpaid penalty amounts</span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <div className="flex border border-gray-200 dark:border-dark-border rounded-full overflow-hidden p-0.5 bg-gray-50">
                  {['Bar', 'Line', 'Pie', 'Area'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors ${chartType === type ? 'bg-purple-700 text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button className="text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"><Download size={14} /></button>
              </div>
            </div>
            {data.financials.totalPaid > 0 || data.financials.totalUnpaid > 0 ? (
              <div className="flex-1 w-full min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Paid', value: data.financials.totalPaid },
                      { name: 'Unpaid', value: data.financials.totalUnpaid }
                    ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-slate-400">Paid ₱{data.financials.totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-medium text-gray-600 dark:text-slate-400">Unpaid ₱{data.financials.totalUnpaid.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2 py-8">
                <DollarSign size={32} strokeWidth={1} />
                <span className="text-[10px] font-bold">No penalty data</span>
                <span className="text-[8px] text-gray-400 dark:text-slate-500">No penalties recorded for this period</span>
              </div>
            )}
          </div>
        </div>
        </>

        {/* Trend Analysis Section */}
        {selectedModules.trends && (
        <>
        <div className="flex items-center gap-4 mt-2 mb-4">
          <div className="w-1 h-8 rounded-full bg-purple-700"></div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200">Trend Analysis</h2>
            <span className="text-[10px] text-gray-500 dark:text-slate-400">Borrowing trends over time</span>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col mb-2">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Borrow Trend</h3>
              <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Borrowing activity over the selected period</span>
            </div>
            <div className="flex items-center gap-2 no-print">
              <div className="flex border border-gray-200 dark:border-dark-border rounded-full overflow-hidden p-0.5 bg-gray-50">
                <button className="px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors bg-purple-700 text-white shadow-sm">Area</button>
              </div>
              <button className="text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"><Download size={14} /></button>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={1}>
              <AreaChart data={data.trendAnalysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{fontSize: 9, fill: '#64748b'}} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                <Area type="monotone" dataKey="borrows" stroke="#6d28d9" fill="#d8b4fe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        </>
        )}

        {/* Bottom Charts */}
        <div className="grid grid-cols-2 gap-6 pb-12">
          {/* Target Programs Visits */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Target Programs Visits</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Visit distribution</span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <div className="flex border border-gray-200 dark:border-dark-border rounded-full overflow-hidden p-0.5 bg-gray-50">
                  <button className="px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors bg-purple-700 text-white shadow-sm">Bar</button>
                </div>
                <button className="text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"><Download size={14} /></button>
              </div>
            </div>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                <BarChart data={data.visitsByProgram} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', angle: -25, textAnchor: 'end'}} interval={0} axisLine={true} tickLine={false} />
                  <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                  <Bar dataKey="value" fill="#a855f7" radius={[2, 2, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Penalty Summary */}
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900 dark:text-slate-200 text-sm">Penalty Summary</h3>
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">Total paid vs unpaid penalties</span>
              </div>
              <div className="flex items-center gap-2 no-print">
                <div className="flex border border-gray-200 dark:border-dark-border rounded-full overflow-hidden p-0.5 bg-gray-50">
                  <button className="px-2 py-0.5 text-[9px] font-bold rounded-full transition-colors bg-purple-700 text-white shadow-sm">Bar</button>
                </div>
                <button className="text-purple-600 hover:bg-purple-50 p-1 rounded transition-colors"><Download size={14} /></button>
              </div>
            </div>
            {data.financials.totalPaid > 0 || data.financials.totalUnpaid > 0 ? (
              <div className="flex-1 w-full min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={1}>
                  <BarChart data={[
                    { name: 'Paid', amount: data.financials.totalPaid },
                    { name: 'Unpaid', amount: data.financials.totalUnpaid }
                  ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b'}} axisLine={true} tickLine={false} />
                    <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} />
                    <Bar dataKey="amount" fill="#6d28d9" radius={[2, 2, 0, 0]} barSize={40}>
                      {
                        [
                          { name: 'Paid', amount: data.financials.totalPaid },
                          { name: 'Unpaid', amount: data.financials.totalUnpaid }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Paid' ? '#10b981' : '#ef4444'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2 py-8">
                <DollarSign size={32} strokeWidth={1} />
                <span className="text-[10px] font-bold">No penalty data</span>
                <span className="text-[8px] text-gray-400 dark:text-slate-500">No penalties recorded for this period</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up border border-purple-100 dark:border-purple-900/30">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-dark-card">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-purple-600" />
                Selective Export ({exportFormat})
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                &times;
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-xs text-gray-500 mb-4">Select which data modules to include in your generated {exportFormat}.</p>
              
              <div className="flex flex-col gap-3">
                {Object.keys(selectedModules).map(key => (
                  <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      checked={selectedModules[key]}
                      onChange={(e) => setSelectedModules({...selectedModules, [key]: e.target.checked})}
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmExport}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-[#5b21b6] hover:bg-[#4c1d95] text-white transition-colors flex items-center gap-2"
              >
                <Download size={16} /> Generate {exportFormat}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClockIcon(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
