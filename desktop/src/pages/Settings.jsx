import { useState, useEffect, useRef } from 'react';
import { Search, Sun, Moon, Bell, Settings as SettingsIcon, Save, Users, Clock, DollarSign, Megaphone, AlertTriangle, BookX, Download, Plus, Check, LogOut, User, Trash2, GraduationCap, Edit } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { useNavigate } from 'react-router-dom';
import NotificationDropdown from '../components/NotificationDropdown';

export default function Settings() {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('manage-users');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ id: null, code: '', name: '' });
  const [courseToDelete, setCourseToDelete] = useState(null);
  
  // Library Rules State
  const [rules, setRules] = useState({
    library_capacity: 40,
    max_books_per_user: 2,
    borrow_duration_students: 3,
    borrow_duration_faculty: 120,
    penalty_fee_per_day: 5.00,
    suspension_threshold: 100.00,
    damage_fee: 5.00,
    lost_book_fee: 5.00
  });

  const [saving, setSaving] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', priority: 'NORMAL', is_active: true });
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [pendingRoleChanges, setPendingRoleChanges] = useState({});
  const [savingRoles, setSavingRoles] = useState(false);
  useEffect(() => {
    // Fetch stats
    fetch(`http://${window.location.hostname}:5000/api/settings/stats`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setStats(data);
      })
      .catch(console.error);

    // Fetch initial rules
    fetch(`http://${window.location.hostname}:5000/api/settings/library-rules`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => {
        if(data.id && !data.error) setRules(data);
      })
      .catch(console.error);

    fetchUsers();
    fetchAnnouncements();
    fetchCourses();
  }, []);

  const fetchUsers = () => {
    fetch(`http://${window.location.hostname}:5000/api/settings/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setUsers(data);
      })
      .catch(console.error);
  };

  const fetchAnnouncements = () => {
    fetch(`http://${window.location.hostname}:5000/api/settings/announcements`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setAnnouncements(data);
      })
      .catch(console.error);
  };

  const fetchCourses = () => {
    fetch(`http://${window.location.hostname}:5000/api/settings/programs`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setCourses(data);
      })
      .catch(console.error);
  };

  const handleRuleChange = (e) => {
    const { name, value } = e.target;
    setRules(prev => ({ ...prev, [name]: value }));
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      await fetch(`http://${window.location.hostname}:5000/api/settings/library-rules`, { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify(rules)
      });
      // Re-fetch stats to update damage/lost fees at top
      fetch(`http://${window.location.hostname}:5000/api/settings/stats`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()).then(setStats);
    } catch(e) {
      console.error(e);
    }
    setSaving(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    navigate('/login');
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://${window.location.hostname}:5000/api/settings/announcements`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify(newAnnouncement)
      });
      if (res.ok) {
        setIsAnnouncementModalOpen(false);
        setNewAnnouncement({ title: '', body: '', priority: 'NORMAL', is_active: true });
        fetchAnnouncements();
        // Update stats
        fetch(`http://${window.location.hostname}:5000/api/settings/stats`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()).then(setStats);
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const confirmDeleteAnnouncement = (id) => {
    setAnnouncementToDelete(id);
  };

  const executeDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:5000/api/settings/announcements/${announcementToDelete}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, method: 'DELETE'
      });
      if (res.ok) {
        setAnnouncementToDelete(null);
        fetchAnnouncements();
        fetch(`http://${window.location.hostname}:5000/api/settings/stats`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()).then(setStats);
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      const url = newCourse.id 
        ? `http://${window.location.hostname}:5000/api/settings/programs/${newCourse.id}` 
        : `http://${window.location.hostname}:5000/api/settings/programs`;
      const method = newCourse.id ? 'PUT' : 'POST';

      const res = await fetch(url, { 
        method, 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`,  'Content-Type': 'application/json'  },
        body: JSON.stringify({ code: newCourse.code, name: newCourse.name })
      });
      const data = await res.json();
      if (res.ok) {
        setIsCourseModalOpen(false);
        setNewCourse({ id: null, code: '', name: '' });
        fetchCourses();
      } else {
        alert(data.error || 'Failed to save course');
      }
    } catch (error) {
      console.error('Error saving course:', error);
    }
  };

  const executeDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      const res = await fetch(`http://${window.location.hostname}:5000/api/settings/programs/${courseToDelete}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setCourseToDelete(null);
        fetchCourses();
      } else {
        alert(data.error || 'Failed to delete course');
        setCourseToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const handleUpdateRole = (userId, newRole) => {
    setPendingRoleChanges(prev => {
      const original = users.find(u => u.id === userId);
      if (original && original.role === newRole) {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      }
      return { ...prev, [userId]: newRole };
    });
  };

  const saveRoleChanges = async () => {
    setSavingRoles(true);
    try {
      const entries = Object.entries(pendingRoleChanges);
      for (const [userId, role] of entries) {
        await fetch(`http://${window.location.hostname}:5000/api/settings/users/${userId}/role`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role })
        });
      }
      setPendingRoleChanges({});
      fetchUsers();
    } catch (error) {
      console.error('Error saving role changes:', error);
    }
    setSavingRoles(false);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-transparent border-b border-gray-200 dark:border-dark-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 border border-gray-200 dark:border-dark-border rounded text-gray-500 dark:text-slate-400">
            <SettingsIcon size={18} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-gray-900 dark:text-slate-200 leading-none">Settings</h1>
            <span className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Configure library settings and preferences</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Removed Search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 font-medium mr-1">
              <div className="w-2 h-2 rounded-full bg-primary-600"></div> Open
            </div>
            <button onClick={toggleDarkMode} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 relative p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <NotificationDropdown />
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <div 
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all"
              >
                AL
              </div>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-border">
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-200">Admin Librarian</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">admin@liblog.edu</p>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2">
                    <User size={14} /> Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover flex items-center gap-2">
                    <SettingsIcon size={14} /> Settings
                  </button>
                  <div className="border-t border-gray-100 dark:border-dark-border my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-300">Settings</h2>
          <span className="text-sm text-gray-500 dark:text-slate-400">Manage users, configure library rules, and handle announcements</span>
        </div>

        {/* Top Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center"><Users size={20} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Total Users</p>
                <p className="text-xl font-bold text-gray-800 dark:text-slate-300 leading-none">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#f8f9fc] dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center"><Clock size={20} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Active Today</p>
                <p className="text-xl font-bold text-gray-800 dark:text-slate-300 leading-none">{stats.activeToday}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 flex items-center justify-center"><DollarSign size={20} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Total Penalties</p>
                <p className="text-xl font-bold text-gray-800 dark:text-slate-300 leading-none">₱{stats.totalPenalties?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center"><Megaphone size={20} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Active Announcements</p>
                <p className="text-xl font-bold text-gray-800 dark:text-slate-300 leading-none">{stats.activeAnnouncements || 0}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center"><AlertTriangle size={20} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Damage Fee</p>
                <p className="text-xl font-bold text-gray-800 dark:text-slate-300 leading-none">₱{stats.damageFee?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center"><BookX size={20} /></div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Lost Book Fee</p>
                <p className="text-xl font-bold text-gray-800 dark:text-slate-300 leading-none">₱{stats.lostBookFee?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Library Hours Timeline (Visual) */}
        <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl p-6 shadow-sm mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center"><Clock size={16}/></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Library Hours</h3>
                <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">• Open Now</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-slate-400">07:00 — 21:00</span>
            </div>
          </div>
          
          <div className="relative mt-2">
            {/* Timeline base */}
            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-primary-700" style={{width: '60%', marginLeft: '25%'}}></div>
            </div>
            {/* Markers */}
            <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-2 px-1">
              <span>12a</span><span>3a</span><span>6a</span><span>9a</span><span>12p</span><span>3p</span><span>6p</span><span>9p</span><span>12a</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-dark-border mb-6">
          <button 
            onClick={() => setActiveTab('manage-users')}
            className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors border-b-0 ${activeTab === 'manage-users' ? 'bg-primary-800 dark:bg-transparent dark:border dark:border-gray-500 text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-dark-hover'}`}
          >
            <Users size={16} /> Manage Users
          </button>
          <button 
            onClick={() => setActiveTab('library-rules')}
            className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors border-b-0 ${activeTab === 'library-rules' ? 'bg-primary-800 dark:bg-transparent dark:border dark:border-gray-500 text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-dark-hover'}`}
          >
            <SettingsIcon size={16} /> Library Rules
          </button>
          <button 
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors border-b-0 ${activeTab === 'announcements' ? 'bg-primary-800 dark:bg-transparent dark:border dark:border-gray-500 text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-dark-hover'}`}
          >
            <Megaphone size={16} /> Announcements
          </button>
          <button 
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2.5 text-sm font-bold flex items-center gap-2 rounded-t-lg transition-colors border-b-0 ${activeTab === 'courses' ? 'bg-primary-800 dark:bg-transparent dark:border dark:border-gray-500 text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-dark-hover'}`}
          >
            <GraduationCap size={16} /> Manage Courses
          </button>
        </div>

        {/* Tab Content: Manage Users */}
        {activeTab === 'manage-users' && (
          <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50/50 dark:bg-transparent">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14} />
                <input type="text" placeholder="Search by name or ID..." className="pl-9 pr-4 py-1.5 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-slate-200" />
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-dark-hover dark:bg-dark-bg bg-white dark:bg-transparent">
                  <Download size={14} /> Import Users
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900">
                  <Plus size={14} /> Add User
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-slate-400 uppercase bg-white dark:bg-transparent">
                    <th className="p-4 font-semibold">Student ID</th>
                    <th className="p-4 font-semibold">Card No.</th>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Role</th>
                    <th className="p-4 font-semibold">Program</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-right">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={`border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover/50 transition-colors ${pendingRoleChanges[u.id] ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>
                      <td className="p-4 font-mono text-gray-800 dark:text-slate-300">{u.student_id}</td>
                      <td className="p-4 font-mono text-gray-500 dark:text-slate-400">{u.card_no}</td>
                      <td className="p-4 font-medium text-gray-800 dark:text-slate-300">{u.name}</td>
                      <td className="p-4 text-gray-500 dark:text-slate-400">{u.email}</td>
                      <td className="p-4">
                        {u.role === 'ADMIN' ? (
                          <span className="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">{u.role}</span>
                        ) : (
                          <select 
                            value={pendingRoleChanges[u.id] || u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className={`text-[10px] font-bold px-2 py-1 rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors ${
                              pendingRoleChanges[u.id] 
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-300 ring-1 ring-yellow-200' 
                                : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'
                            }`}
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="FACULTY">FACULTY</option>
                          </select>
                        )}
                      </td>
                      <td className="p-4 text-gray-600 dark:text-slate-300">{u.program}</td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${u.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium text-gray-700">₱{u.penalty.toFixed(2)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan="8" className="p-8 text-center text-gray-400 dark:text-slate-500">Loading users...</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Save Changes Button */}
            <div className={`overflow-hidden transition-all duration-300 ${Object.keys(pendingRoleChanges).length > 0 ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 border-t border-gray-100 dark:border-dark-border bg-purple-50/50 dark:bg-purple-900/10 flex items-center justify-between">
                <span className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                  {Object.keys(pendingRoleChanges).length} role change{Object.keys(pendingRoleChanges).length !== 1 ? 's' : ''} pending
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPendingRoleChanges({})}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-dark-hover rounded-lg transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={saveRoleChanges}
                    disabled={savingRoles}
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary-800 text-white rounded-lg text-xs font-bold hover:bg-primary-900 transition-colors disabled:opacity-50 animate-pop-in"
                  >
                    <Save size={14} /> {savingRoles ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Library Rules */}
        {activeTab === 'library-rules' && (
          <div className="flex flex-col gap-6">
            
            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center gap-3 bg-gray-50/50 dark:bg-transparent">
                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><BookX size={16}/></div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Capacity & Borrowing</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Set library capacity limits and borrowing rules</p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-6">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Library Capacity</label>
                  <div className="relative">
                    <input name="library_capacity" value={rules.library_capacity} onChange={handleRuleChange} type="number" className="w-full pl-3 pr-12 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:ring-1 focus:ring-primary-500 dark:text-slate-200" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">seats</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Maximum number of people allowed inside the library at once.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Max Books Per User</label>
                  <div className="relative">
                    <input name="max_books_per_user" value={rules.max_books_per_user} onChange={handleRuleChange} type="number" className="w-full pl-3 pr-12 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:ring-1 focus:ring-primary-500 dark:text-slate-200" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">books</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Maximum number of books a single user can borrow at once.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Borrow Duration (Students)</label>
                  <div className="relative">
                    <input name="borrow_duration_students" value={rules.borrow_duration_students} onChange={handleRuleChange} type="number" className="w-full pl-3 pr-12 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:ring-1 focus:ring-primary-500 dark:text-slate-200" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">days</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">How long students can keep a borrowed book before it's due.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Borrow Duration (Faculty)</label>
                  <div className="relative">
                    <input name="borrow_duration_faculty" value={rules.borrow_duration_faculty} onChange={handleRuleChange} type="number" className="w-full pl-3 pr-12 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:ring-1 focus:ring-primary-500 dark:text-slate-200" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">days</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">How long faculty members can keep a borrowed book.</p>
                </div>

              </div>
            </div>

            <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center gap-3 bg-gray-50/50 dark:bg-transparent">
                <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><DollarSign size={16}/></div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-slate-300 text-sm">Penalty & Suspension</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Configure penalty fees and suspension rules</p>
                </div>
              </div>
              <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-6">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Penalty Fee Per Day</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">₱</span>
                    <input name="penalty_fee_per_day" value={rules.penalty_fee_per_day} onChange={handleRuleChange} type="number" step="0.01" className="w-full pl-8 pr-16 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:ring-1 focus:ring-primary-500 dark:text-slate-200" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">PHP/day</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Amount charged per day for overdue books.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Suspension Threshold</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">₱</span>
                    <input name="suspension_threshold" value={rules.suspension_threshold} onChange={handleRuleChange} type="number" step="0.01" className="w-full pl-8 pr-12 py-2 bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:ring-1 focus:ring-primary-500 dark:text-slate-200" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">PHP</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Users with unpaid penalties exceeding this amount will be suspended automatically.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Damage Penalty Fee (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">₱</span>
                    <input name="damage_fee" value={rules.damage_fee} onChange={handleRuleChange} type="number" step="0.01" className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">PHP</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Fixed penalty fee for damaged books.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700">Lost Book Penalty Fee (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">₱</span>
                    <input name="lost_book_fee" value={rules.lost_book_fee} onChange={handleRuleChange} type="number" step="0.01" className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-slate-500 font-medium">PHP</span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Fixed penalty fee for lost books.</p>
                </div>

              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={saveRules}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-800 text-white rounded-lg text-sm font-bold hover:bg-primary-900 shadow-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : <><Save size={16} /> Save Configuration</>}
              </button>
            </div>

          </div>
        )}

        {/* Tab Content: Announcements */}
        {activeTab === 'announcements' && (
          <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50/50 dark:bg-transparent">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14} />
                <input type="text" placeholder="Search announcements..." className="pl-9 pr-4 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <button 
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900"
              >
                <Plus size={14} /> Create Announcement
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-slate-400 uppercase bg-white dark:bg-transparent">
                    <th className="p-4 font-semibold w-2/3">Title</th>
                    <th className="p-4 font-semibold">Priority</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-right">Created</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map(a => (
                    <tr key={a.id} className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-800 dark:text-slate-300 mb-0.5">{a.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xl">{a.body}</p>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border 
                          ${a.priority === 'URGENT' ? 'bg-red-50 text-red-700 border-red-100' : 
                            a.priority === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                            a.priority === 'NORMAL' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                            'bg-gray-100 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-dark-border'}`}
                        >
                          {a.priority}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                           <div className={`w-8 h-4 rounded-full relative ${a.is_active ? 'bg-primary-600' : 'bg-gray-300'}`}>
                             <div className={`w-3 h-3 bg-white dark:bg-transparent rounded-full absolute top-0.5 ${a.is_active ? 'right-0.5' : 'left-0.5'}`}></div>
                           </div>
                           <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{a.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-gray-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => confirmDeleteAnnouncement(a.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                          title="Delete Announcement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {announcements.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400 dark:text-slate-500">No announcements found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Courses */}
        {activeTab === 'courses' && (
          <div className="bg-white dark:bg-transparent border border-gray-200 dark:border-dark-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50/50 dark:bg-transparent">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={14} />
                <input type="text" placeholder="Search courses..." className="pl-9 pr-4 py-1.5 border border-gray-200 dark:border-dark-border rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:bg-dark-bg dark:text-slate-200" />
              </div>
              <button 
                onClick={() => {
                  setNewCourse({ id: null, code: '', name: '' });
                  setIsCourseModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary-800 text-white rounded-lg text-sm font-medium hover:bg-primary-900"
              >
                <Plus size={14} /> Add Course
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-slate-400 uppercase bg-white dark:bg-transparent">
                    <th className="p-4 font-semibold w-1/4">Code</th>
                    <th className="p-4 font-semibold w-1/2">Name</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover/50 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-gray-800 dark:text-slate-300">{c.code}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-600 dark:text-slate-400">{c.name}</span>
                      </td>
                      <td className="p-4 text-center flex justify-center gap-2">
                        <button 
                          onClick={() => {
                            setNewCourse({ id: c.id, code: c.code, name: c.name });
                            setIsCourseModalOpen(true);
                          }}
                          className="text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 p-1.5 rounded-lg transition-colors"
                          title="Edit Course"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => setCourseToDelete(c.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {courses.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-400 dark:text-slate-500">No courses found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up border border-purple-100 dark:border-purple-900/30">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-dark-card">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Megaphone size={18} className="text-purple-600" />
                Create Announcement
              </h2>
              <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreateAnnouncement} className="flex flex-col">
              <div className="p-6 flex flex-col gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Title</label>
                  <input 
                    required
                    type="text" 
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                    placeholder="e.g. Library closed on holiday"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-bg focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-dark-card dark:text-slate-200"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Body</label>
                  <textarea 
                    required
                    value={newAnnouncement.body}
                    onChange={(e) => setNewAnnouncement({...newAnnouncement, body: e.target.value})}
                    placeholder="Announcement details..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-bg focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-dark-card dark:text-slate-200 resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Priority</label>
                    <select 
                      value={newAnnouncement.priority}
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-bg focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-dark-card dark:text-slate-200"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1.5 justify-center mt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newAnnouncement.is_active}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, is_active: e.target.checked})}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Set Active immediately</span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-[#5b21b6] hover:bg-[#4c1d95] text-white transition-colors"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {announcementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up border border-red-100 dark:border-red-900/30">
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg mb-1">Delete Announcement?</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Are you sure you want to delete this announcement? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex gap-3 justify-center">
              <button 
                onClick={() => setAnnouncementToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteAnnouncement}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up border border-purple-100 dark:border-purple-900/30">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-dark-card">
              <h2 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap size={18} className="text-purple-600" />
                {newCourse.id ? 'Edit Course' : 'Add Course'}
              </h2>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSaveCourse} className="flex flex-col">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Course Code</label>
                  <input 
                    required
                    type="text" 
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                    placeholder="e.g. BSCS"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-bg focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-dark-card dark:text-slate-200"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300">Course Name</label>
                  <input 
                    required
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    placeholder="e.g. Bachelor of Science in Computer Science"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm bg-gray-50 dark:bg-dark-bg focus:ring-1 focus:ring-primary-500 focus:bg-white dark:focus:bg-dark-card dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-primary-800 hover:bg-primary-900 text-white transition-colors"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up border border-red-100 dark:border-red-900/30">
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg mb-1">Delete Course?</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Are you sure you want to delete this course? This action cannot be undone if no students are enrolled in it.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border flex gap-3 justify-center">
              <button 
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteCourse}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
