import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Plus, Filter, Download, Printer, Upload, BookCopy, User, 
  Tag, QrCode, BookOpen, CheckCircle, XCircle, Library, FileSpreadsheet, FileText,
  List, Grid, Edit3, Trash2, ChevronDown, ChevronRight, X, LayoutGrid, CheckSquare, 
  Bell, Sun, Moon, ToggleRight, ToggleLeft, FileCode2, Loader2,
  Archive, RotateCcw, Calendar, AlertTriangle, AlertCircle, Info, Check, ArchiveRestore
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import NotificationDropdown from '../components/NotificationDropdown';
import QRCode from 'react-qr-code';
import { useTheme } from '../components/ThemeContext';
import Pagination from '../components/Pagination';

export default function Literatures() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('Literature Catalog');
  const [books, setBooks] = useState([]);
  const [archivedBooks, setArchivedBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreSearch, setGenreSearch] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');
  
  // Selection for Active Books
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [selectedQRs, setSelectedQRs] = useState([]);

  // Selection for Archived Books
  const [selectedArchivedBooks, setSelectedArchivedBooks] = useState([]);
  
  // Filtering and Sorting - Active
  const [sortBy, setSortBy] = useState('Default');
  const [availabilityFilter, setAvailabilityFilter] = useState('All Books');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering and Sorting - Archived
  const [archivedSearchQuery, setArchivedSearchQuery] = useState('');
  const [archivedSortBy, setArchivedSortBy] = useState('Recently Archived');

  // View mode for Literature Catalog: 'list' | 'grid'
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('liblog_catalog_view_mode') || 'list');

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('liblog_catalog_view_mode', mode);
    } catch (_) {}
  };

  // Pagination States (10 lines per page)
  const [literaturePage, setLiteraturePage] = useState(1);
  const [authorPage, setAuthorPage] = useState(1);
  const [qrPage, setQrPage] = useState(1);
  const [qrSearch, setQrSearch] = useState('');

  // Reset pagination when search / filters change
  useEffect(() => {
    setLiteraturePage(1);
  }, [searchQuery, sortBy, availabilityFilter]);

  useEffect(() => {
    setAuthorPage(1);
  }, [authorSearch]);

  useEffect(() => {
    setQrPage(1);
  }, [qrSearch]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedQRBook, setSelectedQRBook] = useState(null);
  
  // Print Modal State
  const [printConfig, setPrintConfig] = useState({
    type: 'Book Catalog',
    header: true,
    timestamp: true,
    landscape: false
  });
  const [editingBook, setEditingBook] = useState(null);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [booksToDelete, setBooksToDelete] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Archive by Year Modal State
  const currentCalendarYear = new Date().getFullYear();
  const [isYearArchiveModalOpen, setIsYearArchiveModalOpen] = useState(false);
  const [archiveCutoffYear, setArchiveCutoffYear] = useState(currentCalendarYear - 10);
  const [yearPreviewData, setYearPreviewData] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isArchivingByYear, setIsArchivingByYear] = useState(false);

  // Archive Confirm Modal State (Single or Bulk)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [booksToArchive, setBooksToArchive] = useState([]);
  const [isArchiving, setIsArchiving] = useState(false);

  // Restore Confirm Modal State (Single or Bulk)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [booksToRestore, setBooksToRestore] = useState([]);
  const [isRestoring, setIsRestoring] = useState(false);

  // Notification Banner
  const [actionAlert, setActionAlert] = useState(null);

  // Global theme context
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    isbn: '', title: '', authorName: '', genreName: '', lccn: '', year_published: '', shelf_number: '', total_copies: 1, condition: 'GOOD', library_use_only: false
  });
  
  const fileInputRef = useRef(null);

  const showAlert = (message, type = 'success') => {
    setActionAlert({ message, type });
    setTimeout(() => {
      setActionAlert(prev => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Fetch real data from backend
  const fetchAllData = async () => {
    try {
      const [booksRes, archRes, authorsRes, genresRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/books`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false })),
        fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/archived`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false })),
        fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/authors`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false })),
        fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/genres`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false }))
      ]);

      if (booksRes.ok) setBooks(await booksRes.json());
      if (archRes.ok) setArchivedBooks(await archRes.json());
      if (authorsRes.ok) setAuthors(await authorsRes.json());
      if (genresRes.ok) setGenres(await genresRes.json());
    } catch (error) {
      console.error('Failed to fetch literature data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/books`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setBooks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchArchivedBooks = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/archived`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setArchivedBooks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Sync state with URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'archived') setActiveTab('Archived Literatures');
    else if (tabParam === 'author') setActiveTab('Author Catalog');
    else if (tabParam === 'genre') setActiveTab('Genre Catalog');
    else if (tabParam === 'qr') setActiveTab('QR of Literatures');
    else setActiveTab('Literature Catalog');
  }, [searchParams]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    let tabParam = 'catalog';
    if (tabName === 'Archived Literatures') tabParam = 'archived';
    else if (tabName === 'Author Catalog') tabParam = 'author';
    else if (tabName === 'Genre Catalog') tabParam = 'genre';
    else if (tabName === 'QR of Literatures') tabParam = 'qr';
    setSearchParams({ tab: tabParam });
  };

  // Year-based Archiving
  const fetchYearPreview = async (year) => {
    if (!year || isNaN(year)) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/archive-preview?year=${year}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setYearPreviewData(data);
      }
    } catch (err) {
      console.error('Error previewing year archive:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleOpenYearArchiveModal = () => {
    const initialYear = currentCalendarYear - 10;
    setArchiveCutoffYear(initialYear);
    fetchYearPreview(initialYear);
    setIsYearArchiveModalOpen(true);
  };

  const handleYearChange = (yearVal) => {
    const parsed = parseInt(yearVal, 10);
    setArchiveCutoffYear(yearVal);
    if (!isNaN(parsed)) {
      fetchYearPreview(parsed);
    }
  };

  const handleConfirmYearArchive = async () => {
    setIsArchivingByYear(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/archive-by-year`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ year: parseInt(archiveCutoffYear, 10) })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Books successfully archived.', 'success');
        setIsYearArchiveModalOpen(false);
        fetchAllData();
      } else {
        showAlert(data.error || 'Failed to archive books.', 'error');
      }
    } catch (err) {
      showAlert('Network error while archiving books.', 'error');
    } finally {
      setIsArchivingByYear(false);
    }
  };

  // Individual / Bulk Archive
  const handleOpenArchiveSingle = (book) => {
    setBooksToArchive([book]);
    setIsArchiveModalOpen(true);
  };

  const handleBulkArchive = () => {
    const selected = books.filter(b => selectedBooks.includes(b.id));
    setBooksToArchive(selected);
    setIsArchiveModalOpen(true);
  };

  const confirmArchive = async () => {
    setIsArchiving(true);
    try {
      const ids = booksToArchive.map(b => b.id);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/archive-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Books archived successfully.', 'success');
        setSelectedBooks([]);
        setIsArchiveModalOpen(false);
        fetchAllData();
      } else {
        showAlert(data.error || 'Failed to archive selected books.', 'error');
      }
    } catch (err) {
      showAlert('Network error while archiving.', 'error');
    } finally {
      setIsArchiving(false);
    }
  };

  // Individual / Bulk Restore
  const handleOpenRestoreSingle = (book) => {
    setBooksToRestore([book]);
    setIsRestoreModalOpen(true);
  };

  const handleBulkRestore = () => {
    const selected = archivedBooks.filter(b => selectedArchivedBooks.includes(b.id));
    setBooksToRestore(selected);
    setIsRestoreModalOpen(true);
  };

  const confirmRestore = async () => {
    setIsRestoring(true);
    try {
      const ids = booksToRestore.map(b => b.id);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/restore-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Books restored successfully.', 'success');
        setSelectedArchivedBooks([]);
        setIsRestoreModalOpen(false);
        fetchAllData();
      } else {
        showAlert(data.error || 'Failed to restore selected books.', 'error');
      }
    } catch (err) {
      showAlert('Network error while restoring books.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleAddClick = () => {
    setEditingBook(null);
    setFormData({ isbn: '', title: '', authorName: '', genreName: '', lccn: '', year_published: '', shelf_number: '', total_copies: 1, condition: 'GOOD', library_use_only: false });
    setIsModalOpen(true);
  };

  const handleEditClick = (book) => {
    setEditingBook(book);
    setFormData({
      isbn: book.isbn || '',
      title: book.title || '',
      authorName: book.author !== 'Unknown' ? book.author : '',
      genreName: book.genre !== 'Unknown' ? book.genre : '',
      lccn: book.lccn !== 'N/A' ? book.lccn : '',
      year_published: book.year !== 'N/A' ? book.year : '',
      shelf_number: book.shelf !== 'N/A' ? book.shelf : '',
      total_copies: book.total || 1,
      condition: book.condition || 'GOOD',
      library_use_only: Boolean(book.library_use_only)
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBook 
        ? `${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/books/${editingBook.id}`
        : `${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/books`;
      const method = editingBook ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchAllData();
        showAlert(editingBook ? 'Book updated successfully.' : 'Book added to catalog.', 'success');
      } else {
        showAlert('Failed to save book', 'error');
      }
    } catch (error) {
      console.error('Failed to submit form', error);
      showAlert('Operation failed', 'error');
    }
  };

  const handleImportSubmit = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    
    const lines = importText.trim().split('\n');
    let successCount = 0;

    for (let line of lines) {
      const parts = line.split('/').map(p => p.trim());
      if (parts.length < 8) continue;
      if (parts[0].toLowerCase() === 'title' && parts[3].toLowerCase() === 'isbn') continue;
      
      const title = parts[0];
      const authorName = parts[1];
      const genreName = parts[2];
      const isbn = parts[3];
      const lccn = parts[4];
      const year_published = parts[5];
      const total_copies = parseInt(parts[6]) || 1;
      const condition = parts[7].toUpperCase();
      const library_use_only = parts[8]
        ? ['YES', 'Y', 'TRUE', '1', 'IN CIRCULATION', 'LIBRARY USE ONLY'].includes(parts[8].toUpperCase())
        : false;
      
      const shelf_number = genreName ? `${genreName.substring(0, 3).toUpperCase()}-01` : 'GEN-01';

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/books`, { method: 'POST', headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            title, authorName, genreName, isbn, lccn, year_published, total_copies, condition, shelf_number, library_use_only
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error('Failed to import book', title, err);
      }
    }
    
    setIsImporting(false);
    showAlert(`Successfully imported ${successCount} books.`, 'success');
    setImportText('');
    setIsImportModalOpen(false);
    fetchAllData();
  };

  const handleDelete = (id) => {
    setBooksToDelete([id]);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDelete = () => {
    setBooksToDelete(selectedBooks);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteArchived = () => {
    setBooksToDelete(selectedArchivedBooks);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      let failedCount = 0;
      let lastError = '';
      
      await Promise.all(booksToDelete.map(async id => {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://liblog-backend.onrender.com/api'}/literatures/books/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          lastError = data.error || 'Failed to delete';
          failedCount++;
        } else {
          setSelectedBooks(prev => prev.filter(bId => bId !== id));
          setSelectedArchivedBooks(prev => prev.filter(bId => bId !== id));
        }
      }));
      
      if (failedCount > 0) {
        showAlert(`Failed to delete ${failedCount} book(s). Reason: ${lastError}`, 'error');
      } else {
        showAlert('Book(s) deleted permanently.', 'success');
      }
      
      fetchAllData();
      setIsDeleteModalOpen(false);
      if (failedCount === 0) setBooksToDelete([]);
    } catch (err) {
      console.error(err);
      showAlert('An error occurred during deletion.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSelected = () => {
    if (selectedBooks.length === 1) {
      const bookToEdit = books.find(b => b.id === selectedBooks[0]);
      if (bookToEdit) handleEditClick(bookToEdit);
    } else {
      showAlert('Please select exactly one book to edit.', 'error');
    }
  };

  // Export functions
  const handleExportCSV = () => {
    const headers = ['ISBN', 'Title', 'Author', 'LCCN', 'Year', 'Genre', 'Shelf', 'Total Copies', 'Available', 'In Circulation'];
    const rows = books.map(b => [b.isbn, `"${b.title}"`, `"${b.author}"`, b.lccn, b.year, b.genre, b.shelf, b.total, b.available, b.library_use_only ? 'YES' : 'NO']);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'library_active_catalog.csv';
    link.click();
  };

  const handleExportArchivedCSV = () => {
    const headers = ['ISBN', 'Title', 'Author', 'LCCN', 'Year', 'Genre', 'Shelf', 'Total Copies', 'Archived Date'];
    const rows = archivedBooks.map(b => [b.isbn, `"${b.title}"`, `"${b.author}"`, b.lccn, b.year, b.genre, b.shelf, b.total, b.updated_at ? new Date(b.updated_at).toLocaleDateString() : 'N/A']);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'library_archived_books.csv';
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Library Literature Catalog', 14, 15);
    const tableData = books.map(b => [b.isbn, b.title, b.author, b.genre, b.available + '/' + b.total]);
    doc.autoTable({
      head: [['ISBN', 'Title', 'Author', 'Genre', 'Avail/Total']],
      body: tableData,
      startY: 20
    });
    doc.save('library_catalog.pdf');
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const executePrint = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleViewQRCode = (book) => {
    setSelectedQRBook(book);
    setIsQRModalOpen(true);
  };
  
  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${selectedQRBook.qr_code || selectedQRBook.isbn || selectedQRBook.id || 'book'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const triggerImport = () => {
    setIsImportModalOpen(true);
  };

  const handleImportFile = (e) => {
    if(e.target.files && e.target.files[0]) {
      showAlert(`Processing import of ${e.target.files[0].name}`, 'info');
      e.target.value = null;
    }
  };

  // Selection Logic - Active
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBooks(filteredBooks.map(b => b.id));
    } else {
      setSelectedBooks([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedBooks.includes(id)) {
      setSelectedBooks(selectedBooks.filter(bid => bid !== id));
    } else {
      setSelectedBooks([...selectedBooks, id]);
    }
  };

  const clearSelection = () => {
    setSelectedBooks([]);
  };

  // Selection Logic - Archived
  const handleSelectAllArchived = (e, items) => {
    if (e.target.checked) {
      setSelectedArchivedBooks(items.map(b => b.id));
    } else {
      setSelectedArchivedBooks([]);
    }
  };

  const handleSelectOneArchived = (id) => {
    if (selectedArchivedBooks.includes(id)) {
      setSelectedArchivedBooks(selectedArchivedBooks.filter(bid => bid !== id));
    } else {
      setSelectedArchivedBooks([...selectedArchivedBooks, id]);
    }
  };

  const clearArchivedSelection = () => {
    setSelectedArchivedBooks([]);
  };

  const autoFormatISBN = (value) => {
    const v = value.replace(/\D/g, '');
    let formatted = '';
    if (v.length > 0) formatted += v.substring(0, 3);
    if (v.length > 3) formatted += '-' + v.substring(3, 4);
    if (v.length > 4) formatted += '-' + v.substring(4, 7);
    if (v.length > 7) formatted += '-' + v.substring(7, 12);
    if (v.length > 12) formatted += '-' + v.substring(12, 13);
    return formatted;
  };

  // Filtering & Sorting Logic - Active Books
  let filteredBooks = books.filter(b => {
    const matchQuery = (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (b.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (b.isbn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (b.lccn || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchFilter = availabilityFilter === 'All Books' || 
                        (availabilityFilter === 'Available' && b.available > 0) ||
                        (availabilityFilter === 'Borrowed' && b.available < b.total) ||
                        (availabilityFilter === 'Overdue' && false) ||
                        (availabilityFilter === 'Lost' && false);
    
    return matchQuery && matchFilter;
  });

  filteredBooks.sort((a, b) => {
    if (sortBy === 'Title A-Z') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'Title Z-A') return (b.title || '').localeCompare(a.title || '');
    if (sortBy === 'Year Newest') return parseInt(b.year || 0) - parseInt(a.year || 0);
    if (sortBy === 'Year Oldest') return parseInt(a.year || 0) - parseInt(b.year || 0);
    if (sortBy === 'Most Available') return b.available - a.available;
    return 0;
  });

  const toggleAuthor = (id) => {
    setAuthors(authors.map(a => a.id === id ? { ...a, expanded: !a.expanded } : a));
  };

  const toggleGenre = (id) => {
    setGenres(genres.map(g => g.id === id ? { ...g, expanded: !g.expanded } : g));
  };

  const renderTabs = () => (
    <div className="flex items-center gap-6 border-b border-gray-200 dark:border-dark-border shrink-0">
      <button 
        onClick={() => handleTabChange('Literature Catalog')} 
        className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'Literature Catalog' ? 'border-primary-800 text-primary-900 dark:text-purple-300 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
      >
        <BookCopy size={16} className={activeTab === 'Literature Catalog' ? 'text-primary-800 dark:text-purple-400' : ''} />
        <span>Literature Catalog</span>
        <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-slate-300">
          {books.length}
        </span>
      </button>

      <button 
        onClick={() => handleTabChange('Archived Literatures')} 
        className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'Archived Literatures' ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
      >
        <Archive size={16} className={activeTab === 'Archived Literatures' ? 'text-amber-600 dark:text-amber-400' : ''} />
        <span>Archived Literatures</span>
        {archivedBooks.length > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
            {archivedBooks.length}
          </span>
        )}
      </button>

      <button 
        onClick={() => handleTabChange('Author Catalog')} 
        className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'Author Catalog' ? 'border-primary-800 text-primary-900 dark:text-purple-300 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
      >
        <User size={16} className={activeTab === 'Author Catalog' ? 'text-primary-800 dark:text-purple-400' : ''} />
        <span>Author Catalog</span>
      </button>

      <button 
        onClick={() => handleTabChange('Genre Catalog')} 
        className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'Genre Catalog' ? 'border-primary-800 text-primary-900 dark:text-purple-300 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
      >
        <Tag size={16} className={activeTab === 'Genre Catalog' ? 'text-primary-800 dark:text-purple-400' : ''} />
        <span>Genre Catalog</span>
      </button>

      <button 
        onClick={() => handleTabChange('QR of Literatures')} 
        className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'QR of Literatures' ? 'border-primary-800 text-primary-900 dark:text-purple-300 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
      >
        <QrCode size={16} className={activeTab === 'QR of Literatures' ? 'text-primary-800 dark:text-purple-400' : ''} />
        <span>QR of Literatures</span>
      </button>
    </div>
  );

  const renderLiteratureCatalog = () => {
    const paginatedBooks = filteredBooks.slice((literaturePage - 1) * 10, literaturePage * 10);

    return (
      <div className="flex flex-col gap-5 animate-fade-in pb-20 relative">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-200 leading-tight">{books.length}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Active Titles</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-green-50 dark:bg-green-950/40 text-green-500 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-200 leading-tight">{books.filter(b => b.available > 0).length}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Available Now</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <Archive size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-200 leading-tight">{archivedBooks.length}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Archived Books</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center">
            <Library size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-200 leading-tight">{new Set(books.map(b => b.genre)).size}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Active Genres</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, ISBN, or LCCN..." 
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded dark:bg-primary-950/50 dark:text-primary-300">{filteredBooks.length}</span>
            
            {/* Sort Dropdown */}
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="border border-gray-200 dark:border-dark-border rounded-md text-sm px-3 py-2 text-gray-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-card"
            >
              <option value="Default">Sort: Default</option>
              <option value="Title A-Z">Title A-Z</option>
              <option value="Title Z-A">Title Z-A</option>
              <option value="Year Newest">Year Newest</option>
              <option value="Year Oldest">Year Oldest</option>
              <option value="Most Available">Most Available</option>
            </select>
            
            {/* Filter Dropdown */}
            <select 
              value={availabilityFilter}
              onChange={e => setAvailabilityFilter(e.target.value)}
              className="border border-gray-200 dark:border-dark-border rounded-md text-sm px-3 py-2 text-gray-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-card"
            >
              <option value="All Books">All Books</option>
              <option value="Available">Available</option>
              <option value="Borrowed">Borrowed</option>
              <option value="Overdue">Overdue</option>
              <option value="Lost">Lost</option>
            </select>

            <div className="flex border border-gray-200 dark:border-dark-border rounded-md overflow-hidden shadow-xs">
              <button 
                type="button"
                onClick={() => handleToggleViewMode('list')}
                className={`px-3 py-2 transition-colors border-r border-gray-200 dark:border-dark-border flex items-center justify-center cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold' 
                    : 'bg-white dark:bg-dark-card text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                }`} 
                title="List View"
              >
                <List size={16} />
              </button>
              <button 
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`px-3 py-2 transition-colors flex items-center justify-center cursor-pointer ${
                  viewMode === 'grid' 
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold' 
                    : 'bg-white dark:bg-dark-card text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                }`} 
                title="Grid View"
              >
                <Grid size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-medium">Showing {filteredBooks.length} of {books.length} active books</span>
          {viewMode === 'grid' && filteredBooks.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-600 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-400">
              <input 
                type="checkbox"
                checked={selectedBooks.length === filteredBooks.length && filteredBooks.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 accent-primary-600 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Select all</span>
            </label>
          )}
        </div>
        <button 
          onClick={handleOpenYearArchiveModal}
          className="text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
        >
          <Archive size={13} /> Need to archive older editions? Run year-based archive
        </button>
      </div>

      {/* Data Table / Grid View */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-border text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-50/50 dark:bg-dark-bg">
              <th className="px-4 py-3 w-8">
                <input 
                  type="checkbox" 
                  checked={selectedBooks.length === filteredBooks.length && filteredBooks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300" 
                />
              </th>
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">ISBN</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">LCCN / Call No.</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Stocks</th>
              <th className="px-4 py-3">Genre</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-xs">
            {paginatedBooks.map((book, idx) => (
              <tr key={book.id} className={`hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${selectedBooks.includes(book.id) ? 'bg-primary-50/50 dark:bg-purple-950/20' : ''}`}>
                <td className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    checked={selectedBooks.includes(book.id)}
                    onChange={() => handleSelectOne(book.id)}
                    className="rounded border-gray-300 accent-primary-600" 
                  />
                </td>
                <td className="px-4 py-3 text-gray-400 dark:text-slate-500">{(literaturePage - 1) * 10 + idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-slate-300">{book.isbn}</td>
                <td className="px-4 py-3 whitespace-normal min-w-[200px]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-slate-200 line-clamp-2">{book.title}</span>
                      {book.library_use_only && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 whitespace-nowrap" title="In Circulation: Library use only">
                          In Circulation
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${book.available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {book.available}/{book.total} available{book.library_use_only ? ' • Library use only' : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300 whitespace-normal min-w-[150px]">{book.author}</td>
                <td className="px-4 py-3 text-primary-600 dark:text-primary-400 font-medium">{book.lccn}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.year}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.stocks}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> {book.genre}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold text-[10px] ${book.condition === 'POOR' ? 'text-red-500' : book.condition === 'FAIR' ? 'text-orange-500' : 'text-green-500'}`}>
                    {book.condition}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center items-center gap-2">
                    <button onClick={() => handleViewQRCode(book)} className="text-gray-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 p-1 rounded" title="View QR Code">
                      <QrCode size={14} />
                    </button>
                    <button onClick={() => handleEditClick(book)} className="text-gray-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 p-1 rounded" title="Edit Literature">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleOpenArchiveSingle(book)} className="text-gray-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 p-1 rounded" title="Archive Literature">
                      <Archive size={14} />
                    </button>
                    <button onClick={() => handleDelete(book.id)} className="text-gray-400 dark:text-slate-500 hover:text-red-600 p-1 rounded" title="Delete Literature">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBooks.length === 0 && (
              <tr>
                <td colSpan="11" className="p-12 text-center text-gray-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <BookOpen size={36} className="text-gray-300 dark:text-slate-600 stroke-[1.5]" />
                    <p className="font-semibold text-gray-600 dark:text-slate-400">No active books found</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Try changing your search query or filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls inside Table Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card">
          <Pagination
            currentPage={literaturePage}
            totalItems={filteredBooks.length}
            itemsPerPage={10}
            onPageChange={setLiteraturePage}
          />
        </div>
      </div>
      ) : (
        <div className="flex flex-col gap-5">
          {paginatedBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {paginatedBooks.map((book) => {
                const isSelected = selectedBooks.includes(book.id);
                const isAvailable = (book.available || 0) > 0;
                const stockPercent = Math.min(100, Math.max(0, ((book.available || 0) / (book.total || 1)) * 100));

                return (
                  <div
                    key={book.id}
                    className={`group relative bg-white dark:bg-dark-card border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600/30 bg-purple-50/25 dark:bg-purple-950/20'
                        : 'border-gray-200 dark:border-dark-border hover:border-purple-300 dark:hover:border-purple-800'
                    }`}
                  >
                    {/* Top Row: Checkbox, Genre Pill, & Condition Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(book.id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4 accent-primary-600"
                        />
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 max-w-[115px] truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                          <span className="truncate">{book.genre || 'General'}</span>
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          book.condition === 'POOR'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                            : book.condition === 'FAIR'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                        }`}
                      >
                        {book.condition || 'GOOD'}
                      </span>
                    </div>

                    {/* Book Visual Card Banner */}
                    <div className="relative rounded-lg h-28 bg-gradient-to-br from-purple-50 via-indigo-50/40 to-slate-100 dark:from-purple-950/30 dark:via-dark-bg dark:to-indigo-950/20 border border-purple-100/70 dark:border-purple-900/30 p-2.5 flex flex-col justify-between overflow-hidden mb-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] font-semibold text-gray-500 dark:text-slate-400 bg-white/80 dark:bg-dark-card/80 px-1.5 py-0.5 rounded border border-gray-200/50 dark:border-dark-border">
                          {book.year && book.year !== 'N/A' ? book.year : 'Published'}
                        </span>
                        {book.library_use_only && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs">
                            In Circulation
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-center my-auto text-purple-400/70 dark:text-purple-400/50">
                        <BookOpen size={34} strokeWidth={1.5} />
                      </div>

                      <div className="flex items-center justify-between text-[9px]">
                        <span className="font-mono text-purple-700 dark:text-purple-300 font-bold truncate max-w-[110px]" title={book.lccn}>
                          {book.lccn || 'No Call No.'}
                        </span>
                        <span className="font-mono text-gray-400 dark:text-slate-500 truncate max-w-[85px]" title={book.isbn}>
                          {book.isbn}
                        </span>
                      </div>
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4
                          className="font-bold text-gray-900 dark:text-slate-100 text-xs leading-snug line-clamp-2 min-h-[2rem]"
                          title={book.title}
                        >
                          {book.title}
                        </h4>
                        <p
                          className="text-[11px] text-gray-500 dark:text-slate-400 font-medium truncate mt-1"
                          title={book.author}
                        >
                          {book.author}
                        </p>
                      </div>

                      {/* Stock & Availability Bar */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-dark-border">
                        <div className="flex items-center justify-between text-[10px] font-medium mb-1.5">
                          <span className={isAvailable ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-500 dark:text-rose-400 font-bold'}>
                            {book.available} / {book.total} available
                          </span>
                          <span className="text-gray-400 dark:text-slate-500">
                            {book.shelf && book.shelf !== 'N/A' ? `Shelf ${book.shelf}` : `${book.stocks || `${book.total} copies`}`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-dark-border rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${stockPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleViewQRCode(book)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                        title="View QR Code"
                      >
                        <QrCode size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditClick(book)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        title="Edit Literature"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenArchiveSingle(book)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        title="Archive Literature"
                      >
                        <Archive size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(book.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete Literature"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-12 text-center text-gray-400 dark:text-slate-500 shadow-sm">
              <div className="flex flex-col items-center justify-center gap-2">
                <BookOpen size={36} className="text-gray-300 dark:text-slate-600 stroke-[1.5]" />
                <p className="font-semibold text-gray-600 dark:text-slate-400">No active books found</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">Try changing your search query or filters.</p>
              </div>
            </div>
          )}

          {/* Grid View Pagination Footer */}
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-4 shadow-sm">
            <Pagination
              currentPage={literaturePage}
              totalItems={filteredBooks.length}
              itemsPerPage={10}
              onPageChange={setLiteraturePage}
            />
          </div>
        </div>
      )}

      {/* Floating Toolbar for Active Selection */}
      {selectedBooks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-950/60 text-primary-800 dark:text-primary-300 rounded-full text-sm font-semibold">
            <CheckSquare size={16} /> {selectedBooks.length} selected <span className="text-[10px] bg-primary-200 dark:bg-primary-800 text-primary-900 dark:text-white px-1.5 py-0.5 rounded ml-1">of {filteredBooks.length}</span>
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-dark-border mx-1"></div>
          <button onClick={handleEditSelected} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-full transition-colors">
            <Edit3 size={16} /> Edit Selected
          </button>
          <button onClick={handleBulkArchive} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-full transition-colors">
            <Archive size={16} /> Archive Selected
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-full transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors">
            <Trash2 size={16} /> Delete
          </button>
          <div className="w-px h-5 bg-gray-200 dark:bg-dark-border mx-1"></div>
          <button onClick={clearSelection} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

  const renderArchivedCatalog = () => {
    const oldestYear = archivedBooks.reduce((min, b) => {
      const y = parseInt(b.year, 10);
      if (!isNaN(y) && y > 0) return min === null ? y : Math.min(min, y);
      return min;
    }, null);

    const totalArchivedCopies = archivedBooks.reduce((sum, b) => sum + (parseInt(b.total, 10) || 0), 0);

    let filteredArchived = archivedBooks.filter(b => {
      const q = archivedSearchQuery.toLowerCase();
      const matchQuery = !q || (b.title || '').toLowerCase().includes(q) ||
                         (b.author || '').toLowerCase().includes(q) ||
                         (b.isbn || '').toLowerCase().includes(q) ||
                         (b.lccn || '').toLowerCase().includes(q) ||
                         String(b.year || '').includes(q);
      return matchQuery;
    });

    filteredArchived.sort((a, b) => {
      if (archivedSortBy === 'Title A-Z') return (a.title || '').localeCompare(b.title || '');
      if (archivedSortBy === 'Title Z-A') return (b.title || '').localeCompare(a.title || '');
      if (archivedSortBy === 'Year Newest') return parseInt(b.year || 0) - parseInt(a.year || 0);
      if (archivedSortBy === 'Year Oldest') return parseInt(a.year || 0) - parseInt(b.year || 0);
      if (archivedSortBy === 'Recently Archived') {
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      }
      return 0;
    });

    return (
      <div className="flex flex-col gap-5 animate-fade-in pb-20 relative">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Archive size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-800 dark:text-slate-200 leading-tight">{archivedBooks.length}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">Archived Titles</span>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BookCopy size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-800 dark:text-slate-200 leading-tight">{totalArchivedCopies}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">Archived Copies</span>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-800 dark:text-slate-200 leading-tight">{oldestYear ? oldestYear : 'N/A'}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">Oldest Published</span>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <ArchiveRestore size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Batch Archive</span>
                <span className="text-[11px] text-gray-500 dark:text-slate-400">Filter by year</span>
              </div>
            </div>
            <button 
              onClick={handleOpenYearArchiveModal}
              className="px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm"
            >
              Run Archive
            </button>
          </div>
        </div>

        {/* Info Callout */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3.5 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
          <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Archived Books Repository:</strong> Items listed here are safely excluded from active circulation, student catalog search, and checkout scanning. They can be restored back to the active catalog at any time without losing historical borrow records.
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex items-center justify-between">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
              <input 
                type="text" 
                value={archivedSearchQuery}
                onChange={(e) => setArchivedSearchQuery(e.target.value)}
                placeholder="Search archived books by title, author, ISBN..." 
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-dark-bg dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded dark:bg-amber-950/50 dark:text-amber-300">{filteredArchived.length}</span>
              
              <select 
                value={archivedSortBy} 
                onChange={e => setArchivedSortBy(e.target.value)}
                className="border border-gray-200 dark:border-dark-border rounded-md text-sm px-3 py-2 text-gray-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-amber-500 dark:bg-dark-card"
              >
                <option value="Recently Archived">Sort: Recently Archived</option>
                <option value="Title A-Z">Title A-Z</option>
                <option value="Title Z-A">Title Z-A</option>
                <option value="Year Newest">Year Newest</option>
                <option value="Year Oldest">Year Oldest</option>
              </select>

              <button 
                onClick={handleExportArchivedCSV}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover"
                title="Download archived books CSV"
              >
                <FileSpreadsheet size={16} /> Export List
              </button>
            </div>
          </div>
        </div>

        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Showing {filteredArchived.length} of {archivedBooks.length} archived books</span>

        {/* Data Table */}
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 dark:border-dark-border text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-50/50 dark:bg-dark-bg">
                <th className="px-4 py-3 w-8">
                  <input 
                    type="checkbox" 
                    checked={selectedArchivedBooks.length === filteredArchived.length && filteredArchived.length > 0}
                    onChange={(e) => handleSelectAllArchived(e, filteredArchived)}
                    className="rounded border-gray-300" 
                  />
                </th>
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">ISBN</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">LCCN / Call No.</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Copies</th>
                <th className="px-4 py-3">Genre</th>
                <th className="px-4 py-3">Date Archived</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border text-xs">
              {filteredArchived.map((book, idx) => (
                <tr key={book.id} className={`hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${selectedArchivedBooks.includes(book.id) ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                  <td className="px-4 py-3">
                    <input 
                      type="checkbox" 
                      checked={selectedArchivedBooks.includes(book.id)}
                      onChange={() => handleSelectOneArchived(book.id)}
                      className="rounded border-gray-300 accent-amber-600" 
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-slate-300">{book.isbn}</td>
                  <td className="px-4 py-3 whitespace-normal min-w-[200px]">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-slate-200 line-clamp-2">{book.title}</span>
                      {book.library_use_only && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 whitespace-nowrap" title="In Circulation: Library use only">
                          In Circulation
                        </span>
                      )}
                    </div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Archived</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300 whitespace-normal min-w-[150px]">{book.author}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400 font-medium">{book.lccn}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">{book.year}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.total}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                      {book.genre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                    {book.updated_at ? new Date(book.updated_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center items-center gap-2">
                      <button 
                        onClick={() => handleOpenRestoreSingle(book)} 
                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded font-medium transition-colors"
                        title="Restore Book to Active Catalog"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(book.id)} 
                        className="text-gray-400 dark:text-slate-500 hover:text-red-600 p-1 rounded transition-colors"
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredArchived.length === 0 && (
                <tr>
                  <td colSpan="11" className="p-12 text-center text-gray-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Archive size={36} className="text-gray-300 dark:text-slate-600 stroke-[1.5]" />
                      <p className="font-semibold text-gray-600 dark:text-slate-400">No archived books found</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {archivedBooks.length === 0 
                          ? "You have not archived any books yet. Use 'Archive by Year' or the row archive action to retire older items." 
                          : "No archived books match your search filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Floating Toolbar for Archived Selection */}
        {selectedArchivedBooks.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2 z-50 animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full text-sm font-semibold">
              <CheckSquare size={16} /> {selectedArchivedBooks.length} selected <span className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white px-1.5 py-0.5 rounded ml-1">of {filteredArchived.length}</span>
            </div>
            <div className="w-px h-5 bg-gray-200 dark:bg-dark-border mx-1"></div>
            <button 
              onClick={handleBulkRestore} 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition-colors"
            >
              <RotateCcw size={16} /> Restore Selected
            </button>
            <button 
              onClick={handleBulkDeleteArchived} 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors"
            >
              <Trash2 size={16} /> Delete Selected
            </button>
            <div className="w-px h-5 bg-gray-200 dark:bg-dark-border mx-1"></div>
            <button 
              onClick={clearArchivedSelection} 
              className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAuthorCatalog = () => {
    const filteredAuthors = authors.filter(a =>
      !authorSearch || a.name?.toLowerCase().includes(authorSearch.toLowerCase())
    );
    const paginatedAuthors = filteredAuthors.slice((authorPage - 1) * 10, authorPage * 10);

    return (
      <div className="flex flex-col gap-4 animate-fade-in relative pb-20">
        <div className="flex items-center justify-between mb-2">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by author name..." 
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" 
            />
          </div>
          <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
            <User size={16} /> {filteredAuthors.length} authors
          </span>
        </div>

        {filteredAuthors.length === 0 ? (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
            No authors found matching &quot;{authorSearch}&quot;.
          </div>
        ) : (
          paginatedAuthors.map(author => (
        <div key={author.id} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden transition-all">
          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover" onClick={() => toggleAuthor(author.id)}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 dark:bg-purple-900 dark:text-purple-200 font-bold flex items-center justify-center text-sm">
                {author.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-slate-200">{author.name}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">{author.books} book • {author.copies} total copies</span>
              </div>
            </div>
            <button className="text-gray-400 dark:text-slate-500">
              {author.expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
          
          {author.expanded && (
            <div className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-dark-border text-gray-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-semibold w-1/3">Title</th>
                    <th className="px-6 py-3 font-semibold">Genre</th>
                    <th className="px-6 py-3 font-semibold">LCCN / Call No.</th>
                    <th className="px-6 py-3 font-semibold">Copies</th>
                    <th className="px-6 py-3 font-semibold">Shelf</th>
                    <th className="px-6 py-3 font-semibold">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {books.filter(b => b.author === author.name).map(book => (
                    <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                      <td className="px-6 py-3 font-bold text-gray-800 dark:text-slate-300">{book.title}</td>
                      <td className="px-6 py-3"><span className="px-2 py-1 bg-cyan-50 text-cyan-600 rounded-full border border-cyan-100 text-[10px] font-bold">{book.genre}</span></td>
                      <td className="px-6 py-3 text-gray-600 dark:text-slate-300">{book.lccn}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-slate-300">{book.available}/{book.total}</td>
                      <td className="px-6 py-3 text-gray-600 dark:text-slate-300 font-medium">{book.shelf}</td>
                      <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${book.condition === 'POOR' ? 'bg-red-50 text-red-600 border-red-100' : book.condition === 'FAIR' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{book.condition}</span></td>
                    </tr>
                  ))}
                  {books.filter(b => b.author === author.name).length === 0 && (
                    <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 text-xs">No active books available for this author.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))
    )}

        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-6 py-3.5 shadow-sm">
          <Pagination
            currentPage={authorPage}
            totalItems={filteredAuthors.length}
            itemsPerPage={10}
            onPageChange={setAuthorPage}
          />
        </div>
      </div>
    );
  };

  const renderGenreCatalog = () => {
    const filteredGenres = genres.filter(g =>
      !genreSearch || g.name?.toLowerCase().includes(genreSearch.toLowerCase())
    );

    const leftGenres = filteredGenres.filter((_, idx) => idx % 2 === 0);
    const rightGenres = filteredGenres.filter((_, idx) => idx % 2 === 1);

    const renderGenreCard = (genre) => (
      <div key={genre.id} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden transition-all">
        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover" onClick={() => toggleGenre(genre.id)}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${genre.color}`}></div>
            <span className="font-bold text-gray-900 dark:text-slate-200">{genre.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${genre.colorBg} ${genre.colorText} border-current/20`}>
              {genre.books} books
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-slate-500">{genre.copies} total copies</span>
            <button className="text-gray-400 dark:text-slate-500" type="button">
              {genre.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {genre.expanded && (
          <div className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-border text-gray-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Author</th>
                  <th className="px-4 py-3 font-semibold">LCCN / Call No.</th>
                  <th className="px-4 py-3 font-semibold">Copies</th>
                  <th className="px-4 py-3 font-semibold">Shelf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-border">
                {books.filter(b => b.genre === genre.name).map(book => (
                  <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                    <td className="px-4 py-3 font-bold text-gray-800 dark:text-slate-300">{book.title}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.author}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.lccn}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.available}/{book.total}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300 font-medium">{book.shelf}</td>
                  </tr>
                ))}
                {books.filter(b => b.genre === genre.name).length === 0 && (
                  <tr><td colSpan="5" className="px-4 py-4 text-center text-gray-500 text-xs">No active books available for this genre.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );

    return (
      <div className="flex flex-col gap-4 animate-fade-in pb-20">
        <div className="flex items-center justify-between mb-2">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by genre name..." 
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" 
            />
          </div>
          <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
            <Tag size={16} /> {filteredGenres.length} genres
          </span>
        </div>

        {filteredGenres.length === 0 ? (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
            No genres found matching &quot;{genreSearch}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-6">
              {leftGenres.map(renderGenreCard)}
            </div>
            <div className="flex flex-col gap-6">
              {rightGenres.map(renderGenreCard)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQRCatalog = () => {
    const filteredQRBooks = books.filter(b => {
      if (!qrSearch) return true;
      const q = qrSearch.toLowerCase();
      return (b.title || '').toLowerCase().includes(q) ||
             (b.author || '').toLowerCase().includes(q) ||
             (b.isbn || '').toLowerCase().includes(q) ||
             (b.lccn || '').toLowerCase().includes(q);
    });

    const paginatedQRBooks = filteredQRBooks.slice((qrPage - 1) * 10, qrPage * 10);

    return (
      <div className="flex flex-col gap-6 animate-fade-in pb-20">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search by title, author, ISBN, or LCCN..." 
              value={qrSearch}
              onChange={(e) => setQrSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" 
            />
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-dark-border rounded bg-white dark:bg-dark-card text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-dark-hover shadow-sm">
              <QrCode size={16} /> Generate QR Codes
            </button>
            <div className={`overflow-hidden transition-all duration-300 transform origin-left ${selectedQRs.length > 0 ? 'max-w-[200px] opacity-100 scale-100' : 'max-w-0 opacity-0 scale-50 -ml-3'}`}>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded text-sm font-medium hover:bg-primary-900 shadow-sm whitespace-nowrap">
                <Printer size={16} /> Print QR Codes
              </button>
            </div>
          </div>
        </div>

        {selectedQRs.length > 0 && (
          <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-950/40 rounded-md px-4 py-2 text-sm font-medium text-purple-800 dark:text-purple-300">
            <span>{selectedQRs.length} selected</span>
            <button onClick={() => setSelectedQRs([])} className="text-purple-600 dark:text-purple-400 hover:text-purple-900">Clear</button>
            <button onClick={() => setSelectedQRs(filteredQRBooks.map(b => b.id))} className="text-purple-600 dark:text-purple-400 hover:text-purple-900">Select All</button>
          </div>
        )}

        {filteredQRBooks.length === 0 ? (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-8 text-center text-gray-500 dark:text-slate-400 text-sm">
            No QR codes found matching &quot;{qrSearch}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4">
            {paginatedQRBooks.map((qr) => (
              <div key={qr.id} onClick={() => handleViewQRCode(qr)} className={`bg-white dark:bg-dark-card border rounded-lg p-4 flex flex-col items-center text-center shadow-sm relative transition-colors cursor-pointer ${selectedQRs.includes(qr.id) ? 'border-purple-600 ring-1 ring-purple-600' : 'border-gray-200 dark:border-dark-border hover:border-primary-300'}`}>
                <input 
                  type="checkbox" 
                  checked={selectedQRs.includes(qr.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedQRs([...selectedQRs, qr.id]);
                    else setSelectedQRs(selectedQRs.filter(id => id !== qr.id));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 right-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4" 
                />
                <div className="bg-white dark:bg-dark-card p-2 border border-gray-200 dark:border-dark-border mb-4 rounded shadow-sm inline-block mt-2">
                  {(() => {
                    const QR = QRCode.default || QRCode.QRCode || QRCode;
                    return <QR value={String(qr.qr_code || qr.isbn || qr.id || 'UNKNOWN')} size={80} fgColor="#006644" />;
                  })()}
                </div>
                <h4 className="font-bold text-gray-800 dark:text-slate-300 text-xs mb-1 line-clamp-2">{qr.title}</h4>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{qr.lccn}</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">{qr.isbn}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-6 py-3.5 shadow-sm">
          <Pagination
            currentPage={qrPage}
            totalItems={filteredQRBooks.length}
            itemsPerPage={10}
            onPageChange={setQrPage}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Hidden file input for import simulation */}
      <input 
        type="file" 
        accept=".csv,.xlsx" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImportFile} 
      />

      {/* Global Action Toast / Alert */}
      {actionAlert && (
        <div className={`fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg border text-sm font-medium animate-fade-in ${
          actionAlert.type === 'error' 
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200' 
            : actionAlert.type === 'info'
            ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
        }`}>
          {actionAlert.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          <span>{actionAlert.message}</span>
          <button onClick={() => setActionAlert(null)} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={14} />
          </button>
        </div>
      )}

      <header className={`h-16 flex items-center justify-between px-8 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border shrink-0 relative z-30 ${activeTab === 'QR of Literatures' ? 'print:hidden' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-slate-400">
            <BookCopy size={18} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-gray-900 dark:text-slate-200 leading-none">Literatures</h1>
            <span className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Manage books, archives, catalogs, and literature resources</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-gray-200 dark:border-dark-border pr-4 mr-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 font-medium">
              <div className="w-2 h-2 rounded-full bg-primary-600"></div> Open
            </div>
            <button onClick={toggleDarkMode} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 relative p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <NotificationDropdown />
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs cursor-pointer ml-1">
              AL
            </div>
          </div>

          {activeTab === 'Literature Catalog' && (
            <div className="flex items-center gap-2">
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <FileText size={14} /> Export PDF
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <Printer size={14} /> Print
              </button>
              <button onClick={triggerImport} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <Upload size={14} /> Import
              </button>
              <button 
                onClick={handleOpenYearArchiveModal} 
                className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 shadow-xs transition-colors"
                title="Archive older books based on publication year"
              >
                <Archive size={14} /> Archive by Year
              </button>
              <button onClick={handleAddClick} className="flex items-center gap-2 px-4 py-1.5 bg-primary-800 text-white rounded text-xs font-medium hover:bg-primary-900 shadow-sm ml-1">
                <Plus size={14} /> Add Book
              </button>
            </div>
          )}

          {activeTab === 'Archived Literatures' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleOpenYearArchiveModal} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 shadow-sm transition-colors"
              >
                <Archive size={14} /> Archive by Year
              </button>
              <button onClick={handleExportArchivedCSV} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <FileSpreadsheet size={14} /> Export Archive CSV
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5 relative ${activeTab === 'QR of Literatures' ? 'print:hidden' : ''}`}>
        {renderTabs()}
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 animate-fade-in">
            <Loader2 size={40} className="text-primary-600 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Loading literatures...</p>
          </div>
        ) : (
          <>
            {activeTab === 'Literature Catalog' && renderLiteratureCatalog()}
            {activeTab === 'Archived Literatures' && renderArchivedCatalog()}
            {activeTab === 'Author Catalog' && renderAuthorCatalog()}
            {activeTab === 'Genre Catalog' && renderGenreCatalog()}
            {activeTab === 'QR of Literatures' && renderQRCatalog()}
          </>
        )}
      </div>
      
      {/* Print Only QR Container */}
      {activeTab === 'QR of Literatures' && (
        <div className="hidden print:block w-full bg-white text-black p-4">
          <h1 className="text-xl font-bold mb-4 text-black">CCC LIB APP QR Codes</h1>
          <div className="grid grid-cols-7 gap-3 w-full">
            {(selectedQRs.length > 0 ? books.filter(b => selectedQRs.includes(b.id)) : books).map(qr => {
              const QR = QRCode.default || QRCode.QRCode || QRCode;
              return (
                <div key={`print-${qr.id}`} className="border border-gray-200 rounded-lg p-2 flex flex-col items-center text-center shadow-sm" style={{ breakInside: 'avoid' }}>
                  <div className="mb-2">
                    <QR value={String(qr.qr_code || qr.isbn || qr.id || 'UNKNOWN')} size={90} fgColor="#006644" />
                  </div>
                  <h2 className="font-bold text-black text-[9px] mb-0.5 leading-tight line-clamp-2">{qr.title}</h2>
                  <span className="text-purple-700 font-semibold text-[7px] mb-0.5 uppercase">LCCN: {qr.lccn}</span>
                  <span className="text-gray-500 font-semibold text-[7px]">{qr.isbn}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50/50 dark:bg-dark-bg">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">{editingBook ? 'Edit Literature' : 'Add New Literature'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Title <span className="text-red-500">*</span></label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" placeholder="e.g. Fundamentals of Nursing" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Author</label>
                  <input value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} type="text" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" placeholder="e.g. Potter & Perry" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Genre</label>
                  <input value={formData.genreName} onChange={e => setFormData({...formData, genreName: e.target.value})} type="text" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" placeholder="e.g. Nursing" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">ISBN <span className="text-red-500">*</span></label>
                  <input required value={formData.isbn} onChange={e => setFormData({...formData, isbn: autoFormatISBN(e.target.value)})} type="text" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" placeholder="e.g. 978-0-323-40115-4" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">LCCN / Call No.</label>
                  <input value={formData.lccn} onChange={e => setFormData({...formData, lccn: e.target.value})} type="text" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" placeholder="e.g. RT41 .P67 2020" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Year Published</label>
                  <input value={formData.year_published} onChange={e => setFormData({...formData, year_published: e.target.value})} type="number" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" placeholder="YYYY" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Shelf Number</label>
                  <input value={formData.shelf_number} onChange={e => setFormData({...formData, shelf_number: e.target.value})} type="text" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" placeholder="e.g. NS-01" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Total Copies <span className="text-red-500">*</span></label>
                  <input required value={formData.total_copies} onChange={e => setFormData({...formData, total_copies: e.target.value})} type="number" min="1" className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">Condition</label>
                  <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="border border-gray-300 dark:border-dark-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card dark:text-slate-200">
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                    <option value="POOR">POOR</option>
                  </select>
                </div>
              </div>
              <div className="px-6 pb-6">
                <label className={`flex items-start justify-between gap-4 p-3.5 rounded-lg border cursor-pointer transition-colors ${formData.library_use_only ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800' : 'bg-gray-50/70 dark:bg-dark-bg border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-slate-600'}`}>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                      In Circulation (Library Use Only)
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      Restrict this book (e.g., in publication or special cases) so it cannot be borrowed outside the library.
                    </span>
                  </div>
                  <div className="relative inline-flex items-center shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.library_use_only)}
                      onChange={e => setFormData({ ...formData, library_use_only: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-300 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:bg-amber-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
                  </div>
                </label>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex justify-end gap-3 mt-auto shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-dark-hover">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-800 text-white rounded-md text-sm font-medium hover:bg-primary-900 shadow-sm">{editingBook ? 'Save Changes' : 'Add Literature'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center relative border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-purple-600" size={20} />
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-200">Import Books from CSV/Excel</h2>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"><X size={18} /></button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">Paste your rows below using the forward slash delimiter <code>/</code>.<br/>Format: <strong>Title / Author / Genre / ISBN / LCCN / Year Published / Total Copies / Condition / In Circulation (YES/NO, optional)</strong></p>
              
              <textarea 
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 dark:border-dark-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none dark:bg-dark-bg dark:text-slate-300"
                placeholder="Example:&#10;Myles Textbook for Midwives / Jayne E. Marshall / Midwifery / 978-0-323-40115-4 / RG950 .M87 / 2020 / 5 / EXCELLENT / NO&#10;Philippine Nursing Journal Vol. 94 / PNA / Nursing / 978-971-95123-0-1 / RT1 .P55 / 2024 / 2 / EXCELLENT / YES"
              />
              
              <div 
                className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".txt,.csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const data = new Uint8Array(evt.target.result);
                          const workbook = XLSX.read(data, { type: 'array' });
                          const sheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[sheetName];
                          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                          const slashFormat = json
                            .filter(row => row.length > 0)
                            .map(row => row.map(cell => String(cell || '').trim()).join(' / '))
                            .join('\n');
                          setImportText(slashFormat);
                        };
                        reader.readAsArrayBuffer(file);
                      } else {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const raw = String(evt.target.result || '');
                          if (file.name.toLowerCase().endsWith('.csv') && !raw.includes(' / ')) {
                            const wb = XLSX.read(raw, { type: 'string' });
                            const ws = wb.Sheets[wb.SheetNames[0]];
                            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                            const slashFormat = rows
                              .filter(row => row.length > 0)
                              .map(row => row.map(cell => String(cell ?? '').trim()).join(' / '))
                              .join('\n');
                            setImportText(slashFormat);
                          } else {
                            setImportText(raw);
                          }
                        };
                        reader.readAsText(file);
                      }
                    }
                  }} 
                />
                <Upload size={24} className="text-gray-400 dark:text-slate-500 mb-2" />
                <span className="text-sm font-bold text-gray-800 dark:text-slate-300">Or drag and drop an Excel / .txt / .csv file here</span>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 bg-white dark:bg-dark-card rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-dark-hover">Cancel</button>
              <button onClick={handleImportSubmit} disabled={isImporting} className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 shadow-sm disabled:opacity-50">
                {isImporting ? 'Importing...' : 'Import Books'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center relative border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Printer size={16} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">Print Report</h2>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"><X size={18} /></button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <p className="text-sm text-gray-500 dark:text-slate-400 -mt-2">Generate a print-friendly view of library data</p>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-800 dark:text-slate-300">Report Type</label>
                <div className="relative">
                  <select 
                    value={printConfig.type} 
                    onChange={e => setPrintConfig({...printConfig, type: e.target.value})}
                    className="w-full appearance-none border border-gray-200 dark:border-dark-border rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-dark-card"
                  >
                    <option>Book Catalog</option>
                    <option>Author List</option>
                    <option>Genre Summary</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="flex flex-col gap-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Include Header</span>
                  <button onClick={() => setPrintConfig({...printConfig, header: !printConfig.header})} className={`${printConfig.header ? 'text-purple-600' : 'text-gray-300'}`}>
                    {printConfig.header ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Include Timestamp</span>
                  <button onClick={() => setPrintConfig({...printConfig, timestamp: !printConfig.timestamp})} className={`${printConfig.timestamp ? 'text-purple-600' : 'text-gray-300'}`}>
                    {printConfig.timestamp ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Landscape Orientation</span>
                  <button onClick={() => setPrintConfig({...printConfig, landscape: !printConfig.landscape})} className={`${printConfig.landscape ? 'text-purple-600' : 'text-gray-300'}`}>
                    {printConfig.landscape ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 rounded-lg p-3 flex items-start gap-3">
                <FileText className="text-purple-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs font-medium text-purple-900 dark:text-purple-300 leading-relaxed">
                  A new window will open with the print preview. Use Ctrl+P to print.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 flex justify-end gap-3 shrink-0 border-t border-gray-100 dark:border-dark-border">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 bg-white dark:bg-dark-card rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-dark-hover">Cancel</button>
              <button onClick={executePrint} className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-bold hover:bg-purple-800 shadow-sm flex items-center gap-2">
                <Printer size={16} /> Generate Print View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {isQRModalOpen && selectedQRBook && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center relative border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-3">
                <QrCode className="text-purple-800 dark:text-purple-400" size={20} />
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-200">Book QR Code</h2>
              </div>
              <button onClick={() => setIsQRModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"><X size={18} /></button>
            </div>
            
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-300">"{selectedQRBook.title}" - {selectedQRBook.isbn}</p>
              
              <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm inline-block">
                {(() => {
                  const QR = QRCode.default || QRCode.QRCode || QRCode;
                  return <QR id="qr-code-svg" value={String(selectedQRBook.qr_code || selectedQRBook.isbn || selectedQRBook.id || 'UNKNOWN')} size={180} fgColor="#006644" />;
                })()}
              </div>
              
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-purple-900 dark:text-purple-300">QR Code: {selectedQRBook.qr_code || selectedQRBook.isbn || selectedQRBook.id}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Scan this code to identify the book during borrowing or returning</p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg flex flex-col gap-3 shrink-0">
              <button onClick={handleDownloadQR} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg text-sm font-bold hover:bg-primary-900 shadow-sm transition-colors">
                <Download size={16} /> Download QR Code
              </button>
              <button onClick={() => setIsQRModalOpen(false)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 bg-white dark:bg-dark-card rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-white dark:bg-dark-card w-full max-w-sm rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-200 mb-2">Delete {booksToDelete.length > 1 ? `${booksToDelete.length} Books` : 'Book'}?</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete {booksToDelete.length > 1 ? 'these books' : 'this book'}? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 dark:bg-dark-bg dark:text-slate-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex justify-center items-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive by Year Modal */}
      {isYearArchiveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Archive size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">Archive by Publication Year</h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Move older books from circulation to the archive</p>
                </div>
              </div>
              <button 
                onClick={() => setIsYearArchiveModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                  Cutoff Publication Year
                </label>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                  All active books published in or before this year will be archived.
                </p>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1800" 
                    max={currentCalendarYear} 
                    value={archiveCutoffYear} 
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-base font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-dark-bg"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[2000, 2010, 2015, 2018].map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => handleYearChange(year)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                          parseInt(archiveCutoffYear, 10) === year
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-gray-200 dark:border-dark-border text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-dark-hover'
                        }`}
                      >
                        ≤ {year}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-slate-300">Archive Impact Preview</span>
                  {isLoadingPreview && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Loader2 size={12} className="animate-spin" /> Calculating...
                    </span>
                  )}
                </div>

                {yearPreviewData ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white dark:bg-dark-card p-2.5 rounded-lg border border-gray-100 dark:border-dark-border">
                      <div className="text-base font-bold text-gray-900 dark:text-slate-200">{yearPreviewData.totalMatching}</div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400">Total Matching</div>
                    </div>
                    <div className="bg-white dark:bg-dark-card p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-950/60">
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{yearPreviewData.eligibleCount}</div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400">Eligible to Archive</div>
                    </div>
                    <div className="bg-white dark:bg-dark-card p-2.5 rounded-lg border border-amber-100 dark:border-amber-950/60">
                      <div className="text-base font-bold text-amber-600 dark:text-amber-400">{yearPreviewData.borrowedCount}</div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400">Borrowed (Protected)</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Enter a year to preview matching books.</p>
                )}

                {yearPreviewData && yearPreviewData.borrowedCount > 0 && (
                  <div className="flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      {yearPreviewData.borrowedCount} book(s) currently have active loans and will be skipped to protect active borrowing.
                    </span>
                  </div>
                )}

                {yearPreviewData && yearPreviewData.eligible && yearPreviewData.eligible.length > 0 && (
                  <div className="mt-1">
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1 block">
                      Sample books to be archived:
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {yearPreviewData.eligible.slice(0, 5).map(b => (
                        <div key={b.id} className="text-xs flex items-center justify-between py-1 px-2 rounded bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border">
                          <span className="truncate max-w-[260px] text-gray-800 dark:text-slate-200">{b.title}</span>
                          <span className="text-[10px] font-medium text-gray-500 dark:text-slate-400">Year {b.year}</span>
                        </div>
                      ))}
                      {yearPreviewData.eligible.length > 5 && (
                        <p className="text-[10px] text-gray-500 text-center pt-1">+ {yearPreviewData.eligible.length - 5} more books</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Safety notice */}
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                Archived books are instantly hidden from student mobile search and cannot be checked out. All past borrow logs remain intact. You can view or restore these books anytime in the Archived Literatures tab.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsYearArchiveModalOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 bg-white dark:bg-dark-card rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-dark-hover"
                disabled={isArchivingByYear}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmYearArchive}
                disabled={isArchivingByYear || !yearPreviewData || yearPreviewData.eligibleCount === 0}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isArchivingByYear ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                <span>Archive {yearPreviewData?.eligibleCount || 0} Books</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single / Multi-Archive Confirmation Modal */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center mb-4 self-center">
                <Archive size={24} />
              </div>
              
              <h3 className="text-lg font-bold text-center text-gray-900 dark:text-slate-100 mb-2">
                {booksToArchive.length > 1 ? `Archive ${booksToArchive.length} Selected Books?` : `Archive "${booksToArchive[0]?.title}"?`}
              </h3>

              <p className="text-xs text-center text-gray-500 dark:text-slate-400 mb-4">
                Archived books are removed from active circulation, student search, and new borrowing checkouts. You can restore them at any time.
              </p>

              {/* Check if any book has active loans */}
              {booksToArchive.some(b => b.available < b.total) && (
                <div className="mb-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold">Notice: </span>
                    Some selected books currently have copies on loan. Books with active loans will be automatically skipped to prevent circulation errors.
                  </div>
                </div>
              )}

              {booksToArchive.length > 1 && (
                <div className="max-h-40 overflow-y-auto space-y-1 mb-4 border border-gray-100 dark:border-dark-border rounded-lg p-2 bg-gray-50 dark:bg-dark-bg">
                  {booksToArchive.map(b => (
                    <div key={b.id} className="text-xs flex justify-between items-center py-1 px-2 border-b border-gray-100 dark:border-dark-border last:border-0">
                      <span className="truncate max-w-[240px] text-gray-800 dark:text-slate-200">{b.title}</span>
                      <span className="text-[10px] text-gray-500">Year {b.year}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2">
                <button 
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-sm"
                  disabled={isArchiving}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmArchive}
                  className="flex-1 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors flex justify-center items-center gap-2 text-sm"
                  disabled={isArchiving}
                >
                  {isArchiving ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                  <span>Confirm Archive</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single / Multi-Restore Confirmation Modal */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 flex flex-col">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center mb-4 self-center">
                <RotateCcw size={24} />
              </div>
              
              <h3 className="text-lg font-bold text-center text-gray-900 dark:text-slate-100 mb-2">
                {booksToRestore.length > 1 ? `Restore ${booksToRestore.length} Books to Catalog?` : `Restore "${booksToRestore[0]?.title}"?`}
              </h3>

              <p className="text-xs text-center text-gray-500 dark:text-slate-400 mb-4">
                Restoring will return these books to the active literature catalog. They will immediately become visible to students in search and available for checkout.
              </p>

              {booksToRestore.length > 1 && (
                <div className="max-h-40 overflow-y-auto space-y-1 mb-4 border border-gray-100 dark:border-dark-border rounded-lg p-2 bg-gray-50 dark:bg-dark-bg">
                  {booksToRestore.map(b => (
                    <div key={b.id} className="text-xs flex justify-between items-center py-1 px-2 border-b border-gray-100 dark:border-dark-border last:border-0">
                      <span className="truncate max-w-[240px] text-gray-800 dark:text-slate-200">{b.title}</span>
                      <span className="text-[10px] text-gray-500">Year {b.year}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2">
                <button 
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors text-sm"
                  disabled={isRestoring}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmRestore}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex justify-center items-center gap-2 text-sm"
                  disabled={isRestoring}
                >
                  {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  <span>Restore Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
