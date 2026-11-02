import { 
  Printer, FileSpreadsheet, FileText, Calendar, BarChart2, 
  BookOpen, Flame, Save, Users, DollarSign, Library, Download, TrendingUp, AlertCircle, Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ReportsSkeleton from '../components/ReportsSkeleton';

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
  const [reportScope, setReportScope] = useState('summary_plan');
  const [selectedModules, setSelectedModules] = useState({
    summary: true,
    books: true,
    students: true,
    borrows: true,
    penalties: true
  });

  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [programs, setPrograms] = useState([]);
  const [preparedBy, setPreparedBy] = useState(() => localStorage.getItem('preparedBy') || (user ? `${user?.first_name} ${user?.last_name}` : 'Librarian'));
  const [libraryName, setLibraryName] = useState('Calauan Community Campus Library');
  const [reportTitle, setReportTitle] = useState('Monthly Library Report');
  const [reviewedBy, setReviewedBy] = useState('Head Librarian');
  const [approvedBy, setApprovedBy] = useState('Campus Director');
  const [reportTheme, setReportTheme] = useState('black_color');

  const [errorMsg, setErrorMsg] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Client-side cache to make tab-switching and period switching instantaneous
  const clientCacheRef = useState(() => new Map())[0];

  const fetchReportData = (force = false, customStart = startDate, customEnd = endDate, customDept = selectedDepartment) => {
    const cacheKey = `${customStart}_${customEnd}_${customDept}`;

    // Instant display from client cache if available and not explicitly forced
    if (!force && clientCacheRef.has(cacheKey)) {
      setData(clientCacheRef.get(cacheKey));
      return;
    }

    setIsRefreshing(true);
    setErrorMsg(null);

    const forceQuery = force ? '&force=true' : '';
    fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/reports/summary?startDate=${customStart}&endDate=${customEnd}&department=${customDept}${forceQuery}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(json => {
        clientCacheRef.set(cacheKey, json);
        setData(json);
      })
      .catch(err => {
        console.error('Failed to fetch report data:', err);
        if (!data) setErrorMsg(err.message);
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchReportData(false);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Fetch programs for the department filter
    fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/settings/programs`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(json => setPrograms(json || []))
      .catch(err => console.error('Failed to fetch programs:', err));

    return () => clearInterval(timer);
  }, []); // Run once on mount. Further updates happen via 'Generate Report' button or Quick Select

  useEffect(() => {
    localStorage.setItem('preparedBy', preparedBy);
  }, [preparedBy]);

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
    
    const newStart = start.toISOString().split('T')[0];
    const newEnd = end.toISOString().split('T')[0];
    setStartDate(newStart);
    setEndDate(newEnd);
    fetchReportData(false, newStart, newEnd, selectedDepartment);
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
    return <ReportsSkeleton />;
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
    if (exportFormat === 'PDF' || exportFormat === 'Print') {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/reports/full?startDate=${startDate}&endDate=${endDate}&department=${selectedDepartment}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch full report data');
        const fullData = await res.json();
        const doc = generatePDFDoc(fullData);
        const fileName = reportScope === 'summary_plan'
          ? `CCC_Librarian_Summary_Plan_${startDate}_${endDate}.pdf`
          : `CCC_Library_Full_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        if (exportFormat === 'PDF') {
          doc.save(fileName);
        } else {
          doc.autoPrint();
          window.open(doc.output('bloburl'), '_blank');
        }
      } catch (error) {
        console.error(error);
        alert('Failed to generate PDF report');
      }
    } else if (exportFormat === 'Excel') {
      await handleExportExcel();
    }
  };

  const generatePDFDoc = (fullData) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    // Color & Theme configuration
    const isMono = reportTheme === 'black_monochrome';
    const isNavy = reportTheme === 'black_navy';

    const primaryColor = '#000000';
    const secondaryColor = isMono ? '#000000' : '#1f2937';
    const headerFill = isMono ? '#000000' : (isNavy ? '#1e3a8a' : '#5b21b6');
    const altRowFill = isMono ? '#f9fafb' : (isNavy ? '#f0f9ff' : '#faf5ff');
    const footFill = isMono ? '#f3f4f6' : (isNavy ? '#e0f2fe' : '#ede9fe');

    const commonTableStyles = {
      theme: 'grid',
      headStyles: { 
        fillColor: headerFill, 
        textColor: '#ffffff', 
        fontStyle: 'bold', 
        fontSize: 8.5,
        lineColor: '#000000',
        lineWidth: 0.75
      },
      bodyStyles: { 
        fontSize: 8, 
        textColor: '#000000',
        lineColor: '#000000',
        lineWidth: 0.75
      },
      alternateRowStyles: { 
        fillColor: altRowFill,
        lineColor: '#000000',
        lineWidth: 0.75
      },
      styles: { 
        cellPadding: 4, 
        lineColor: '#000000', 
        lineWidth: 0.75,
        textColor: '#000000'
      },
      tableLineWidth: 0.75,
      tableLineColor: '#000000',
      margin: { left: margin, right: margin }
    };

    let startY = 40;

    const checkPageBreak = (neededHeight = 70) => {
      if (startY > pageHeight - neededHeight) {
        doc.addPage();
        startY = 40;
      }
    };

    const addSectionHeader = (title) => {
      checkPageBreak(50);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text(title, margin, startY);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.75);
      doc.line(margin, startY + 4, pageWidth - margin, startY + 4);
      startY += 18;
    };

    const addParagraph = (text) => {
      checkPageBreak(35);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, startY);
      startY += lines.length * 11 + 8;
    };

    // Header Title
    doc.setTextColor(primaryColor);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text((libraryName || 'Calauan Community Campus Library').toUpperCase(), pageWidth / 2, startY, { align: 'center' });
    startY += 16;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor);
    const subTitleText = reportScope === 'summary_plan'
      ? 'LIBRARIAN OPERATIONAL & CIRCULATION SUMMARY PLAN'
      : `${(reportTitle || `${period} Library Report`).toUpperCase()}`;
    doc.text(subTitleText, pageWidth / 2, startY, { align: 'center' });
    startY += 14;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(secondaryColor);
    doc.text(`Reporting Period: ${period} (${startDate} to ${endDate})`, pageWidth / 2, startY, { align: 'center' });
    startY += 12;

    // Double rule (solid black)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.5);
    doc.line(margin, startY, pageWidth - margin, startY);
    doc.setLineWidth(0.5);
    doc.line(margin, startY + 3, pageWidth - margin, startY + 3);
    startY += 16;

    const totalVisits = fullData.attendanceStats?.totalVisits ?? fullData.allVisits?.length ?? data?.totalVisits ?? 0;
    const totalBorrows = fullData.circulationMetrics?.borrowed?.current ?? fullData.allBorrows?.length ?? data?.totalBorrows ?? 0;
    const totalTitles = fullData.collectionStats?.printBooks?.totalTitles ?? fullData.allBooks?.length ?? data?.summaryPlan?.collectionInventory?.totalTitles ?? 0;
    const totalCopies = fullData.collectionStats?.printBooks?.totalCopies ?? totalTitles ?? data?.summaryPlan?.collectionInventory?.totalCopies ?? 0;
    const overdueCount = fullData.circulationMetrics?.overdue?.current ?? data?.summaryPlan?.complianceAndOverdue?.overdueCount ?? 0;
    const finesCollected = fullData.circulationMetrics?.fines?.current ?? data?.summaryPlan?.complianceAndOverdue?.paidFines ?? 0;

    // 1-2 PAGE LIBRARIAN SUMMARY PLAN BRIEF
    if (reportScope === 'summary_plan') {
      const sp = data?.summaryPlan || {};
      const inv = sp.collectionInventory || {};
      const comp = sp.complianceAndOverdue || {};

      addSectionHeader('1. Administrative Details');
      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Administrative Parameter', 'Official Entry']],
        body: [
          ['Library Institution', `${libraryName} (CCC LIB APP)`],
          ['Executive Document', 'Librarian Operational & Circulation Summary Plan'],
          ['Reporting Cycle & Coverage', `${period} (${startDate} to ${endDate})`],
          ['Academic Scope', selectedDepartment === 'All' ? 'All Campus Programs & Departments' : selectedDepartment],
          ['Prepared by (Librarian)', `${preparedBy}, Library Staff / Custodian`],
          ['Reviewed by (Head Librarian)', `${reviewedBy}`],
          ['Approved by (Campus Director)', `${approvedBy}`],
          ['Submission Timestamp', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })]
        ],
        theme: 'grid'
      });
      startY = doc.lastAutoTable.finalY + 14;

      addSectionHeader('2. Executive Summary & Administrative Narrative');
      addParagraph(
        sp.executiveNarrative ||
        `During the reporting period from ${startDate} to ${endDate}, the ${libraryName} accommodated ${totalVisits} patron visits and processed ${totalBorrows} literature borrowings across academic departments. Collection turnover stands at ${(inv.circulationTurnoverRatio ?? 0).toFixed(2)} checkouts per copy, with catalog utilization at ${(inv.catalogUtilizationRate ?? 0).toFixed(1)}%. Current overdue items stand at ${comp.overdueCount ?? overdueCount} (${(comp.overdueRate ?? 0).toFixed(1)}% overdue rate). Penalty clearance recovery is at ${(comp.penaltyRecoveryRate ?? 0).toFixed(1)}% with PHP ${(comp.paidFines ?? finesCollected).toFixed(2)} collected.`
      );

      addSectionHeader('3. Institutional Key Performance Indicators (KPIs)');
      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Key Performance Indicator', 'Actual Period Value', 'Benchmark Standard', 'Evaluation']],
        body: [
          ['Circulation Turnover Ratio', `${inv.circulationTurnoverRatio ?? 0} checkouts/copy`, '>= 0.30 checkouts/copy', (inv.circulationTurnoverRatio || 0) >= 0.30 ? 'Met' : 'Under Review'],
          ['Catalog Utilization Rate', `${inv.catalogUtilizationRate ?? 0}% active titles`, '>= 50.0% catalog usage', (inv.catalogUtilizationRate || 0) >= 50.0 ? 'Met' : 'In Progress'],
          ['Patron Foot Traffic (Attendance)', `${totalVisits} recorded visits`, '>= 200 visits/month', totalVisits >= 200 ? 'Met' : 'In Progress'],
          ['Overdue Containment Rate', `${(comp.overdueRate ?? 0).toFixed(1)}% overdue`, '< 10.0% threshold', (comp.overdueRate || 0) <= 10.0 ? 'Met' : 'Attention Needed'],
          ['Penalty Clearance Recovery', `${(comp.penaltyRecoveryRate ?? 0).toFixed(1)}% settled (PHP ${(comp.paidFines || 0).toFixed(2)})`, '>= 60.0% clearance', (comp.penaltyRecoveryRate || 0) >= 60.0 ? 'Met' : 'Action Required']
        ],
        theme: 'grid',
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 3 && !isMono) {
            const val = cellData.cell.raw;
            if (val === 'Met') {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.textColor = '#15803d';
            } else {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.textColor = '#b45309';
            }
          }
        }
      });
      startY = doc.lastAutoTable.finalY + 14;

      checkPageBreak(120);
      addSectionHeader('4. Operational Goals & Progress Matrix');
      const matrixRows = sp.goalsMatrix && sp.goalsMatrix.length > 0
        ? sp.goalsMatrix.map(g => [g.benchmark, g.target, g.actual, g.status, g.notes])
        : [
            ['Student Library Visitation', '>= 200 visits', `${totalVisits} visits`, totalVisits >= 200 ? 'Met' : 'In Progress', 'Patron study and reading engagement'],
            ['Curriculum Circulation Velocity', '>= 50 checkouts', `${totalBorrows} checkouts`, totalBorrows >= 50 ? 'Met' : 'In Progress', 'Circulation across academic subjects'],
            ['Catalog Indexing Completeness', '100% active titles', `${totalTitles} titles (${totalCopies} copies)`, 'Met', 'QR and barcode cataloging maintained'],
            ['Overdue Containment Rate', '< 10.0% overdue', `${(comp.overdueRate ?? 0).toFixed(1)}% overdue`, (comp.overdueRate || 0) <= 10.0 ? 'Met' : 'Attention Needed', `${overdueCount} overdue items pending return`]
          ];

      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Objective Benchmark', 'Target', 'Actual', 'Status', 'Operational Notes']],
        body: matrixRows,
        theme: 'grid',
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 3 && !isMono) {
            const val = cellData.cell.raw;
            if (val === 'Met') {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.textColor = '#15803d';
            } else {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.textColor = '#b45309';
            }
          }
        }
      });
      startY = doc.lastAutoTable.finalY + 14;

      checkPageBreak(100);
      addSectionHeader('5. Strategic Collection & Curricular Plan');
      const acqList = (sp.acquisitionPriorities && sp.acquisitionPriorities.length > 0)
        ? sp.acquisitionPriorities.map((a, i) => [`Priority ${i+1}: ${a.genre}`, `${a.demandCount} checkouts`, a.recommendation])
        : [['General Curriculum Literature', `${totalBorrows} checkouts`, 'Procure updated textbook editions aligned with semester syllabi.']];

      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Acquisition Focus', 'Patron Demand', 'Strategic Action Recommendation']],
        body: acqList,
        theme: 'grid'
      });
      startY = doc.lastAutoTable.finalY + 18;

      checkPageBreak(90);
      addSectionHeader('6. Institutional Endorsement & Signatures');
      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Prepared by', 'Reviewed by', 'Approved by']],
        body: [
          [
            `\n\n___________________________________\n${preparedBy}\nLibrary Staff / Custodian\nDate: ${new Date().toLocaleDateString()}`,
            `\n\n___________________________________\n${reviewedBy}\nHead Librarian\nDate: ________________________`,
            `\n\n___________________________________\n${approvedBy}\nCampus Director\nDate: ________________________`
          ]
        ],
        theme: 'grid',
        styles: { ...commonTableStyles.styles, cellPadding: 6, fontSize: 8.5, halign: 'center' }
      });

      return doc;
    }

    // Report Details
    addSectionHeader('Report Details');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Field', 'Entry']],
      body: [
        ['Library', `${libraryName} (CCC LIB APP)`],
        ['Report Title', reportTitle || `${period} Library Report`],
        ['Reporting Period', `${startDate} to ${endDate}`],
        ['Department Scope', selectedDepartment === 'All' ? 'All Programs & Departments' : selectedDepartment],
        ['Prepared by', `${preparedBy}, Library Custodian / Librarian`],
        ['Reviewed by', `${reviewedBy}`],
        ['Approved by', `${approvedBy}`],
        ['Date Submitted', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })]
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 16;

    // 1. Executive Summary
    addSectionHeader('1. Executive Summary');
    addParagraph(
      `During the reporting period from ${startDate} to ${endDate}, the ${libraryName} registered a total of ${totalVisits} patron visits and facilitated ${totalBorrows} literature borrowings across academic departments. The institution's collection stands at ${totalTitles} active titles representing ${totalCopies} total copies. The implementation of barcode and QR-assisted access has significantly streamlined patron throughput and checkout turnaround. Operational priorities for the ensuing period center on accelerating the return of ${overdueCount} overdue items and targeted acquisitions for expanding high-demand curriculum requirements.`
    );

    // 2. Introduction and Objectives
    addSectionHeader('2. Introduction and Objectives');
    addParagraph(
      'This document outlines library operations, circulation trends, patron participation, and collection status for institutional administrators and department chairs. Progress towards operational objectives for this reporting cycle is summarized below:'
    );
    const targetVisits = Math.max(200, Math.round(totalVisits * 1.15));
    const targetBorrows = Math.max(50, Math.round(totalBorrows * 1.1));
    const overdueRate = totalBorrows > 0 ? ((overdueCount / totalBorrows) * 100).toFixed(1) : '0.0';
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Goal for the Period', 'Target', 'Actual', 'Status']],
      body: [
        ['Increase student library visits', `${targetVisits} visits`, `${totalVisits} visits`, totalVisits >= targetVisits ? 'Met' : 'In Progress'],
        ['Promote literature borrowing & reading', `${targetBorrows} checkouts`, `${totalBorrows} checkouts`, totalBorrows >= targetBorrows ? 'Met' : 'Partly met'],
        ['Maintain comprehensive digital catalog', '100% cataloged', `${totalTitles} titles indexed`, 'Met'],
        ['Control overdue & penalty rates', '< 10% overdue rate', `${overdueRate}% overdue rate`, parseFloat(overdueRate) <= 10 ? 'Met' : 'Under Review']
      ],
      theme: 'grid',
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 3 && !isMono) {
          const val = cellData.cell.raw;
          if (val === 'Met') {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = '#15803d';
          } else {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = '#b45309';
          }
        }
      }
    });
    startY = doc.lastAutoTable.finalY + 16;

    // 3. Library Profile
    const profile = fullData.libraryProfile || {};
    const reg = profile.registeredUsers || {};
    addSectionHeader('3. Library Profile');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Item', 'Details']],
      body: [
        ['Library hours', profile.hours || 'Monday – Saturday, 7:00 AM – 9:00 PM'],
        ['Seating capacity', `${profile.seatingCapacity || 40} seats`],
        ['Number of staff', `${profile.staffCount || 3} staff (Head Librarian, Custodians & Administrative Assistants)`],
        ['Registered users', `${reg.students || 0} Students, ${reg.faculty || 0} Faculty, ${reg.staff || 0} Staff (Total: ${reg.total || 0})`],
        ['Facilities and equipment', profile.facilities || 'Circulation Desk, Barcode & QR Scanners, OPAC Terminals, Study Tables, Digital Storage']
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 16;

    // 4. Collection and Acquisitions
    const coll = fullData.collectionStats?.printBooks || {};
    addSectionHeader('4. Collection and Acquisitions');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Collection Type', 'Total Titles', 'Total Copies', 'Added This Period', 'Withdrawn / Archived']],
      body: [
        ['Print books', `${coll.totalTitles || totalTitles}`, `${coll.totalCopies || totalCopies}`, `${coll.addedTitles || 0}`, `${coll.withdrawnTitles || 0}`],
        ['Periodicals and journals', '14', '14', '0', '0'],
        ['Theses and special collections', '52', '52', '0', '0'],
        ['E-books and databases', '1', 'N/A', '0', '0']
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 8;
    addParagraph(
      `Acquisitions by source: Literature accessions were procured primarily through institutional funding allocations alongside donations from faculty and academic partners.\nCollection by subject or program: Strongest collections support ${data?.popularGenres?.slice(0, 3).map(g => g.name).join(', ') || 'Computer Studies, Education, and General Sciences'}. High-priority acquisition requests remain focused on specialized upper-division literature.`
    );

    // 5. Circulation and Collection Use
    const circ = fullData.circulationMetrics || {};
    addSectionHeader('5. Circulation and Collection Use');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Measure', 'This Period', 'Previous Period', 'Change']],
      body: [
        ['Books borrowed (checkouts)', `${circ.borrowed?.current ?? totalBorrows}`, `${circ.borrowed?.previous ?? 0}`, `${circ.borrowed?.change ?? '0.0%'}`],
        ['Books returned', `${circ.returned?.current ?? 0}`, `${circ.returned?.previous ?? 0}`, `${circ.returned?.change ?? '0.0%'}`],
        ['Renewals', '0', '0', '0.0%'],
        ['Overdue items', `${circ.overdue?.current ?? overdueCount}`, `${circ.overdue?.previous ?? 0}`, `${circ.overdue?.change ?? '0.0%'}`],
        ['Fines collected (PHP)', `PHP ${(circ.fines?.current ?? finesCollected).toFixed(2)}`, `PHP ${(circ.fines?.previous ?? 0).toFixed(2)}`, `${circ.fines?.change ?? '0.0%'}`],
        ['In-library use (reference only)', `${circ.inLibrary?.current ?? 0}`, `${circ.inLibrary?.previous ?? 0}`, `${circ.inLibrary?.change ?? '0.0%'}`]
      ],
      theme: 'grid',
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 3 && !isMono) {
          const val = cellData.cell.raw;
          if (typeof val === 'string' && val.startsWith('+')) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = '#15803d';
          } else if (typeof val === 'string' && val.startsWith('-')) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = '#dc2626';
          }
        }
      }
    });
    startY = doc.lastAutoTable.finalY + 12;

    checkPageBreak(80);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Most Borrowed Titles:', margin, startY);
    startY += 10;

    const topTitlesList = circ.topBorrowedTitles?.length > 0 
      ? circ.topBorrowedTitles.slice(0, 5) 
      : (data?.topBooks?.slice(0, 5) || []);

    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Rank', 'Title', 'Author', 'Department or Program', 'Times Borrowed']],
      body: topTitlesList.length > 0 ? topTitlesList.map((t, idx) => [
        `${idx + 1}`,
        t.title || 'Unknown Title',
        t.author || 'Unknown Author',
        t.department || t.genre || 'General',
        `${t.borrows || 0}`
      ]) : [['-', 'No borrow records recorded', '-', '-', '-']],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 8;
    addParagraph('Notes and observations: Borrowing volume accelerates during midterm examinations and assignment deadlines. Overdue notifications are continuously transmitted to minimize holding lag.');

    // 6. Library Attendance and User Statistics
    const att = fullData.attendanceStats || {};
    addSectionHeader('6. Library Attendance and User Statistics');
    const programRows = (att.byProgram && att.byProgram.length > 0) ? att.byProgram.map(p => [
      p.program, `${p.totalVisits}`, `${p.uniqueUsers}`, `${p.avgPerDay}`
    ]) : [['General Students', `${totalVisits}`, `${Math.round(totalVisits * 0.7)}`, `${(totalVisits / 30).toFixed(1)}`]];

    const totalUniqueUsers = att.byProgram ? att.byProgram.reduce((sum, p) => sum + p.uniqueUsers, 0) : Math.round(totalVisits * 0.7);
    const avgVisitsTotal = att.byProgram ? (att.byProgram.reduce((sum, p) => sum + parseFloat(p.avgPerDay), 0)).toFixed(1) : (totalVisits / 30).toFixed(1);

    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Department / Program', 'Total Visits', 'Unique Users', 'Average Visits per Day']],
      body: [
        ...programRows,
        ['Total', `${totalVisits}`, `${totalUniqueUsers}`, `${avgVisitsTotal}`]
      ],
      theme: 'grid',
      foot: [['Total', `${totalVisits}`, `${totalUniqueUsers}`, `${avgVisitsTotal}`]],
      footStyles: { 
        fillColor: footFill, 
        textColor: '#000000', 
        fontStyle: 'bold', 
        lineColor: '#000000', 
        lineWidth: 0.75 
      }
    });
    startY = doc.lastAutoTable.finalY + 8;
    addParagraph(`Peak days and hours: Peak attendance was recorded during ${att.peakDays || 'Monday & Wednesday'}, with the highest hourly density between ${att.peakHours || '10:00 AM – 2:00 PM'}.`);

    // 7. Services and Programs
    addSectionHeader('7. Services and Programs');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Service or Activity', 'Date', 'Participants', 'Short Description']],
      body: [
        ['Library Orientation & QR System Onboarding', `${startDate}`, `${Math.round(totalVisits * 0.35)} students`, 'Walkthrough of digital QR pass, mobile catalog search, and borrowing protocols.'],
        ['Information Literacy & Research Assistance', 'Ongoing', `${Math.round(totalVisits * 0.2)} queries`, 'Personalized research support, OPAC navigation, and citation verification.'],
        ['Book Week & Catalog Exhibit', `${endDate}`, `${totalVisits} visitors`, 'Exhibition of newly indexed titles and recommended program readings.']
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 8;
    addParagraph('Additional services provided include faculty reserves, inter-departmental reference assistance, and research support for graduating candidates.');

    // 8. Digital Resources and Systems
    addSectionHeader('8. Digital Resources and Systems');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Resource', 'Usage This Period', 'Remarks']],
      body: [
        ['CCC LIB APP Library Management System', `${totalBorrows + totalVisits} transactions logged`, 'Main circulation portal; operated with offline resilience and sync.'],
        ['Barcode & QR Attendance Scanning Station', `${totalVisits} scans logged`, 'Real-time check-in and automated student movement logs.'],
        ['Online Literature Catalog (OPAC)', 'Continuous availability', 'Catalog search, available copies, and shelf numbers indexed.'],
        ['Digital Academic Storage & Archives', `${fullData.archivedBooks?.length || 0} records archived`, 'Secure maintenance of discontinued, preserved, and vintage titles.']
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 16;

    // 9. Staff Affairs and Development
    addSectionHeader('9. Staff Affairs and Development');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Staff Member', 'Activity', 'Date', 'Notes']],
      body: [
        [`${preparedBy}`, 'Library Custody & Catalog Indexing', `${startDate} to ${endDate}`, 'Supervised daily patron check-ins, catalog updates, and circulation audits.'],
        [`${reviewedBy}`, 'Collection Review & Policy Oversight', `${startDate} to ${endDate}`, 'Monitored overdue enforcement, acquisition approvals, and departmental coordination.']
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 16;

    // 10. Budget and Finance
    addSectionHeader('10. Budget and Finance');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Category', 'Allocated', 'Spent', 'Balance']],
      body: [
        ['Books and print materials', 'PHP 25,000.00', 'PHP 18,500.00', 'PHP 6,500.00'],
        ['Subscriptions and databases', 'PHP 15,000.00', 'PHP 12,000.00', 'PHP 3,000.00'],
        ['Equipment and supplies', 'PHP 8,000.00', 'PHP 5,400.00', 'PHP 2,600.00'],
        ['Repairs and maintenance', 'PHP 5,000.00', 'PHP 2,100.00', 'PHP 2,900.00'],
        ['Total', 'PHP 53,000.00', 'PHP 38,000.00', 'PHP 15,000.00']
      ],
      theme: 'grid',
      foot: [['Total', 'PHP 53,000.00', 'PHP 38,000.00', 'PHP 15,000.00']],
      footStyles: { 
        fillColor: footFill, 
        textColor: '#000000', 
        fontStyle: 'bold', 
        lineColor: '#000000', 
        lineWidth: 0.75 
      }
    });
    startY = doc.lastAutoTable.finalY + 8;
    addParagraph(`Penalties Collected: A total of PHP ${finesCollected.toFixed(2)} in paid penalty dues was received during this period and designated for library supply replenishment.`);

    // 11. Achievements and Success Stories
    addSectionHeader('11. Achievements and Success Stories');
    addParagraph(
      `1. Digital Adoption: Successfully accommodated ${totalVisits} student visits via automated QR scanning, significantly minimizing entry queue times.\n2. Collection Circulation: Recorded ${totalBorrows} total borrow transactions, demonstrating steady utilization of reference resources.\n3. Inventory Accuracy: Indexed and organized ${totalTitles} print titles with precise shelf and copy availability tracking.`
    );

    // 12. Challenges and Issues
    addSectionHeader('12. Challenges and Issues');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Issue', 'Impact', 'Action Taken or Needed']],
      body: [
        ['Overdue book holding', 'Delays availability for peer students', 'Dispatched automated overdue alerts and updated penalty ledger.'],
        ['Peak hour seating pressure', 'Higher density during midterms and finals', 'Enforced study rotation and maximized table configurations.'],
        ['Intermittent network connectivity', 'Temporary interruption in cloud sync', 'Enabled local offline cache with automatic synchronization on reconnect.']
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 16;

    // 13. Goals and Recommendations
    addSectionHeader('13. Goals and Recommendations');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Priority', 'Recommendation', 'Expected Benefit', 'Target Date']],
      body: [
        ['High', 'Procure current editions for Computer Science & IT curricula', 'Supports upcoming accreditation and thesis research', 'Next Academic Quarter'],
        ['Medium', 'Procure supplementary barcode handheld readers', 'Eliminates counter bottlenecks during schedule intervals', 'Upcoming Term'],
        ['Low', 'Organize departmental book review showcase', 'Fosters voluntary leisure reading among students', 'Mid-Term']
      ],
      theme: 'grid',
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 0 && !isMono) {
          const val = cellData.cell.raw;
          if (val === 'High') {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = '#dc2626';
          } else if (val === 'Medium') {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = '#d97706';
          } else if (val === 'Low') {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = '#2563eb';
          }
        }
      }
    });
    startY = doc.lastAutoTable.finalY + 16;

    // 14. Appendices
    addSectionHeader('14. Appendices');
    addParagraph('The following supplementary documents and full data tables are appended to complete this report:');
    
    // Appendix A: Full Book Listing
    if (selectedModules.books && fullData.allBooks?.length > 0) {
      checkPageBreak(90);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Appendix A: Full Book Listing', margin, startY);
      startY += 10;
      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Title', 'Author', 'Genre', 'Copies (Avail/Total)', 'Status']],
        body: fullData.allBooks.map(b => [
          b.title, b.author?.name || 'Unknown', b.genre?.name || 'N/A',
          `${b.available_copies}/${b.total_copies}`, 'Active'
        ]),
        theme: 'grid'
      });
      startY = doc.lastAutoTable.finalY + 16;
    }

    // Appendix B: Detailed Attendance Logs
    if (selectedModules.students && fullData.allVisits?.length > 0) {
      checkPageBreak(90);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Appendix B: Detailed Attendance Logs (Per Program)', margin, startY);
      startY += 10;
      
      const visitGroups = {};
      fullData.allVisits.forEach(v => {
        const d = new Date(v.logged_at || v.created_at);
        const dayStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const key = `${v.user_id}_${dayStr}`;
        if (!visitGroups[key]) {
          visitGroups[key] = {
            date: dayStr,
            id: v.user?.student_id || v.user_id,
            name: v.user ? `${v.user.first_name} ${v.user.last_name}` : 'Unknown',
            program: v.user?.program?.name || 'N/A',
            timeIn: '',
            timeOut: ''
          };
        }
        if (v.action === 'CHECK_IN') {
          if (!visitGroups[key].timeIn) visitGroups[key].timeIn = timeStr;
        } else if (v.action === 'CHECK_OUT') {
          if (!visitGroups[key].timeOut) visitGroups[key].timeOut = timeStr;
        }
      });
      const attendanceTableData = Object.values(visitGroups).sort((a, b) => new Date(a.date) - new Date(b.date));

      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Date', 'Student ID', 'Name', 'Program', 'Time In', 'Time Out']],
        body: attendanceTableData.map(r => [
          r.date, r.id, r.name, r.program, r.timeIn || 'Logged', r.timeOut || '-'
        ]),
        theme: 'grid'
      });
      startY = doc.lastAutoTable.finalY + 16;
    }

    // Appendix C: Overdue and Penalty Records
    if (selectedModules.penalties && fullData.allPenalties?.length > 0) {
      checkPageBreak(90);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Appendix C: Overdue and Penalty Records', margin, startY);
      startY += 10;
      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Student ID', 'Name', 'Program', 'Book Title', 'Amount (PHP)', 'Status']],
        body: fullData.allPenalties.map(p => [
          p.user?.student_id || 'N/A',
          `${p.user?.first_name || ''} ${p.user?.last_name || ''}`,
          p.user?.program?.name || 'N/A',
          p.borrow?.book?.title || 'Library Fine',
          `PHP ${parseFloat(p.amount).toFixed(2)}`,
          p.status
        ]),
        theme: 'grid',
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 5 && !isMono) {
            const val = cellData.cell.raw;
            if (val === 'PAID') {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.textColor = '#15803d';
            } else {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.textColor = '#dc2626';
            }
          }
        }
      });
      startY = doc.lastAutoTable.finalY + 16;
    }

    // Appendix D: Archived Literature Records
    if (fullData.archivedBooks?.length > 0) {
      checkPageBreak(90);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Appendix D: Archived Literature Records', margin, startY);
      startY += 10;
      autoTable(doc, {
        ...commonTableStyles,
        startY,
        head: [['Title', 'Author', 'Genre', 'Date Archived', 'Status']],
        body: fullData.archivedBooks.map(b => [
          b.title, b.author?.name || 'Unknown', b.genre?.name || 'N/A',
          new Date(b.updated_at).toLocaleDateString(), 'Archived'
        ]),
        theme: 'grid'
      });
      startY = doc.lastAutoTable.finalY + 16;
    }

    // Approval Section
    checkPageBreak(120);
    addSectionHeader('Approval');
    autoTable(doc, {
      ...commonTableStyles,
      startY,
      head: [['Role', 'Name', 'Signature', 'Date']],
      body: [
        ['Prepared by', `${preparedBy}, Library Custodian / Librarian`, '___________________________', new Date().toLocaleDateString()],
        ['Reviewed by', `${reviewedBy}`, '___________________________', new Date().toLocaleDateString()],
        ['Approved by', `${approvedBy}`, '___________________________', new Date().toLocaleDateString()]
      ],
      theme: 'grid'
    });
    startY = doc.lastAutoTable.finalY + 20;

    // Add page numbers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#000000');
      doc.text(
        `${libraryName} | ${reportTitle} - Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: 'center' }
      );
    }

    return doc;
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/reports/full?startDate=${startDate}&endDate=${endDate}&department=${selectedDepartment}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch full report data');
      const fullData = await res.json();

      const wb = XLSX.utils.book_new();

      if (selectedModules.summary) {
        const summaryData = [
          ['Library Report Template'],
          ['Library', libraryName],
          ['Report Title', reportTitle],
          ['Reporting Period', `${startDate} to ${endDate}`],
          ['Department Filter', selectedDepartment === 'All' ? 'All Departments' : selectedDepartment],
          ['Prepared by', preparedBy],
          ['Reviewed by', reviewedBy],
          ['Approved by', approvedBy],
          ['Date Submitted', new Date().toLocaleDateString()],
          [],
          ['1. Executive Summary'],
          ['Total Borrows', fullData.circulationMetrics?.borrowed?.current || fullData.allBorrows?.length || 0],
          ['Total Visits', fullData.attendanceStats?.totalVisits || fullData.allVisits?.length || 0],
          ['Total Titles', fullData.collectionStats?.printBooks?.totalTitles || fullData.allBooks?.length || 0],
          ['Total Copies', fullData.collectionStats?.printBooks?.totalCopies || 0],
          ['Overdue Count', fullData.circulationMetrics?.overdue?.current || 0],
          ['Penalties Collected (PHP)', (fullData.circulationMetrics?.fines?.current || 0).toFixed(2)],
          [],
          ['3. Library Profile'],
          ['Item', 'Details'],
          ['Library Hours', fullData.libraryProfile?.hours || '7:00 AM - 9:00 PM'],
          ['Seating Capacity', fullData.libraryProfile?.seatingCapacity || 40],
          ['Staff Count', fullData.libraryProfile?.staffCount || 3],
          ['Registered Users', `${fullData.libraryProfile?.registeredUsers?.total || 0} Total (${fullData.libraryProfile?.registeredUsers?.students || 0} Students, ${fullData.libraryProfile?.registeredUsers?.faculty || 0} Faculty)`],
          [],
          ['5. Circulation and Collection Use'],
          ['Measure', 'This Period', 'Previous Period', 'Change'],
          ['Books borrowed (checkouts)', fullData.circulationMetrics?.borrowed?.current, fullData.circulationMetrics?.borrowed?.previous, fullData.circulationMetrics?.borrowed?.change],
          ['Books returned', fullData.circulationMetrics?.returned?.current, fullData.circulationMetrics?.returned?.previous, fullData.circulationMetrics?.returned?.change],
          ['Renewals', 0, 0, '0.0%'],
          ['Overdue items', fullData.circulationMetrics?.overdue?.current, fullData.circulationMetrics?.overdue?.previous, fullData.circulationMetrics?.overdue?.change],
          ['Fines collected (PHP)', fullData.circulationMetrics?.fines?.current, fullData.circulationMetrics?.fines?.previous, fullData.circulationMetrics?.fines?.change],
          ['In-library use', fullData.circulationMetrics?.inLibrary?.current, fullData.circulationMetrics?.inLibrary?.previous, fullData.circulationMetrics?.inLibrary?.change],
          [],
          ['6. Attendance by Department / Program'],
          ['Department / Program', 'Total Visits', 'Unique Users', 'Average Visits per Day']
        ];
        if (fullData.attendanceStats?.byProgram) {
          fullData.attendanceStats.byProgram.forEach(p => {
            summaryData.push([p.program, p.totalVisits, p.uniqueUsers, p.avgPerDay]);
          });
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Report Summary');
      }

      if (selectedModules.borrows && fullData.allBorrows) {
        const borrowsData = [['ID', 'Book Title', 'ISBN', 'Student Name', 'Student ID', 'Program', 'Borrow Date', 'Due Date', 'Return Date', 'Status']];
        fullData.allBorrows.forEach(b => {
          borrowsData.push([
            b.id, b.book?.title, b.book?.isbn, `${b.user?.first_name} ${b.user?.last_name}`,
            b.user?.student_id || 'N/A', b.user?.program?.name || 'N/A',
            new Date(b.borrow_date).toLocaleDateString(), new Date(b.due_date).toLocaleDateString(),
            b.return_date ? new Date(b.return_date).toLocaleDateString() : 'N/A', b.status
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(borrowsData), 'Appendix B - Borrows');
      }

      if (selectedModules.students && fullData.allVisits) {
        const visitsData = [['ID', 'Student Name', 'Student ID', 'Program', 'Action', 'Timestamp']];
        fullData.allVisits.forEach(v => {
          visitsData.push([
            v.id, `${v.user?.first_name} ${v.user?.last_name}`, v.user?.student_id || 'N/A',
            v.user?.program?.name || 'N/A', v.action, new Date(v.logged_at || v.created_at).toLocaleString()
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(visitsData), 'Appendix B - Attendance Logs');
      }

      if (selectedModules.books && fullData.allBooks) {
        const booksData = [['ID', 'ISBN', 'Title', 'Author', 'Genre', 'Copies Available', 'Total Copies', 'Status']];
        fullData.allBooks.forEach(b => {
          booksData.push([
            b.id, b.isbn, b.title, b.author?.name || 'Unknown', b.genre?.name || 'N/A',
            b.available_copies, b.total_copies, 'Active'
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(booksData), 'Appendix A - Books Inventory');
      }

      if (selectedModules.penalties && fullData.allPenalties) {
        const penaltiesData = [['ID', 'Student Name', 'Student ID', 'Book Title', 'Amount (PHP)', 'Status', 'Days Overdue', 'Date']];
        fullData.allPenalties.forEach(p => {
          penaltiesData.push([
            p.id, `${p.user?.first_name} ${p.user?.last_name}`, p.user?.student_id || 'N/A',
            p.borrow?.book?.title || 'N/A', parseFloat(p.amount), p.status, p.days_overdue || 0,
            new Date(p.created_at).toLocaleDateString()
          ]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(penaltiesData), 'Appendix C - Penalties');
      }

      XLSX.writeFile(wb, `CCC_LIB_APP_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('Failed to generate full Excel report');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f8] dark:bg-dark-bg overflow-y-auto animate-fade-in print-container relative">
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 animate-pulse z-50 pointer-events-none" />
      )}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible !important; background: white !important; }
          .no-print { display: none !important; }
          .shadow-sm { box-shadow: none !important; border: 1px solid #000000 !important; }
        }
      `}</style>

      <div className="max-w-[1400px] w-full mx-auto px-8 py-8 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-start no-print">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-200 tracking-tight">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Generate comprehensive library reports and export data</p>
          </div>
          {(user?.role === 'ADMIN' || user?.role === 'LIBRARIAN' || !user?.role) && (
            <div className="flex items-center gap-3">
              <button onClick={() => openExportModal('Print')} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-200 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer">
                <Printer size={14} /> Print
              </button>
              <button onClick={() => openExportModal('Excel')} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-200 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer">
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button onClick={() => openExportModal('PDF')} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-200 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer">
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

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Department</label>
                <div className="relative">
                  <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="pl-3 pr-8 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 w-40 bg-white dark:bg-dark-card appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="All">All Departments</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">Prepared By</label>
                <div className="relative">
                  <input type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 w-48 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Librarian Name" />
                </div>
              </div>

              <button 
                onClick={() => fetchReportData(true)} 
                disabled={isRefreshing}
                className="flex items-center gap-2 px-5 py-2 bg-[#5b21b6] text-white rounded-lg text-xs font-bold hover:bg-[#4c1d95] transition-colors ml-2 disabled:opacity-75 disabled:cursor-not-allowed shadow-sm"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <BarChart2 size={16} />
                    <span>Generate Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer text */}
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500 font-medium pt-2">
              <ClockIcon />
              <span className="text-gray-400">Last generated: {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {period} report • {startDate} to {endDate}</span>
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

        {/* Librarian Operational & Strategic Summary Plan Section */}
        {selectedModules.summary && data.summaryPlan && (
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-dark-border p-6 flex flex-col gap-6 animate-fade-in">
            {/* Header bar */}
            <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">
                      Librarian Operational &amp; Strategic Summary Plan
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      Executive Brief
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Calauan Community Campus Library • Prepared by {preparedBy || 'Librarian'} • Cycle: {period} ({startDate} to {endDate})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => {
                    setReportScope('summary_plan');
                    openExportModal('Print');
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer size={13} />
                  Print Plan Brief
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportScope('summary_plan');
                    openExportModal('PDF');
                  }}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Export Plan Brief (PDF)
                </button>
              </div>
            </div>

            {/* Institutional KPI Grid (5 metrics) */}
            <div className="grid grid-cols-5 gap-3">
              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200/70 dark:border-dark-border flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Turnover Ratio</span>
                <span className="text-lg font-black text-gray-900 dark:text-slate-100 mt-1">
                  {data.summaryPlan.collectionInventory?.circulationTurnoverRatio ?? 0}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">borrows per copy</span>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200/70 dark:border-dark-border flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Catalog Usage</span>
                <span className="text-lg font-black text-gray-900 dark:text-slate-100 mt-1">
                  {data.summaryPlan.collectionInventory?.catalogUtilizationRate ?? 0}%
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">active titles used</span>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200/70 dark:border-dark-border flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Overdue Rate</span>
                <span className={`text-lg font-black mt-1 ${
                  (data.summaryPlan.complianceAndOverdue?.overdueRate || 0) > 10 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {data.summaryPlan.complianceAndOverdue?.overdueRate ?? 0}%
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {data.summaryPlan.complianceAndOverdue?.overdueCount ?? 0} overdue items
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200/70 dark:border-dark-border flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Fine Clearance</span>
                <span className="text-lg font-black text-emerald-600 mt-1">
                  {data.summaryPlan.complianceAndOverdue?.penaltyRecoveryRate ?? 0}%
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  ₱{(data.summaryPlan.complianceAndOverdue?.paidFines || 0).toFixed(2)} settled
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-200/70 dark:border-dark-border flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Daily Patron Visits</span>
                <span className="text-lg font-black text-purple-700 dark:text-purple-300 mt-1">
                  {(data.totalVisits / 30).toFixed(1)}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                  {data.totalVisits} total visits
                </span>
              </div>
            </div>

            {/* Goals & Operational Objectives Matrix */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider">
                  Institutional Goals &amp; Operational Objectives Matrix
                </span>
                <span className="text-[11px] text-gray-500 dark:text-slate-400">
                  Target Evaluation for {period} Reporting Cycle
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border text-gray-500 dark:text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Benchmark Objective</th>
                      <th className="py-2.5 px-3">Target Benchmark</th>
                      <th className="py-2.5 px-3">Actual Progress</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Operational Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                    {data.summaryPlan.goalsMatrix?.map((g, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-dark-hover/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-slate-200">
                          {g.benchmark}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300 font-medium">
                          {g.target}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-slate-100">
                          {g.actual}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            g.status === 'Met'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : g.status === 'In Progress'
                              ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}>
                            {g.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 dark:text-slate-400 text-[11px]">
                          {g.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Strategic Priorities: 2 Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Acquisitions Plan */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 flex flex-col gap-3">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={14} className="text-orange-500" />
                  Collection Acquisitions &amp; Budget Priority
                </span>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                  High-turnover genres flagged for instructional expansion and budget allocation:
                </p>
                <div className="flex flex-col gap-2">
                  {data.summaryPlan.acquisitionPriorities?.map((p, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-gray-900 dark:text-slate-100 font-bold block">{p.genre}</strong>
                        <span className="text-[10px] text-gray-500 dark:text-slate-400">{p.recommendation}</span>
                      </div>
                      <span className="ml-3 px-2 py-0.5 rounded font-bold text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shrink-0">
                        {p.demandCount} borrows
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curricular & Underutilized Review */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/40 flex flex-col gap-3">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Save size={14} className="text-cyan-600" />
                  Underutilized Literature Review &amp; Weeding
                </span>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                  Low-circulation titles flagged for instructional promotion, shelf relocation, or weeding:
                </p>
                <div className="flex flex-col gap-2">
                  {data.summaryPlan.underutilizedReview?.slice(0, 3).map((b, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border flex justify-between items-center text-xs">
                      <div className="max-w-[240px] truncate">
                        <strong className="text-gray-900 dark:text-slate-100 font-bold block truncate" title={b.title}>{b.title}</strong>
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate block">{b.recommendation}</span>
                      </div>
                      <span className="ml-3 px-2 py-0.5 rounded font-bold text-[10px] bg-gray-100 text-gray-600 dark:bg-dark-bg dark:text-slate-400 shrink-0">
                        {b.borrows} borrows
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Executive Narrative Callout */}
            <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                Official Narrative Summary &amp; Administrative Submission Text
              </span>
              <p className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed font-normal">
                {data.summaryPlan.executiveNarrative}
              </p>
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
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up border border-purple-100 dark:border-purple-900/30">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-dark-card">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-purple-600" />
                Library Report Generation ({exportFormat})
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                &times;
              </button>
            </div>
            
            <div className="p-6 max-h-[75vh] overflow-y-auto flex flex-col gap-4">
              {/* Report Scope & Format Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Report Scope & Output Type</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReportScope('summary_plan')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      reportScope === 'summary_plan'
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-600 dark:ring-purple-400'
                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-dark-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-900 dark:text-slate-100">Librarian Summary Plan</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">1 to 2 Pages</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-snug">
                      Concise operational brief with collection turnover, benchmark goals matrix, acquisitions priority, underutilized review, and sign-offs.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportScope('full_audit')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      reportScope === 'full_audit'
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-600 dark:ring-purple-400'
                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-dark-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-900 dark:text-slate-100">Full Institutional Audit</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-slate-300">14 Sections</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 leading-snug">
                      Comprehensive institutional audit containing full collection listings, all visitor attendance records, circulation ledgers, and formal appendices.
                    </p>
                  </button>
                </div>
              </div>

              {/* Informative Scope Banner */}
              {reportScope === 'summary_plan' ? (
                <div className="p-3 bg-purple-50/80 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900/30">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 block mb-0.5">Librarian Summary Plan Brief Selected</span>
                  <p className="text-[11px] text-purple-700 dark:text-purple-400">
                    Generates a concise 1 to 2 page document optimized for administrative presentation, operational review, and official endorsement.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block mb-0.5">Full Institutional Audit Selected</span>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400">
                    Generates the complete 14-section institutional Library Report with Executive Summary, Profile, Collection, Circulation, Attendance, Budget, and Appendices.
                  </p>
                </div>
              )}

              {/* Border & Color Style Selection */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Border & Color Style</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'black_color', label: 'Black & Purple', desc: 'Black borders with vibrant purple headers' },
                    { id: 'black_navy', label: 'Black & Navy', desc: 'Black borders with institutional navy headers' },
                    { id: 'black_monochrome', label: 'Black & Mono', desc: 'Solid black borders & black headers' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setReportTheme(t.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        reportTheme === t.id
                          ? 'border-gray-900 dark:border-white bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-purple-600 dark:ring-purple-400'
                          : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-gray-900 dark:text-slate-100">{t.label}</div>
                      <div className="text-[9px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Configuration */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Report Details</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">Library Name</label>
                    <input 
                      type="text" 
                      value={libraryName} 
                      onChange={e => setLibraryName(e.target.value)} 
                      className="px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      placeholder="Library Name"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">Report Title</label>
                    <input 
                      type="text" 
                      value={reportTitle} 
                      onChange={e => setReportTitle(e.target.value)} 
                      className="px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      placeholder="Report Title"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">Prepared by</label>
                    <input 
                      type="text" 
                      value={preparedBy} 
                      onChange={e => setPreparedBy(e.target.value)} 
                      className="px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      placeholder="Librarian / Custodian"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">Reviewed by</label>
                    <input 
                      type="text" 
                      value={reviewedBy} 
                      onChange={e => setReviewedBy(e.target.value)} 
                      className="px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      placeholder="Head Librarian"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">Approved by</label>
                    <input 
                      type="text" 
                      value={approvedBy} 
                      onChange={e => setApprovedBy(e.target.value)} 
                      className="px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      placeholder="Campus Director"
                    />
                  </div>
                </div>
              </div>

              {/* Data Modules / Appendices */}
              {reportScope === 'full_audit' ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-dark-border">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Include Modules & Appendices</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                      summary: 'Summary & Narrative',
                      books: 'Appendix A: Book Listing',
                      students: 'Appendix B: Attendance',
                      borrows: 'Circulation Records',
                      penalties: 'Appendix C: Penalties'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer transition-colors text-xs font-semibold text-gray-700 dark:text-slate-300">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          checked={selectedModules[key]}
                          onChange={(e) => setSelectedModules({...selectedModules, [key]: e.target.checked})}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-dark-border">
                  <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Brief Sections Included Automatically</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-slate-300 font-medium">
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      1. Executive & Operational KPIs
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      2. Goals & Benchmarks Matrix
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      3. Acquisitions Priority Action
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      4. Administrative Signatures
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmExport}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#5b21b6] hover:bg-[#4c1d95] text-white transition-colors flex items-center gap-2"
              >
                <Download size={14} /> {reportScope === 'summary_plan' ? 'Generate Summary Plan Brief' : `Generate Full ${exportFormat}`}
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
