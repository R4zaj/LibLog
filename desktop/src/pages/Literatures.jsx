import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Plus, Filter, Download, Printer, Upload, BookCopy, User, 
  Tag, QrCode, BookOpen, CheckCircle, XCircle, Library, FileSpreadsheet, FileText,
  List, Grid, Edit3, Trash2, ChevronDown, ChevronRight, X, LayoutGrid, CheckSquare, Bell, Sun, Moon, ToggleRight, ToggleLeft, FileCode2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import NotificationDropdown from '../components/NotificationDropdown';
import QRCode from 'react-qr-code';
import { useTheme } from '../components/ThemeContext';
// --- MOCK DATA ---
const mockBooks = [
  { id: 1, isbn: '978-0-323-40115-4', title: 'Myles Textbook for Midwives', available: 4, total: 5, author: 'Jayne E. Marshall', lccn: 'RG950 .M87 2020', year: '2020', stocks: '5 copies', genre: 'Midwifery', condition: 'EXCELLENT', shelf: 'MW-01' },
  { id: 2, isbn: '978-0-7020-7898-2', title: 'Mayes Midwifery', available: 4, total: 5, author: 'Sue Macdonald', lccn: 'RG950 .M39 2019', year: '2019', stocks: '5 copies', genre: 'Midwifery', condition: 'GOOD', shelf: 'MW-01' },
];

const mockAuthors = [
  { id: 1, name: 'Adele Pillitteri', books: 1, copies: 5, expanded: true },
  { id: 2, name: 'Alan Bryman', books: 1, copies: 5 },
  { id: 3, name: 'Alex B. Brillantes', books: 1, copies: 5 },
];

const mockGenres = [
  { id: 1, name: 'Anatomy & Physiology', color: 'bg-cyan-400', colorText: 'text-cyan-600', colorBg: 'bg-cyan-50', books: 2, copies: 10, expanded: true },
  { id: 2, name: 'Economics', color: 'bg-purple-400', colorText: 'text-purple-600', colorBg: 'bg-purple-50', books: 2, copies: 10 },
];

// --- COMPONENT ---
export default function Literatures() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('Literature Catalog');
  const [books, setBooks] = useState(mockBooks);
  const [authors, setAuthors] = useState(mockAuthors);
  const [genres, setGenres] = useState(mockGenres);
  
  // Selection
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [selectedQRs, setSelectedQRs] = useState([]);
  
  // Filtering and Sorting
  const [sortBy, setSortBy] = useState('Default');
  const [availabilityFilter, setAvailabilityFilter] = useState('All Books');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Global theme context instead of local state
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    isbn: '', title: '', authorName: '', genreName: '', lccn: '', year_published: '', shelf_number: '', total_copies: 1, condition: 'GOOD'
  });
  
  const fileInputRef = useRef(null);

  // Fetch real data from backend
  useEffect(() => {
    const fetchLiteratures = async () => {
      try {
        const [booksRes, authorsRes, genresRes] = await Promise.all([
          fetch('http://localhost:5000/api/literatures/books', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false })),
          fetch('http://localhost:5000/api/literatures/authors', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false })),
          fetch('http://localhost:5000/api/literatures/genres', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false }))
        ]);

        if (booksRes.ok) setBooks(await booksRes.json());
        if (authorsRes.ok) setAuthors(await authorsRes.json());
        if (genresRes.ok) setGenres(await genresRes.json());
      } catch (error) {
        console.error('Failed to fetch literature data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLiteratures();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/literatures/books', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (res.ok) setBooks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Sync state with URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'author') setActiveTab('Author Catalog');
    else if (tabParam === 'genre') setActiveTab('Genre Catalog');
    else if (tabParam === 'qr') setActiveTab('QR of Literatures');
    else setActiveTab('Literature Catalog');
  }, [searchParams]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    let tabParam = 'catalog';
    if (tabName === 'Author Catalog') tabParam = 'author';
    else if (tabName === 'Genre Catalog') tabParam = 'genre';
    else if (tabName === 'QR of Literatures') tabParam = 'qr';
    setSearchParams({ tab: tabParam });
  };

  const handleAddClick = () => {
    setEditingBook(null);
    setFormData({ isbn: '', title: '', authorName: '', genreName: '', lccn: '', year_published: '', shelf_number: '', total_copies: 1, condition: 'GOOD' });
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
      condition: book.condition || 'GOOD'
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingBook 
        ? `http://localhost:5000/api/literatures/books/${editingBook.id}`
        : 'http://localhost:5000/api/literatures/books';
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
        fetchBooks();
      } else {
        alert('Failed to save book');
      }
    } catch (error) {
      console.error('Failed to submit form', error);
      alert('Operation failed');
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
      
      const title = parts[0];
      const authorName = parts[1];
      const genreName = parts[2];
      const isbn = parts[3];
      const lccn = parts[4];
      const year_published = parts[5];
      const total_copies = parseInt(parts[6]) || 1;
      const condition = parts[7].toUpperCase();
      
      const shelf_number = genreName ? `${genreName.substring(0, 3).toUpperCase()}-01` : 'GEN-01';

      try {
        const res = await fetch('http://localhost:5000/api/literatures/books', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') }`
          },
          body: JSON.stringify({
            title, authorName, genreName, isbn, lccn, year_published, total_copies, condition, shelf_number
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error('Failed to import book', title, err);
      }
    }
    
    setIsImporting(false);
    alert(`Successfully imported ${successCount} books.`);
    setImportText('');
    setIsImportModalOpen(false);
    fetchBooks(); // Refresh list
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        const res = await fetch(`http://localhost:5000/api/literatures/books/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, method: 'DELETE' });
        if (res.ok) {
          fetchBooks();
          setSelectedBooks(prev => prev.filter(bId => bId !== id));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedBooks.length} books?`)) {
      try {
        await Promise.all(selectedBooks.map(id => 
          fetch(`http://localhost:5000/api/literatures/books/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, method: 'DELETE' })
        ));
        setSelectedBooks([]);
        fetchBooks();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleEditSelected = () => {
    if (selectedBooks.length === 1) {
      const bookToEdit = books.find(b => b.id === selectedBooks[0]);
      if (bookToEdit) handleEditClick(bookToEdit);
    } else {
      alert("Please select exactly one book to edit.");
    }
  };

  // Actions
  const handleExportCSV = () => {
    const headers = ['ISBN', 'Title', 'Author', 'LCCN', 'Year', 'Genre', 'Shelf', 'Total Copies', 'Available'];
    const rows = books.map(b => [b.isbn, `"${b.title}"`, `"${b.author}"`, b.lccn, b.year, b.genre, b.shelf, b.total, b.available]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'library_catalog.csv';
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
      alert(`Simulating import of ${e.target.files[0].name}`);
      e.target.value = null; // reset
    }
  };

  // Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBooks(filteredBooks.map(b => b.id));
    } else {
      setSelectedBooks([]);
    }
  };

  const handleSelectBook = (id) => {
    setSelectedBooks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
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

  // Filtering & Sorting Logic
  let filteredBooks = books.filter(b => {
    const matchQuery = (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (b.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (b.isbn || '').toLowerCase().includes(searchQuery.toLowerCase());
    
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
    return 0; // Default
  });


  const toggleAuthor = (id) => {
    setAuthors(authors.map(a => a.id === id ? { ...a, expanded: !a.expanded } : a));
  };

  const toggleGenre = (id) => {
    setGenres(genres.map(g => g.id === id ? { ...g, expanded: !g.expanded } : g));
  };

  const renderTabs = () => (
    <div className="flex items-center gap-6 border-b border-gray-200 dark:border-dark-border shrink-0">
      <button onClick={() => handleTabChange('Literature Catalog')} className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'Literature Catalog' ? 'border-primary-800 text-primary-900 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}>
        <BookCopy size={16} className={activeTab === 'Literature Catalog' ? 'text-primary-800' : ''} /> Literature Catalog
      </button>
      <button onClick={() => handleTabChange('Author Catalog')} className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'Author Catalog' ? 'border-primary-800 text-primary-900 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}>
        <User size={16} className={activeTab === 'Author Catalog' ? 'text-primary-800' : ''} /> Author Catalog
      </button>
      <button onClick={() => handleTabChange('Genre Catalog')} className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'Genre Catalog' ? 'border-primary-800 text-primary-900 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}>
        <Tag size={16} className={activeTab === 'Genre Catalog' ? 'text-primary-800' : ''} /> Genre Catalog
      </button>
      <button onClick={() => handleTabChange('QR of Literatures')} className={`flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${activeTab === 'QR of Literatures' ? 'border-primary-800 text-primary-900 font-semibold' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700'}`}>
        <QrCode size={16} className={activeTab === 'QR of Literatures' ? 'text-primary-800' : ''} /> QR of Literatures
      </button>
    </div>
  );

  const renderLiteratureCatalog = () => (
    <div className="flex flex-col gap-5 animate-fade-in pb-20 relative">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-primary-50 text-primary-600 flex items-center justify-center">
            <BookOpen size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-300 leading-tight">{books.length}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Total Books</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-green-50 text-green-500 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-300 leading-tight">{books.filter(b => b.available > 0).length}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Available Now</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-red-50 text-red-500 flex items-center justify-center">
            <XCircle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-300 leading-tight">{books.filter(b => b.available === 0).length}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Unavailable</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-3 flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-orange-50 text-orange-500 flex items-center justify-center">
            <Library size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 dark:text-slate-300 leading-tight">{new Set(books.map(b => b.genre)).size}</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Genre Count</span>
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
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded">{filteredBooks.length}</span>
            
            {/* Sort Dropdown */}
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="border border-gray-200 dark:border-dark-border rounded-md text-sm px-3 py-2 text-gray-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary-500"
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
              className="border border-gray-200 dark:border-dark-border rounded-md text-sm px-3 py-2 text-gray-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="All Books">All Books</option>
              <option value="Available">Available</option>
              <option value="Borrowed">Borrowed</option>
              <option value="Overdue">Overdue</option>
              <option value="Lost">Lost</option>
            </select>

            <div className="flex border border-gray-200 dark:border-dark-border rounded-md overflow-hidden">
              <button className="px-3 py-2 bg-gray-100 text-gray-600 dark:text-slate-300 border-r border-gray-200 dark:border-dark-border"><List size={16} /></button>
              <button className="px-3 py-2 bg-white dark:bg-dark-card text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"><Grid size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Showing {filteredBooks.length} of {books.length} books</span>

      {/* Data Table */}
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-border text-xs font-semibold text-gray-600 dark:text-slate-300">
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
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredBooks.map((book, idx) => (
              <tr key={book.id} className={`hover:bg-gray-50 dark:bg-dark-bg ${selectedBooks.includes(book.id) ? 'bg-primary-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <input 
                    type="checkbox" 
                    checked={selectedBooks.includes(book.id)}
                    onChange={() => handleSelectOne(book.id)}
                    className="rounded border-gray-300 accent-primary-600" 
                  />
                </td>
                <td className="px-4 py-3 text-gray-400 dark:text-slate-500">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{book.isbn}</td>
                <td className="px-4 py-3 whitespace-normal min-w-[200px]">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-slate-200 line-clamp-2">{book.title}</span>
                    <span className={`text-[10px] font-medium ${book.available > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {book.available}/{book.total} available
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300 whitespace-normal min-w-[150px]">{book.author}</td>
                <td className="px-4 py-3 text-primary-600 font-medium">{book.lccn}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.year}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{book.stocks}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {book.genre}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold text-[10px] ${book.condition === 'POOR' ? 'text-red-500' : book.condition === 'FAIR' ? 'text-orange-500' : 'text-green-500'}`}>
                    {book.condition}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => handleViewQRCode(book)} className="text-gray-400 dark:text-slate-500 hover:text-primary-600"><QrCode size={14} /></button>
                    <button onClick={() => handleEditClick(book)} className="text-gray-400 dark:text-slate-500 hover:text-primary-600"><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete(book.id)} className="text-gray-400 dark:text-slate-500 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredBooks.length === 0 && (
              <tr><td colSpan="11" className="p-8 text-center text-gray-400 dark:text-slate-500">No books found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Toolbar for Selection */}
      {selectedBooks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full shadow-lg px-2 py-1.5 flex items-center gap-2 z-50 animate-fade-in">
          <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-800 rounded-full text-sm font-semibold">
            <CheckSquare size={16} /> {selectedBooks.length} selected <span className="text-[10px] bg-primary-200 px-1.5 py-0.5 rounded ml-1">of {filteredBooks.length}</span>
          </div>
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          <button onClick={handleEditSelected} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-dark-bg rounded-full transition-colors">
            <Edit3 size={16} /> Edit Selected
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:bg-dark-bg rounded-full transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors">
            <Trash2 size={16} /> Delete
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          <button onClick={clearSelection} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );

  const renderAuthorCatalog = () => (
    <div className="flex flex-col gap-4 animate-fade-in relative pb-20">
      <div className="flex items-center justify-between mb-2">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
          <input type="text" placeholder="Search by author name..." className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2"><User size={16} /> {authors.length} authors</span>
      </div>

      {authors.map(author => (
        <div key={author.id} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden transition-all">
          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover" onClick={() => toggleAuthor(author.id)}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-800 font-bold flex items-center justify-center text-sm">
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
                  <tr className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                    <td className="px-6 py-3 font-bold text-gray-800 dark:text-slate-300">Maternal and Child Health Nursing</td>
                    <td className="px-6 py-3"><span className="px-2 py-1 bg-cyan-50 text-cyan-600 rounded-full border border-cyan-100 text-[10px] font-bold">Nursing</span></td>
                    <td className="px-6 py-3 text-gray-600 dark:text-slate-300">RG951 .P55 2018</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-slate-300">5/5</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-slate-300 font-medium">NS-01</td>
                    <td className="px-6 py-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100 text-[10px] font-bold">GOOD</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderGenreCatalog = () => (
    <div className="flex flex-col gap-4 animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-2">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
          <input type="text" placeholder="Search by genre name..." className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2"><Tag size={16} /> {genres.length} genres</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {genres.map(genre => (
          <div key={genre.id} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden h-fit transition-all">
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
                <button className="text-gray-400 dark:text-slate-500">
                  {genre.expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
            </div>

            {genre.expanded && (
              <div className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
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
                  <tbody className="divide-y divide-gray-50">
                    <tr className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-slate-300">Anatomy and Physiology</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">Kevin T. Patton</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">QM31 .P38 2021</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">5/5</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300 font-medium">AP-01</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderQRCatalog = () => (
    <div className="flex flex-col gap-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
          <input type="text" placeholder="Search by title, author, ISBN, or LCCN..." className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-dark-border rounded bg-white dark:bg-dark-card text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-dark-bg shadow-sm">
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
        <div className="flex items-center gap-4 bg-purple-50 dark:bg-purple-900/20 rounded-md px-4 py-2 text-sm font-medium text-purple-800 dark:text-purple-300">
          <span>{selectedQRs.length} selected</span>
          <button onClick={() => setSelectedQRs([])} className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300">Clear</button>
          <button onClick={() => setSelectedQRs(books.map(b => b.id))} className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300">Select All</button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {books.map((qr) => (
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
    </div>
  );

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

      {/* Top Header */}
      <header className={`h-16 flex items-center justify-between px-8 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border shrink-0 ${activeTab === 'QR of Literatures' ? 'print:hidden' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-slate-400">
            <BookCopy size={18} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-gray-900 dark:text-slate-200 leading-none">Literatures</h1>
            <span className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Manage books, catalogs, and literature resources</span>
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
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <FileText size={14} /> Export PDF
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <Printer size={14} /> Print
              </button>
              <button onClick={triggerImport} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover">
                <Upload size={14} /> Import
              </button>
              <button onClick={handleAddClick} className="flex items-center gap-2 px-4 py-1.5 bg-primary-800 text-white rounded text-xs font-medium hover:bg-primary-900 shadow-sm ml-2">
                <Plus size={14} /> Add Book
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5 relative ${activeTab === 'QR of Literatures' ? 'print:hidden' : ''}`}>
        {renderTabs()}
        
        {activeTab === 'Literature Catalog' && renderLiteratureCatalog()}
        {activeTab === 'Author Catalog' && renderAuthorCatalog()}
        {activeTab === 'Genre Catalog' && renderGenreCatalog()}
        {activeTab === 'QR of Literatures' && renderQRCatalog()}
      </div>
      
      {/* Print Only QR Container */}
      {activeTab === 'QR of Literatures' && (
        <div className="hidden print:block w-full bg-white text-black p-4">
          <h1 className="text-xl font-bold mb-4 text-black">LibLog QR Codes</h1>
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
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-200">{editingBook ? 'Edit Literature' : 'Add New Literature'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-6 grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Title <span className="text-red-500">*</span></label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} type="text" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Fundamentals of Nursing" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Author</label>
                  <input value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} type="text" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Potter & Perry" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Genre</label>
                  <input value={formData.genreName} onChange={e => setFormData({...formData, genreName: e.target.value})} type="text" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Nursing" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">ISBN <span className="text-red-500">*</span></label>
                  <input required value={formData.isbn} onChange={e => setFormData({...formData, isbn: autoFormatISBN(e.target.value)})} type="text" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. 978-0-323-40115-4" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">LCCN / Call No.</label>
                  <input value={formData.lccn} onChange={e => setFormData({...formData, lccn: e.target.value})} type="text" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. RT41 .P67 2020" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Year Published</label>
                  <input value={formData.year_published} onChange={e => setFormData({...formData, year_published: e.target.value})} type="number" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="YYYY" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Shelf Number</label>
                  <input value={formData.shelf_number} onChange={e => setFormData({...formData, shelf_number: e.target.value})} type="text" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. NS-01" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Total Copies <span className="text-red-500">*</span></label>
                  <input required value={formData.total_copies} onChange={e => setFormData({...formData, total_copies: e.target.value})} type="number" min="1" className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700">Condition</label>
                  <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})} className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-card">
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                    <option value="POOR">POOR</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex justify-end gap-3 mt-auto shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-dark-hover">Cancel</button>
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
              <p className="text-xs text-gray-500 dark:text-slate-400">Paste your rows below using the forward slash delimiter <code>/</code>.<br/>Format: <strong>Title / Author / Genre / ISBN / LCCN / Year Published / Total Copies / Condition</strong></p>
              
              <textarea 
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 dark:border-dark-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none dark:bg-dark-bg dark:text-slate-300"
                placeholder="Example:&#10;Myles Textbook for Midwives / Jayne E. Marshall / Midwifery / 978-0-323-40115-4 / RG950 .M87 / 2020 / 5 / EXCELLENT"
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
                          // Filter out empty rows and join by slash
                          const slashFormat = json
                            .filter(row => row.length > 0)
                            .map(row => row.map(cell => String(cell || '').trim()).join(' / '))
                            .join('\n');
                          setImportText(slashFormat);
                        };
                        reader.readAsArrayBuffer(file);
                      } else {
                        const reader = new FileReader();
                        reader.onload = (evt) => setImportText(evt.target.result);
                        reader.readAsText(file);
                      }
                    }
                  }} 
                />
                <Upload size={24} className="text-gray-400 dark:text-slate-500 mb-2" />
                <span className="text-sm font-bold text-gray-800 dark:text-slate-300">Or drag & drop an Excel / .txt / .csv file here</span>
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
                    className="w-full appearance-none border border-gray-200 dark:border-dark-border rounded-lg px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-dark-card"
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
                  <span className="text-sm font-semibold text-gray-700">Include Header</span>
                  <button onClick={() => setPrintConfig({...printConfig, header: !printConfig.header})} className={`${printConfig.header ? 'text-purple-600' : 'text-gray-300'}`}>
                    {printConfig.header ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Include Timestamp</span>
                  <button onClick={() => setPrintConfig({...printConfig, timestamp: !printConfig.timestamp})} className={`${printConfig.timestamp ? 'text-purple-600' : 'text-gray-300'}`}>
                    {printConfig.timestamp ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Landscape Orientation</span>
                  <button onClick={() => setPrintConfig({...printConfig, landscape: !printConfig.landscape})} className={`${printConfig.landscape ? 'text-purple-600' : 'text-gray-300'}`}>
                    {printConfig.landscape ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-3 flex items-start gap-3">
                <FileText className="text-purple-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs font-medium text-purple-900 leading-relaxed">
                  A new window will open with the print preview. Use Ctrl+P to print.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-dark-border text-gray-700 bg-white dark:bg-dark-card rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-dark-hover">Cancel</button>
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
                <QrCode className="text-purple-800" size={20} />
                <h2 className="text-base font-bold text-gray-900 dark:text-slate-200">Book QR Code</h2>
              </div>
              <button onClick={() => setIsQRModalOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300"><X size={18} /></button>
            </div>
            
            <div className="p-6 flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-gray-600 dark:text-slate-300">"{selectedQRBook.title}" — {selectedQRBook.isbn}</p>
              
              <div className="bg-white dark:bg-dark-card p-4 border border-gray-200 dark:border-dark-border rounded-xl shadow-sm inline-block">
                {(() => {
                  const QR = QRCode.default || QRCode.QRCode || QRCode;
                  return <QR id="qr-code-svg" value={String(selectedQRBook.qr_code || selectedQRBook.isbn || selectedQRBook.id || 'UNKNOWN')} size={180} fgColor="#006644" />;
                })()}
              </div>
              
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold text-purple-900">QR Code: {selectedQRBook.qr_code || selectedQRBook.isbn || selectedQRBook.id}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Scan this code to identify the book during borrowing/returning</p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg flex flex-col gap-3 shrink-0">
              <button onClick={handleDownloadQR} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-800 text-white rounded-lg text-sm font-bold hover:bg-primary-900 shadow-sm transition-colors">
                <Download size={16} /> Download QR Code
              </button>
              <button onClick={() => setIsQRModalOpen(false)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-dark-border text-gray-700 bg-white dark:bg-dark-card rounded-lg text-sm font-semibold hover:bg-gray-50 dark:bg-dark-bg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
