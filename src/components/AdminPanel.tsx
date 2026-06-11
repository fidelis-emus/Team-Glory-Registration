import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, getFirebaseAuthErrorMessage } from '../firebase';
import { MOCK_VOLUNTEERS } from '../mockData';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser,
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { 
  collection, query, getDocs, doc, deleteDoc, updateDoc, writeBatch, count, setDoc
} from 'firebase/firestore';
import { Volunteer, AuditLog, HeadOfDepartment } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { 
  Lock, Mail, LogOut, Search, Filter, ArrowUpDown, ChevronDown, 
  Download, Printer, Eye, Trash2, Calendar, FileText, Check, AlertCircle,
  Database, Shield, RefreshCw, UserCheck, BookOpen, Users, BarChart3, HelpCircle, UserX, Building
} from 'lucide-react';

const MINISTRY_UNITS = [
  'Choir',
  'Creative (Drama, Dance, Arts)',
  'Technical (Sound, Lighting, Projection)',
  'Media (Photography, Social Media, Livestreaming)',
  'Production (Stage Management, Program Flow)',
  'Sunday School',
  'Children Ministry',
  'Youth/Teens Ministry',
  'Training',
  'House Fellowship',
  'Prayer',
  'Follow-up',
  'Quality Control',
  'Welfare',
  'Sanitation',
  'Hospitality/Protocol',
  'Outreach',
  'Community Service',
  'Ushering',
  'Security',
  'Logistics/Transport',
];

const MOCK_HODS: HeadOfDepartment[] = [
  { id: 'hod-1', fullName: 'Pastor Victor', department: 'Prayer', email: 'prayer.hod@teamglory.com', phoneNumber: '+234 801 111 2222' },
  { id: 'hod-2', fullName: 'Deacon John Ade', department: 'Choir', email: 'choir.hod@teamglory.com', phoneNumber: '+234 802 222 3333' },
  { id: 'hod-3', fullName: 'Sister Sarah Obi', department: 'Hospitality/Protocol', email: 'hospitality.hod@teamglory.com', phoneNumber: '+234 803 333 4444' },
  { id: 'hod-4', fullName: 'Brother David Cole', department: 'Technical (Sound, Lighting, Projection)', email: 'tech.hod@teamglory.com', phoneNumber: '+234 804 444 5555' },
];

interface AdminPanelProps {
  darkMode: boolean;
}

export default function AdminPanel({ darkMode }: AdminPanelProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Core Data
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [hods, setHods] = useState<HeadOfDepartment[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Selected Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'hods' | 'audit' | 'backup'>('dashboard');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterTraining, setFilterTraining] = useState<string>('');
  const [filterUnit, setFilterUnit] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<keyof Volunteer>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Volunteer Detail Profile
  const [selectedVol, setSelectedVol] = useState<Volunteer | null>(null);

  // Monitor auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
      if (usr) {
        fetchData();
      }
    });
    return unsubscribe;
  }, []);

  // Logger helper
  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substring(7),
      adminEmail: auth.currentUser?.email || 'admin@teamglory.com',
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Fetch registered volunteers
  const fetchData = async () => {
    setLoadingData(true);
    setErrorData(null);

    // If utilizing sandbox bypass, immediately load mock data to prevent unauthorized Firestore request failures
    if (auth.currentUser?.uid === 'local-admin-sandbox-token' || (!auth.currentUser && user?.uid === 'local-admin-sandbox-token')) {
      setVolunteers(MOCK_VOLUNTEERS);
      setHods(MOCK_HODS);
      setLoadingData(false);
      return;
    }

    try {
      // 1. Fetch Volunteers
      const q = query(collection(db, 'team_glory_members'));
      const snapshot = await getDocs(q);
      const list: Volunteer[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Volunteer);
      });
      
      if (list.length === 0) {
        setVolunteers(MOCK_VOLUNTEERS);
      } else {
        setVolunteers(list);
      }

      // 2. Fetch HODs
      try {
        const qHods = query(collection(db, 'heads_of_departments'));
        const snapshotHods = await getDocs(qHods);
        const listHods: HeadOfDepartment[] = [];
        snapshotHods.forEach((d) => {
          listHods.push({ id: d.id, ...d.data() } as HeadOfDepartment);
        });
        if (listHods.length === 0) {
          setHods(MOCK_HODS);
        } else {
          setHods(listHods);
        }
      } catch (hodErr: any) {
        console.warn("Using mock HODs as fallback:", hodErr);
        setHods(MOCK_HODS);
      }
    } catch (e: any) {
      console.error(e);
      setVolunteers(MOCK_VOLUNTEERS);
      setHods(MOCK_HODS);
      setErrorData(`Unable to synchronize live database records. Using offline-safe fallback sandbox profiles. (Reason: ${e.message || e || 'Permissions Denied'})`);
    } finally {
      setLoadingData(false);
    }
  };

  // Firebase auth handlers
  const handleInstantBypass = () => {
    setAuthError(null);
    const bypassUser = {
      email: 'admin@teamglory.com',
      uid: 'local-admin-sandbox-token',
      emailVerified: true
    } as any;
    setUser(bypassUser);
    
    // Set mock data right away in state
    setVolunteers(MOCK_VOLUNTEERS);
    addAuditLog("Admin Authorized (Bypass)", "Successfully entered admin console via local sandbox bypass with loaded mock data.");
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      try {
        await setDoc(doc(db, 'admins', result.user.uid), {
          email: result.user.email?.toLowerCase(),
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Could not write admin record:", dbErr);
      }
      addAuditLog("Admin Google Login", `Successful Google authentication for email: ${result.user.email}`);
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      setAuthError(err.message || 'Google Authentication failed. Please ensure your browser allows popups.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both Email and Password');
      return;
    }

    const isStandardDemoCreds = authEmail.trim().toLowerCase() === 'admin@teamglory.com' && authPassword === 'HouseOfGlory2026';

    try {
      const credential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
      try {
        await setDoc(doc(db, 'admins', credential.user.uid), {
          email: authEmail.toLowerCase(),
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Could not write admin record:", dbErr);
      }
      addAuditLog("Admin Login", `Successful console authentication for email: ${authEmail}`);
    } catch (err: any) {
      console.warn("Auth failed, checking test backdoors:", err);
      
      // If they are trying with the standard credentials, bypass any Firebase restriction or network error seamlessly
      if (isStandardDemoCreds) {
        console.info("Activating Local Sandbox Admin Bypass for standard credentials.");
        handleInstantBypass();
        return;
      }

      setAuthError(getFirebaseAuthErrorMessage(err));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both Email and Password');
      return;
    }
    try {
      const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      try {
        await setDoc(doc(db, 'admins', credential.user.uid), {
          email: authEmail.toLowerCase(),
          createdAt: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn("Could not write admin record during registration:", dbErr);
      }
      setAuthSuccess('Admin profile created successfully! Logging you in...');
      addAuditLog("Admin Sign Up", `New console account created: ${authEmail}`);
    } catch (err: any) {
      setAuthError(getFirebaseAuthErrorMessage(err));
    }
  };

  const handleLogout = async () => {
    addAuditLog("Admin Logout", `Email: ${auth.currentUser?.email} disconnected`);
    await signOut(auth);
    setUser(null);
  };

  // Delete Record
  const handleDeleteRecord = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete registration for ${name}?`)) {
      try {
        const isSandbox = id.startsWith('mock-') || user?.uid === 'local-admin-sandbox-token' || auth.currentUser?.uid === 'local-admin-sandbox-token';
        
        if (!isSandbox) {
          await deleteDoc(doc(db, 'team_glory_members', id));
        }
        
        setVolunteers(prev => prev.filter(v => v.id !== id));
        addAuditLog("Delete member", `Registration for ${name} [ID: ${id}] deleted ${isSandbox ? '(Local Sandbox / Mock data)' : ''}`);
        if (selectedVol?.id === id) setSelectedVol(null);
      } catch (err: any) {
        alert(`Failed to delete record: ${err.message}`);
      }
    }
  };

  // Create HOD
  const handleCreateHod = async (fullName: string, department: string, email: string, phoneNumber: string) => {
    try {
      const isSandbox = auth.currentUser?.uid === 'local-admin-sandbox-token' || user?.uid === 'local-admin-sandbox-token';
      const newHod: Omit<HeadOfDepartment, 'id'> = {
        fullName,
        department,
        email,
        phoneNumber
      };
      
      let finalId = 'hod-' + Math.random().toString(36).substring(7);
      if (!isSandbox) {
        const docRef = doc(collection(db, 'heads_of_departments'));
        await setDoc(docRef, newHod);
        finalId = docRef.id;
      }
      
      const created: HeadOfDepartment = { id: finalId, ...newHod };
      setHods(prev => [...prev, created]);
      addAuditLog("Create HOD", `Head of Department: ${fullName} created for department: ${department} ${isSandbox ? '(Local Sandbox / Mock data)' : ''}`);
      return true;
    } catch (err: any) {
      alert(`Failed to create Head of Department: ${err.message}`);
      return false;
    }
  };

  // Delete HOD
  const handleDeleteHod = async (hodId: string, name: string) => {
    if (confirm(`Are you sure you want to delete Head of Department: ${name}?`)) {
      try {
        const isSandbox = hodId.startsWith('hod-') || auth.currentUser?.uid === 'local-admin-sandbox-token' || user?.uid === 'local-admin-sandbox-token';
        if (!isSandbox) {
          await deleteDoc(doc(db, 'heads_of_departments', hodId));
        }
        setHods(prev => prev.filter(h => h.id !== hodId));
        addAuditLog("Delete HOD", `Head of Department: ${name} was deleted.`);
      } catch (err: any) {
        alert(`Failed to delete Head of Department: ${err.message}`);
      }
    }
  };

  // Update Volunteer fields (Assign HOD, re-assign first/second choice)
  const handleUpdateVolunteer = async (volunteerId: string, updatedFields: Partial<Volunteer>) => {
    try {
      const isSandbox = volunteerId.startsWith('mock-') || user?.uid === 'local-admin-sandbox-token' || auth.currentUser?.uid === 'local-admin-sandbox-token';
      
      if (!isSandbox) {
        await updateDoc(doc(db, 'team_glory_members', volunteerId), {
          ...updatedFields,
          updatedAt: new Date().toISOString()
        });
      }
      
      setVolunteers(prev => prev.map(v => {
        if (v.id === volunteerId) {
          const updated = { ...v, ...updatedFields, updatedAt: new Date().toISOString() };
          if (selectedVol?.id === volunteerId) {
            setSelectedVol(updated);
          }
          return updated;
        }
        return v;
      }));

      addAuditLog("Update member assignment", `Volunteer member ID: ${volunteerId} updated with fields: ${Object.keys(updatedFields).join(', ')} ${isSandbox ? '(Local Sandbox / Mock data)' : ''}`);
    } catch (err: any) {
      alert(`Failed to update member assignment: ${err.message}`);
    }
  };

  // EXPORT CSV / EXCEL
  const exportToCSV = () => {
    if (volunteers.length === 0) return;
    
    const headers = [
      'Member ID', 'Full Name', 'Phone Number', 'WhatsApp Number', 'Email', 
      'Gender', 'Date of Birth', 'Marital Status', 'Address', 'Church Attendance', 
      'Is Member', 'House Fellowship Name', 'Training Status', 'Training Details', 
      'First service Unit', 'Second Service Unit', 'Skills', 'Why Serve', 
      'Sundays', 'Meetings', 'Trainings', 'Programmes', 'Recommender Type', 'Recommender Details', 'Date Registered'
    ];

    const rows = volunteers.map(v => [
      v.memberId,
      v.fullName,
      v.phoneNumber,
      v.whatsappNumber,
      v.email,
      v.gender,
      v.dateOfBirth,
      v.maritalStatus,
      v.address.replace(/,/g, ';'), // Replace comma to avoid breaks
      v.churchDuration,
      v.churchMember ? 'Yes' : 'No',
      v.houseFellowshipName || 'None',
      v.workersTrainingStatus,
      v.class ? `${v.class} ${v.completionDate ? `(${v.completionDate})` : ''}` : '',
      v.firstUnit,
      v.secondUnit,
      (v.skills || []).join('; '),
      v.reasonForService.replace(/,/g, ';'),
      v.sundayAvailability ? 'Yes' : 'No',
      v.meetingsAvailability ? 'Yes' : 'No',
      v.trainingAvailability ? 'Yes' : 'No',
      v.programmesAvailability ? 'Yes' : 'No',
      v.recommendationType,
      v.recommendationName ? `${v.recommendationName} (${v.recommendationPhone})` : '',
      v.registrationDate
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `team_glory_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addAuditLog("Export Records", `Exported ${volunteers.length} registrations to CSV/Excel`);
  };

  // PRINT / PDF RENDER
  const handlePrint = () => {
    window.print();
    addAuditLog("Print Records", "Triggered system document print flow");
  };

  // BACKUP & RESTORE (Extra feature!)
  const triggerDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(volunteers, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `team_glory_members_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addAuditLog("System Backup", "Downloaded full JSON snapshot database backup");
  };

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const total = volunteers.length;
    let maleCount = 0;
    let femaleCount = 0;
    let completedTrain = 0;
    let undergoingTrain = 0;
    let notEnrolledTrain = 0;

    volunteers.forEach(v => {
      if (v.gender === 'Male') maleCount++;
      if (v.gender === 'Female') femaleCount++;

      if (v.workersTrainingStatus === 'I have completed the programme.') completedTrain++;
      else if (v.workersTrainingStatus === 'I am currently undergoing the programme.') undergoingTrain++;
      else notEnrolledTrain++;
    });

    // Units Breakdown
    const unitsMap: { [key: string]: number } = {};
    const monthlyMap: { [key: string]: number } = {};

    volunteers.forEach(v => {
      // First Unit count
      if (v.firstUnit) {
        unitsMap[v.firstUnit] = (unitsMap[v.firstUnit] || 0) + 1;
      }
      // Second Unit count
      if (v.secondUnit) {
        unitsMap[v.secondUnit] = (unitsMap[v.secondUnit] || 0) + 1;
      }

      // Reg Month (YYYY-MM)
      if (v.registrationDate) {
        const month = v.registrationDate.substring(0, 7); // "YYYY-MM"
        monthlyMap[month] = (monthlyMap[month] || 0) + 1;
      }
    });

    const unitsChartData = Object.entries(unitsMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const monthlyChartData = Object.entries(monthlyMap).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));

    return {
      total,
      male: maleCount,
      female: femaleCount,
      completedTrain,
      undergoingTrain,
      notEnrolledTrain,
      unitsData: unitsChartData,
      monthlyData: monthlyChartData,
    };
  }, [volunteers]);

  // Handle Search & Filter logic
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter(v => {
      // Search Box: name, phone, email, memberId
      const cleanSearch = searchQuery.toLowerCase();
      const matchSearch = !cleanSearch || 
        v.fullName.toLowerCase().includes(cleanSearch) ||
        v.phoneNumber.includes(cleanSearch) ||
        v.memberId.toLowerCase().includes(cleanSearch) ||
        v.firstUnit.toLowerCase().includes(cleanSearch) ||
        v.secondUnit.toLowerCase().includes(cleanSearch);

      // Filters
      const matchGender = !filterGender || v.gender === filterGender;
      const matchTraining = !filterTraining || v.workersTrainingStatus === filterTraining;
      const matchUnit = !filterUnit || v.firstUnit === filterUnit || v.secondUnit === filterUnit;
      
      const matchDateFrom = !filterDateFrom || v.registrationDate >= filterDateFrom;
      const matchDateTo = !filterDateTo || v.registrationDate <= filterDateTo;

      return matchSearch && matchGender && matchTraining && matchUnit && matchDateFrom && matchDateTo;
    });
  }, [volunteers, searchQuery, filterGender, filterTraining, filterUnit, filterDateFrom, filterDateTo]);

  // Sort Logic
  const sortedVolunteers = useMemo(() => {
    const list = [...filteredVolunteers];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      // Fallback for dates/numbers
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredVolunteers, sortField, sortDirection]);

  // Pagination Logic
  const paginatedVolunteers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedVolunteers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedVolunteers, currentPage]);

  const totalPages = Math.ceil(sortedVolunteers.length / itemsPerPage) || 1;

  // Sorting helper
  const handleSort = (field: keyof Volunteer) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">Authenticating Server Access...</p>
      </div>
    );
  }

  // LOGIN PAGE
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="frosted-glass-card-light dark:frosted-glass-card-dark rounded-3xl p-8 shadow-xl relative overflow-hidden"
        >
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

          <div className="text-center mb-6 relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/15 text-blue-605 dark:text-blue-400 mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white font-sans">Admin Portal</h2>
            <p className="text-xs text-slate-500 dark:text-blue-200/60 mt-1 font-semibold uppercase tracking-widest">TEAM GLORY REGISTRY CONSOLE</p>
          </div>

          {authError && (
            <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 font-medium relative z-10">
              <AlertCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-semibold relative z-10">
              <Check className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-blue-200/70 uppercase tracking-widest mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="admin@teamglory.com" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-blue-200/70 uppercase tracking-widest mb-1.5">Console Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              id="btn-admin-submit"
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-750 hover:to-indigo-600 rounded-xl text-white font-bold text-sm shadow-md transition-all duration-300 cursor-pointer"
            >
              {isRegistering ? 'Register Admin Account' : 'Authenticate Console'}
            </button>

            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-slate-200/50 dark:border-white/5" />
              <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 dark:text-blue-200/40 uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-slate-200/50 dark:border-white/5" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 bg-white/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-blue-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold"
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  style={{ fill: '#4285F4' }}
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  style={{ fill: '#34A853' }}
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  style={{ fill: '#FBBC05' }}
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  style={{ fill: '#EA4335' }}
                />
              </svg>
              Sign In with Google
            </button>
          </form>

          {/* Quick Demo Assist */}
          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/5 text-center relative z-10 border-dashed">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(prev => !prev);
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isRegistering ? "Existing Administrator? Sign In" : "Need a Console Admin Account? Create One"}
            </button>

            <div className="mt-3.5 p-3.5 bg-blue-50/40 dark:bg-slate-950/35 rounded-xl text-left border border-blue-500/10 text-[11px] text-slate-500 dark:text-blue-200/50 leading-relaxed font-semibold">
              💡 <span className="text-slate-800 dark:text-blue-105">Fast Demo access:</span> Use email <span className="font-mono text-blue-700 dark:text-blue-300">admin@teamglory.com</span> and password <span className="font-mono text-blue-700 dark:text-blue-300">HouseOfGlory2026</span> to bypass sandbox environment constraints.
              <div className="mt-2 pt-2.5 border-t border-blue-500/10 text-center">
                <button
                  type="button"
                  onClick={handleInstantBypass}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-[11px] font-black cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                >
                  ⚡ One-Click Sandbox Local Sign In
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // MAIN PORTAL VIEW
  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Navigation & Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 frosted-glass-card-light dark:frosted-glass-card-dark p-5 rounded-3xl border border-white/20 dark:border-white/10 shadow-lg relative overflow-hidden print:hidden">
        <div className="relative z-10">
          <span className="text-xs uppercase tracking-widest font-black text-blue-600 dark:text-blue-405">RCCG HOUSE OF GLORY</span>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white font-sans mt-0.5">TEAM GLORY Console</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-xs text-slate-500 dark:text-blue-200/50 font-bold">{user.email} (Administrator Role)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'dashboard' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-transparent shadow-sm shadow-blue-500/10' 
              : 'bg-white/40 hover:bg-slate-150/50 dark:bg-slate-950/25 dark:text-blue-200/70 dark:hover:bg-slate-900/50 border-slate-200/60 dark:border-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Dashboard KPI
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'members' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-transparent shadow-sm shadow-blue-500/10' 
              : 'bg-white/40 hover:bg-slate-150/50 dark:bg-slate-950/25 dark:text-blue-200/70 dark:hover:bg-slate-900/50 border-slate-200/60 dark:border-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Volunteers Table
          </button>
          <button
            onClick={() => setActiveTab('hods')}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'hods' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-transparent shadow-sm shadow-blue-500/10' 
              : 'bg-white/40 hover:bg-slate-150/50 dark:bg-slate-950/25 dark:text-blue-200/70 dark:hover:bg-slate-900/50 border-slate-200/60 dark:border-white/5'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Manage HODs
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'audit' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-transparent shadow-sm shadow-blue-500/10' 
              : 'bg-white/40 hover:bg-slate-150/50 dark:bg-slate-950/25 dark:text-blue-200/70 dark:hover:bg-slate-900/50 border-slate-200/60 dark:border-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeTab === 'backup' 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-transparent shadow-sm shadow-blue-500/10' 
              : 'bg-white/40 hover:bg-slate-150/50 dark:bg-slate-950/25 dark:text-blue-200/70 dark:hover:bg-slate-900/50 border-slate-200/60 dark:border-white/5'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Backup Center
          </button>

          <button
            id="btn-logout"
            onClick={handleLogout}
            className="p-2.5 bg-red-500/15 text-red-650 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer ml-2 border border-red-500/10"
            title="Disconnect"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loadingData && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl mb-6 flex items-center gap-3 font-semibold text-sm">
          <RefreshCw className="w-4 loop animate-spin text-amber-500" />
          Synchronizing Live Database Records...
        </div>
      )}

      {errorData && (
        <div className="p-4 bg-red-500/15 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl mb-6 flex items-start gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <span>{errorData}</span>
            <button onClick={fetchData} className="block mt-2 font-bold hover:underline">Retry sync</button>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: DASHBOARD KPI */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* STATS COUNT GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">Total Registrations</span>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">Male Volunteers</span>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{stats.male}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">Female Volunteers</span>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{stats.female}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">WIT Completed</span>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{stats.completedTrain}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-center shadow-sm">
              <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">Currently Undergoing Training</span>
              <p className="text-lg font-black text-gray-950 dark:text-white mt-0.5">{stats.undergoingTrain}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-center shadow-sm">
              <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">Not yet Enrolled WIT</span>
              <p className="text-lg font-black text-gray-950 dark:text-white mt-0.5">{stats.notEnrolledTrain}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-center shadow-sm flex justify-center items-center gap-1 bg-amber-502">
              <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 font-bold">Status sync:</span>
              <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 bg-transparent">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Durable Firestore
              </p>
            </div>
          </div>

          {/* CHARTS GRAPHICS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart A: Ministry Unit Distribution */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Members by Ministry Unit</h3>
              <div className="h-64 bg-transparent">
                {stats.unitsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.unitsData} layout="vertical">
                      <XAxis type="number" stroke="#90A4AE" style={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" stroke="#90A4AE" style={{ fontSize: 9 }} width={120} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: '#1E293B', color: '#FFF', fontSize: 12 }} />
                      <Bar dataKey="count" fill="#E11D48" radius={[0, 4, 4, 0]}>
                        {stats.unitsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#DC2626' : '#F59E0B'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">No Unit records submitted yet</div>
                )}
              </div>
            </div>

            {/* Chart B: Gender Distribution */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Members by Gender</h3>
                <div className="h-48 bg-transparent flex items-center justify-center">
                  {stats.total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Male', value: stats.male },
                            { name: 'Female', value: stats.female },
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#F59E0B" />
                          <Cell fill="#DC2626" />
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-gray-400">No gender records submitted yet</div>
                  )}
                </div>
              </div>

              {/* Training proportion chart */}
              <div className="border-t border-gray-150 dark:border-gray-700 pt-4 mt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Workers-In-Training Status Breakdown</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-medium">Completed</span>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.total ? Math.round((stats.completedTrain / stats.total) * 100) : 0}%</p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-medium">Undergoing</span>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400">{stats.total ? Math.round((stats.undergoingTrain / stats.total) * 100) : 0}%</p>
                  </div>
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-medium">Not Enrolled</span>
                    <p className="text-sm font-black text-red-600 dark:text-red-400">{stats.total ? Math.round((stats.notEnrolledTrain / stats.total) * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Chart: Monthly Velocity */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Monthly Registration Velocity</h3>
            <div className="h-56 bg-transparent">
              {stats.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.10} />
                    <XAxis dataKey="name" stroke="#90A4AE" style={{ fontSize: 10 }} />
                    <YAxis stroke="#90A4AE" style={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', backgroundColor: '#1E293B', color: '#FFF', fontSize: 11 }} />
                    <Line type="monotone" dataKey="count" stroke="#DC2626" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">No monthly registration trends detected yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS TABLE VIEW */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* SEARCH, FILTERS & ACTION ACTIONS ROW */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 print:hidden">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by name, phone, unit or Member ID..." 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-xs transition-all"
                />
              </div>

              {/* Core export buttons */}
              <div className="flex gap-2 justify-end sm:justify-start">
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Export to CSV / Microsoft Excel Spreadsheet format"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel / CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Print custom layout / Export to PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>

            {/* Filter grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Gender</label>
                <select
                  value={filterGender}
                  onChange={e => { setFilterGender(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Training Level</label>
                <select
                  value={filterTraining}
                  onChange={e => { setFilterTraining(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none"
                >
                  <option value="">All Training States</option>
                  <option value="I have completed the programme.">Completed WIT</option>
                  <option value="I am currently undergoing the programme.">Undergoing WIT</option>
                  <option value="I have not yet enrolled.">Not Enrolled</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ministry Unit</label>
                <select
                  value={filterUnit}
                  onChange={e => { setFilterUnit(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none"
                >
                  <option value="">All Ministry Units</option>
                  {MINISTRY_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                  <input 
                    type="date"
                    value={filterDateFrom}
                    onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-[10px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                  <input 
                    type="date"
                    value={filterDateTo}
                    onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-[10px] outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-[11px] text-gray-400 font-semibold pt-1">
              <span>Found <span className="text-amber-500">{sortedVolunteers.length}</span> registrations matching filters</span>
              {(searchQuery || filterGender || filterTraining || filterUnit || filterDateFrom || filterDateTo) && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterGender('');
                    setFilterTraining('');
                    setFilterUnit('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }} 
                  className="text-red-500 hover:underline font-bold"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-xl overflow-hidden print:-mx-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-gray-750 dark:text-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-700 uppercase font-black text-gray-400">
                  <tr>
                    <th onClick={() => handleSort('memberId')} className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 transition">
                      <div className="flex items-center gap-1">Member ID <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th onClick={() => handleSort('fullName')} className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 transition">
                      <div className="flex items-center gap-1">Full Name <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3">First choice</th>
                    <th className="px-5 py-3">Second Choice</th>
                    <th className="px-5 py-3">Assigned HOD</th>
                    <th onClick={() => handleSort('workersTrainingStatus')} className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 transition">
                      <div className="flex items-center gap-1">Training <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th onClick={() => handleSort('registrationDate')} className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 transition">
                      <div className="flex items-center gap-1">Registered <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-4 py-3 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-750">
                  {paginatedVolunteers.length > 0 ? (
                    paginatedVolunteers.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-5 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {v.memberId}
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">
                          {v.fullName}
                        </td>
                        <td className="px-5 py-3 font-medium">
                          {v.phoneNumber}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.gender === 'Male' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'}`}>
                            {v.gender}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-bold text-gray-800 dark:text-gray-300">
                          {v.firstUnit}
                        </td>
                        <td className="px-5 py-3 font-bold text-gray-800 dark:text-gray-300">
                          {v.secondUnit}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          {(() => {
                            const found = hods.find(h => h.id === v.assignedHodId);
                            return found ? (
                              <span className="inline-flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                {found.fullName}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 italic">Unassigned</span>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] font-bold ${v.workersTrainingStatus === 'I have completed the programme.' ? 'text-emerald-500' : v.workersTrainingStatus === 'I am currently undergoing the programme.' ? 'text-amber-500' : 'text-gray-400'}`}>
                            {v.workersTrainingStatus === 'I have completed the programme.' ? 'Completed' : v.workersTrainingStatus === 'I am currently undergoing the programme.' ? 'Undergoing' : 'Not Enrolled'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-500">
                          {v.registrationDate}
                        </td>
                        <td className="px-4 py-3 text-right print:hidden">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => setSelectedVol(v)}
                              className="p-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg transition"
                              title="Inspector view"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(v.id, v.fullName)}
                              className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                              title="Delete record permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-5 py-8 text-center text-gray-400 font-semibold">
                        No volunteer registrations found matching the applied search query or date range filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-150 dark:border-gray-750 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-400 font-bold print:hidden">
                <span>Showing page {currentPage} of {totalPages}</span>
                <div className="flex gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 hover:bg-gray-100 disabled:opacity-40 rounded-lg transition cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 hover:bg-gray-100 disabled:opacity-40 rounded-lg transition cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MANAGE HODs */}
      {activeTab === 'hods' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Form */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 p-6 shadow-md h-fit">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white font-sans uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-5 h-5 text-amber-500" />
              Add HOD
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-medium">Create a Head of Department to manage workers and members.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fullName = (form.elements.namedItem('fullName') as HTMLInputElement).value;
              const department = (form.elements.namedItem('department') as HTMLSelectElement).value;
              const email = (form.elements.namedItem('email') as HTMLInputElement).value;
              const phoneNumber = (form.elements.namedItem('phoneNumber') as HTMLInputElement).value;
              
              if (!fullName || !department) {
                alert('Please provide Name and Department');
                return;
              }
              
              handleCreateHod(fullName, department, email, phoneNumber).then(success => {
                if (success) {
                  form.reset();
                }
              });
            }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="fullName">Full Name *</label>
                <input 
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Pastor James"
                  className="w-full px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="department">Department / Ministry Unit *</label>
                <select 
                  id="department"
                  name="department"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                >
                  <option value="" disabled selected>Select Department</option>
                  {MINISTRY_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="email">Email address</label>
                <input 
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. james@teamglory.com"
                  className="w-full px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider mb-1.5" htmlFor="phoneNumber">Phone Number</label>
                <input 
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="e.g. +234 80 1234 5678"
                  className="w-full px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none focus:border-amber-500 dark:focus:border-amber-500 transition"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Create Head of Department
              </button>
            </form>
          </div>

          {/* Current HODs List */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 p-6 shadow-md">
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white font-sans uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-5 h-5 text-amber-500" />
              Active Head of Departments
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-medium">Total registered HODs: {hods.length}</p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-gray-750 dark:text-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-700 uppercase font-bold text-gray-400 text-[10px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Full Name</th>
                    <th className="px-4 py-3 font-semibold">Department Led</th>
                    <th className="px-4 py-3 font-semibold">Contacts</th>
                    <th className="px-4 py-3 text-center font-semibold">Assigned Members</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {hods.length > 0 ? (
                    hods.map(hod => {
                      const assignedCount = volunteers.filter(v => v.assignedHodId === hod.id).length;
                      return (
                        <tr key={hod.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/40 transition">
                          <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-white">
                            {hod.fullName}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-lg text-[10px]">
                              {hod.department}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 space-y-0.5 text-slate-500 dark:text-gray-400 font-medium font-sans">
                            {hod.email && <div className="text-[11px] font-semibold">{hod.email}</div>}
                            {hod.phoneNumber && <div className="font-mono text-[10px]">{hod.phoneNumber}</div>}
                            {!hod.email && !hod.phoneNumber && <span className="text-gray-450 italic">None provided</span>}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black rounded-lg text-xs">
                              {assignedCount}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteHod(hod.id, hod.fullName)}
                              className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition"
                              title="Delete HOD"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-450 italic font-medium">
                        No Head of Departments defined yet. Specify a new HOD using the form on the left.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 p-6 shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white font-sans uppercase tracking-wider">System Audit Trail</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Real-time local recording of all administrative actions in current session</p>
            </div>
            <button 
              onClick={() => { setAuditLogs([]); addAuditLog("Clear Logs", "Session audit trails cleared manually"); }}
              className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
            >
              Clear current session logs
            </button>
          </div>

          <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-2">
            {auditLogs.length > 0 ? (
              auditLogs.map(log => (
                <div key={log.id} className="p-3 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-150 dark:border-gray-700/50 rounded-xl flex items-start gap-3.5 text-xs">
                  <span className="font-mono text-gray-400 dark:text-gray-500 select-none">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <div>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 font-bold uppercase tracking-widest text-[9px]">
                      {log.action}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 font-semibold">{log.details}</p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Triggered by administrator: {log.adminEmail}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400 font-semibold text-xs">No administrative audit events recorded in this session. Logs gather dynamically upon admin interaction.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP CENTER */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 p-6 shadow-md space-y-6">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white font-sans uppercase tracking-wider">Disaster Recovery & JSON Snapshots</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Download raw registrations profiles or restore snapshot captures to standard local memory storage units</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl space-y-3 text-center">
              <div className="inline-flex py-2 px-3 bg-amber-500/10 rounded-xl text-amber-500">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">Request Snapshot Download</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">Generate and download standard structured JSON document snapshot with active data nodes</p>
              <button
                onClick={triggerDownloadBackup}
                className="inline-flex px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
              >
                Download Backup Snapshot
              </button>
            </div>

            <div className="p-5 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl space-y-3 text-center">
              <div className="inline-flex py-2 px-3 bg-red-500/10 rounded-xl text-red-500">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">Admin Role & Status Check</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">Verify active rule settings, Firestore schemas enforcement profiles and client credentials integrity rules</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full text-[10px] font-bold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Firestore Fortress Schema v1.1 Encrypted
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL OVERLAY INVENTOR */}
      <AnimatePresence>
        {selectedVol && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8"
            >
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-4 mb-6">
                <div>
                  <span className="text-xs font-bold text-amber-500 font-mono uppercase tracking-widest">{selectedVol.memberId}</span>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1 leading-none">{selectedVol.fullName}</h3>
                  <p className="text-[10px] text-gray-400 mt-2 font-semibold uppercase tracking-wider">Volunteering Profile Inspector</p>
                </div>
                <button
                  onClick={() => setSelectedVol(null)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-xl transition duration-200 cursor-pointer font-bold"
                >
                  Close Profile
                </button>
              </div>

              {/* Profile grid divisions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[460px] overflow-y-auto pr-2 space-y-4 md:space-y-0">
                {/* Section 1: Personal Coordinates */}
                <div className="space-y-4">
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl space-y-3 border border-gray-150 dark:border-gray-700">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-1">
                      <UserCheck className="w-4 h-4" /> Personal Coordinates
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400">Gender</span>
                        <p className="font-bold text-gray-800 dark:text-white mt-0.5">{selectedVol.gender}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">Marital Status</span>
                        <p className="font-bold text-gray-800 dark:text-white mt-0.5">{selectedVol.maritalStatus}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">Date of Birth</span>
                        <p className="font-semibold text-gray-800 dark:text-white mt-0.5">{selectedVol.dateOfBirth}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">Date Registered</span>
                        <p className="font-semibold text-gray-800 dark:text-white mt-0.5">{selectedVol.registrationDate}</p>
                      </div>
                    </div>

                    <div className="text-xs pt-1">
                      <span className="text-[10px] text-gray-400 font-medium">Residential Address</span>
                      <p className="font-semibold text-gray-800 dark:text-white mt-0.5 leading-relaxed bg-white dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">{selectedVol.address}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-gray-400">Primary Phone</span>
                        <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">{selectedVol.phoneNumber}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">WhatsApp Channel</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">{selectedVol.whatsappNumber || selectedVol.phoneNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Church Attendance Stats */}
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl space-y-3 border border-gray-150 dark:border-gray-700">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-1">
                      <Building className="w-4 h-4" /> Church Fellowship stats
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400">Attendance Span</span>
                        <p className="font-bold text-gray-850 dark:text-white mt-0.5">{selectedVol.churchDuration}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">Official Member</span>
                        <p className="font-bold text-gray-850 dark:text-white mt-0.5">{selectedVol.churchMember ? 'Yes, RCCG' : 'No'}</p>
                      </div>
                    </div>

                    <div className="text-xs pt-1.5 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 block mb-0.5">Cell / House Fellowship Status</span>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold rounded-lg leading-none">
                        {selectedVol.houseFellowshipStatus ? `Part of Fellowship: ${selectedVol.houseFellowshipName || 'Active cell'}` : 'Not currently enrolled in Cell group'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Professional Volunteering match */}
                <div className="space-y-4">
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl space-y-3.5 border border-gray-150 dark:border-gray-700">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-1">
                      <Users className="w-4 h-4" /> Ministry matching
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-gradient-to-r from-red-600 to-red-650 text-white rounded-lg shadow-sm">
                        <span className="text-[9px] text-red-50 uppercase tracking-wider font-bold">First Choice Unit</span>
                        <p className="font-black mt-1 text-sm">{selectedVol.firstUnit}</p>
                      </div>
                      <div className="p-2.5 bg-gradient-to-r from-amber-500 to-amber-550 text-white rounded-lg shadow-sm">
                        <span className="text-[9px] text-amber-50 uppercase tracking-wider font-bold">Second Choice Unit</span>
                        <p className="font-black mt-1 text-sm">{selectedVol.secondUnit}</p>
                      </div>
                    </div>

                    <div className="text-xs pt-1">
                      <span className="text-[10px] text-gray-400 block mb-1 font-semibold">Allocated Skills Coordinates:</span>
                      <div className="flex flex-wrap gap-1">
                        {(selectedVol.skills || []).map(skill => (
                          <span key={skill} className="px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold rounded text-[10px]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] text-gray-400">Motivation reason for service</span>
                      <p className="font-semibold text-gray-700 dark:text-gray-300 mt-1 italic leading-relaxed bg-white dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-805">
                        "{selectedVol.reasonForService || 'No detailed motivators specified'}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-400">Flexibility Placement?</span>
                        <p className="font-bold mt-0.5">{selectedVol.flexibleUnit ? 'Yes, will accommodate' : 'No, strictly specified'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400">Commitment contract agreed</span>
                        <p className="font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Checked Contract
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Administrative HOD & Unit Assignment Controls */}
                  <div className="bg-blue-500/10 dark:bg-blue-950/20 p-4 rounded-xl space-y-3.5 border border-blue-105/20 dark:border-blue-900/40">
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-blue-100 dark:border-blue-900/40 pb-1.5 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-500" /> HOD & Unit Assignments
                    </h4>
                    
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-sans">Assign Head of Department</label>
                        <select
                          value={selectedVol.assignedHodId || ''}
                          onChange={(e) => handleUpdateVolunteer(selectedVol.id, { assignedHodId: e.target.value || undefined })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-750 dark:text-white text-xs outline-none focus:border-blue-500 dark:focus:border-blue-500 transition"
                        >
                          <option value="">-- No HOD Assigned --</option>
                          {hods.map(h => (
                            <option key={h.id} value={h.id}>
                              {h.fullName} ({h.department})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-sans">1st Choice Unit</label>
                          <select
                            value={selectedVol.firstUnit}
                            onChange={(e) => handleUpdateVolunteer(selectedVol.id, { firstUnit: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-750 dark:text-white text-xs outline-none focus:border-blue-500 dark:focus:border-blue-500 transition"
                          >
                            {MINISTRY_UNITS.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-sans">2nd Choice Unit</label>
                          <select
                            value={selectedVol.secondUnit}
                            onChange={(e) => handleUpdateVolunteer(selectedVol.id, { secondUnit: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-750 dark:text-white text-xs outline-none focus:border-blue-500 dark:focus:border-blue-500 transition"
                          >
                            {MINISTRY_UNITS.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: WIT Training Program info */}
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl space-y-3 border border-gray-150 dark:border-gray-700">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-1">
                      <BookOpen className="w-4 h-4" /> Workers' Training level
                    </h4>

                    <div className="text-xs space-y-2">
                      <p className="font-bold text-gray-800 dark:text-white">{selectedVol.workersTrainingStatus}</p>
                      {selectedVol.class && (
                        <p className="text-[11px] text-gray-600 dark:text-gray-400">
                          Class / Batch detail: <strong className="text-gray-800 dark:text-gray-200">{selectedVol.class}</strong> 
                          {selectedVol.completionDate && ` on completion date ${selectedVol.completionDate}`}
                        </p>
                      )}
                      {selectedVol.workersTrainingStatus === 'I have not yet enrolled.' && (
                        <p className="text-[11px]">
                          Accept Next Class Enrollment? <strong className="text-amber-600 dark:text-amber-400">{selectedVol.enrollNextClass ? 'Yes, enrollment authorized' : 'No'}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section 5: Availability Indicators */}
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl space-y-3.5 border border-gray-150 dark:border-gray-700">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center justify-between">
                      <span>Availability schedule</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      <div className={`p-1.5 rounded-lg text-center ${selectedVol.sundayAvailability ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-900/40'}`}>
                        Sundays
                      </div>
                      <div className={`p-1.5 rounded-lg text-center ${selectedVol.meetingsAvailability ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-900/40'}`}>
                        Workers' Meetings
                      </div>
                      <div className={`p-1.5 rounded-lg text-center ${selectedVol.trainingAvailability ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-900/40'}`}>
                        Trainings
                      </div>
                      <div className={`p-1.5 rounded-lg text-center ${selectedVol.programmesAvailability ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-900/40'}`}>
                        Special Programmes
                      </div>
                    </div>
                  </div>

                  {/* Section 6: Official Recommendation details */}
                  <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-xl space-y-2 border border-gray-150 dark:border-gray-700">
                    <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-1.5">
                      Recommendation source
                    </h4>

                    <div className="text-xs space-y-1">
                      <span className="text-[10px] text-gray-400">Recommender type</span>
                      <p className="font-bold">{selectedVol.recommendationType}</p>
                      {selectedVol.recommendationType !== 'None' && (
                        <div className="bg-white dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800 text-[11px] mt-1.5">
                          <p>Official Name: <strong className="text-gray-900 dark:text-white">{selectedVol.recommendationName}</strong></p>
                          <p className="mt-0.5">Phone Number: <span className="font-mono font-bold text-amber-600">{selectedVol.recommendationPhone}</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
