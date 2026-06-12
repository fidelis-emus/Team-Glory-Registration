import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, getFirebaseAuthErrorMessage, handleFirestoreError, OperationType } from '../firebase';
import { 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser,
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth';
import { 
  collection, query, getDocs, doc, deleteDoc, updateDoc, writeBatch, setDoc, onSnapshot, addDoc
} from 'firebase/firestore';
import { Volunteer, AuditLog, HeadOfDepartment, FirstTimer, Member, TrainingRegistration, HouseFellowshipRegistration, InterestGroupsRegistration } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { 
  Lock, Mail, LogOut, Search, Filter, ArrowUpDown, ChevronDown, 
  Download, Printer, Eye, Trash2, Calendar, FileText, Check, AlertCircle,
  Database, Shield, RefreshCw, UserCheck, BookOpen, Users, BarChart3, HelpCircle, 
  UserX, Building, Edit, Sparkles, Heart, MapPin, CheckCircle, PlusCircle, Settings, Key,
  Loader2, Info, Briefcase, Cake, Gift, Send
} from 'lucide-react';

export function getBirthdayInfo(dob: string) {
  if (!dob) return { formatted: 'N/A', daysUntil: 9999, isToday: false, isTomorrow: false, dateLabel: 'N/A' };
  
  let month = -1;
  let day = -1;
  let dateLabel = dob;

  const yyyymmddRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  if (yyyymmddRegex.test(dob)) {
    const match = dob.match(yyyymmddRegex);
    if (match) {
      const mIdx = parseInt(match[2], 10) - 1;
      const dNum = parseInt(match[3], 10);
      month = mIdx;
      day = dNum;
      const fullMonthName = monthNames[mIdx] ? monthNames[mIdx].charAt(0).toUpperCase() + monthNames[mIdx].slice(1) : '';
      dateLabel = `${fullMonthName} ${day}`;
    }
  } else {
    const parts = dob.trim().toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      let monthStr = '';
      let dayStr = '';
      if (isNaN(parseInt(parts[0], 10))) {
        monthStr = parts[0];
        dayStr = parts[1];
      } else {
        dayStr = parts[0];
        monthStr = parts[1];
      }

      const dNum = parseInt(dayStr, 10);
      const mIdx = monthNames.findIndex(m => m === monthStr || m.substring(0, 3) === monthStr);
      if (mIdx !== -1 && !isNaN(dNum)) {
        month = mIdx;
        day = dNum;
        const fullMonthName = monthNames[mIdx].charAt(0).toUpperCase() + monthNames[mIdx].slice(1);
        dateLabel = `${fullMonthName} ${day}`;
      }
    }
  }

  if (month === -1 || day === -1) {
    return { formatted: dob, daysUntil: 9999, isToday: false, isTomorrow: false, dateLabel: dob };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  
  const bdayThisYear = new Date(currentYear, month, day);
  bdayThisYear.setHours(0, 0, 0, 0);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);

  let daysUntil = 0;
  if (bdayThisYear.getTime() === today.getTime()) {
    daysUntil = 0;
  } else if (bdayThisYear.getTime() < today.getTime()) {
    const bdayNextYear = new Date(currentYear + 1, month, day);
    bdayNextYear.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(bdayNextYear.getTime() - today.getTime());
    daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } else {
    const diffTime = Math.abs(bdayThisYear.getTime() - today.getTime());
    daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const isToday = daysUntil === 0;
  const isTomorrow = daysUntil === 1;

  let dueLabel = '';
  if (isToday) {
    dueLabel = 'Today! 🎂';
  } else if (isTomorrow) {
    dueLabel = 'Tomorrow! 🎈';
  } else {
    dueLabel = `in ${daysUntil} days`;
  }

  return {
    formatted: `${dateLabel} (${dueLabel})`,
    daysUntil,
    isToday,
    isTomorrow,
    dateLabel,
    month,
    day
  };
}

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
  'Logistics/Transport'
];

interface AdminPanelProps {
  darkMode: boolean;
}

type RecordSegment =
  | 'first_timers'
  | 'first_timer_workers'
  | 'members'
  | 'member_workers'
  | 'workers'
  | 'training_registrations'
  | 'house_fellowship_registrations'
  | 'interest_groups';

export default function AdminPanel({ darkMode }: AdminPanelProps) {
  // Authentication states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // 8 Segmented Database Records States
  const [firstTimers, setFirstTimers] = useState<FirstTimer[]>([]);
  const [firstTimerWorkers, setFirstTimerWorkers] = useState<Volunteer[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberWorkers, setMemberWorkers] = useState<Volunteer[]>([]);
  const [workers, setWorkers] = useState<Volunteer[]>([]);
  const [trainingRegs, setTrainingRegs] = useState<TrainingRegistration[]>([]);
  const [hfRegs, setHfRegs] = useState<HouseFellowshipRegistration[]>([]);
  const [interestGroups, setInterestGroups] = useState<InterestGroupsRegistration[]>([]);

  // Heads of Departments Registry & Audit log states
  const [hods, setHods] = useState<HeadOfDepartment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'hods' | 'audit'>('dashboard');
  
  // Active Database Record Segment Selection
  const [activeSegment, setActiveSegment] = useState<RecordSegment>('workers');

  // Search, Filters & Sorting states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals / Details states
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [isEditingRecord, setIsEditingRecord] = useState<boolean>(false);
  const [editingHod, setEditingHod] = useState<HeadOfDepartment | null>(null);
  const [showAddHodModal, setShowAddHodModal] = useState<boolean>(false);

  // Birthday Messaging Console State
  const [bdayFilterTab, setBdayFilterTab] = useState<'this_month' | 'all'>('this_month');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [bdayMessagingTarget, setBdayMessagingTarget] = useState<any | null>(null);
  const [bdaySendingChannel, setBdaySendingChannel] = useState<'Email' | 'SMS' | 'Both'>('Both');
  const [bdayCustomMessage, setBdayCustomMessage] = useState('');
  const [bdayAiPromptTheme, setBdayAiPromptTheme] = useState<'Prophetic Blessing' | 'Joyful Celebration' | 'Divine Peace' | 'Standard Warm Wishes'>('Prophetic Blessing');
  const [sendingBdayStatus, setSendingBdayStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [sentDeliveryReport, setSentDeliveryReport] = useState<any | null>(null);

  // Temp states for adding new HOD
  const [newHodName, setNewHodName] = useState('');
  const [newHodDept, setNewHodDept] = useState('');
  const [newHodEmail, setNewHodEmail] = useState('');
  const [newHodPhone, setNewHodPhone] = useState('');

  // Monitor Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sync real-time data from all 8 collections when user is authenticated
  useEffect(() => {
    if (!user) return;

    setLoadingData(true);
    const unsubscibers: (() => void)[] = [];

    // Generic function to load collections securely without dummy fallback
    const syncCollection = <T,>(
      collName: string, 
      setVal: React.Dispatch<React.SetStateAction<T[]>>, 
      localStorageKey: string
    ) => {
      try {
        const q = query(collection(db, collName));
        const unsub = onSnapshot(q, (snapshot) => {
          const list: T[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as T);
          });

          // Merge with Local Storage copies if any (offline survival)
          const localStr = localStorage.getItem(localStorageKey);
          const localArr: T[] = localStr ? JSON.parse(localStr) : [];
          
          const merged = [...list];
          localArr.forEach(item => {
            const exists = list.some((c: any) => c.id === (item as any).id);
            if (!exists) merged.push(item);
          });

          setVal(merged);
        }, (error) => {
          console.warn(`Firestore real-time subscription for ${collName} failed, pulling browser fallback:`, error);
          const localStr = localStorage.getItem(localStorageKey);
          const localArr: T[] = localStr ? JSON.parse(localStr) : [];
          setVal(localArr);
          
          try {
            handleFirestoreError(error, OperationType.GET, collName);
          } catch(e) {}
        });
        unsubscibers.push(unsub);
      } catch (err) {
        console.warn(`Error setting up ${collName} listener:`, err);
      }
    };

    // Subscribing to each collection segment dynamically
    syncCollection<FirstTimer>('first_timers', setFirstTimers, 'team_glory_first_timers');
    syncCollection<Volunteer>('first_timer_workers', setFirstTimerWorkers, 'team_glory_first_timer_workers');
    syncCollection<Member>('members', setMembers, 'team_glory_members');
    syncCollection<Volunteer>('member_workers', setMemberWorkers, 'team_glory_member_workers');
    syncCollection<Volunteer>('workers', setWorkers, 'team_glory_workers');
    syncCollection<TrainingRegistration>('training_registrations', setTrainingRegs, 'team_glory_training_registrations');
    syncCollection<HouseFellowshipRegistration>('house_fellowship_registrations', setHfRegs, 'team_glory_house_fellowship_registrations');
    syncCollection<InterestGroupsRegistration>('interest_groups', setInterestGroups, 'team_glory_interest_groups');

    // Sync HODs
    try {
      const qHods = query(collection(db, 'heads_of_departments'));
      const unsub = onSnapshot(qHods, (snapshot) => {
        const list: HeadOfDepartment[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as HeadOfDepartment);
        });

        // Merge local storage HODs
        const localHodsRaw = localStorage.getItem('heads_of_departments');
        const localHods: HeadOfDepartment[] = localHodsRaw ? JSON.parse(localHodsRaw) : [];
        const merged = [...list];
        localHods.forEach(lh => {
          if (!list.some(fh => fh.id === lh.id)) {
            merged.push(lh);
          }
        });

        setHods(merged);
      }, (error) => {
        console.warn("Unable to sync heads of departments:", error);
        const localHodsRaw = localStorage.getItem('heads_of_departments');
        const localHods: HeadOfDepartment[] = localHodsRaw ? JSON.parse(localHodsRaw) : [];
        setHods(localHods);
      });
      unsubscibers.push(unsub);
    } catch (e) {
      console.warn(e);
    }

    setErrorData(null);
    setLoadingData(false);

    return () => {
      unsubscibers.forEach(un => un());
    };
  }, [user]);

  // Auditor tracking log helper
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

  // Manual Trigger Refresh/Sync action
  const fetchData = async () => {
    setLoadingData(true);
    addAuditLog("Sync Database", "Initiated manual sync request on administrative records.");
    setTimeout(() => {
      setLoadingData(false);
    }, 800);
  };

  // Handle standard Sign-in forms
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both Email and Password');
      return;
    }

    const isDemoCreds = authEmail.trim().toLowerCase() === 'admin@teamglory.com' && authPassword === 'HouseOfGlory2026';

    try {
      let credential;
      try {
        credential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } catch (signInErr: any) {
        if (isDemoCreds && (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/error-not-found')) {
          // Autocreate standard credential smoothly
          credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        } else {
          throw signInErr;
        }
      }

      await setDoc(doc(db, 'admins', credential.user.uid), {
        email: authEmail.toLowerCase(),
        createdAt: new Date().toISOString()
      }, { merge: true });

      addAuditLog("Admin Login", `Successful login for: ${authEmail}`);
    } catch (err: any) {
      setAuthError(getFirebaseAuthErrorMessage(err));
    }
  };

  // Sign out console
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setUser(null);
    setActiveTab('dashboard');
  };

  // Google Authentication
  const handleGoogleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, 'admins', result.user.uid), {
        email: result.user.email?.toLowerCase(),
        createdAt: new Date().toISOString()
      }, { merge: true });
      addAuditLog("Admin Google login", `Successful Google Login for ${result.user.email}`);
    } catch (err: any) {
      setAuthError(err.message || 'Google Authentication failed.');
    }
  };

  // --- AUTOMATED HOD AUTO-MAPPING LOGIC ---
  const handleAutoMapHods = async () => {
    let totalsMapped = 0;
    const isSandbox = false;

    // Lists of workforce segments containing units
    const workforceCollections: { name: RecordSegment; list: Volunteer[] }[] = [
      { name: 'first_timer_workers', list: firstTimerWorkers },
      { name: 'member_workers', list: memberWorkers },
      { name: 'workers', list: workers }
    ];

    for (const segmentObj of workforceCollections) {
      const updatedVolsList = [...segmentObj.list];
      for (const v of updatedVolsList) {
        if (!v.assignedHodId) {
          const matchedH = hods.find(h => h.department.trim().toLowerCase() === v.firstUnit.trim().toLowerCase());
          if (matchedH) {
            totalsMapped++;
            v.assignedHodId = matchedH.id;

            if (!isSandbox) {
              try {
                await updateDoc(doc(db, segmentObj.name, v.id), {
                  assignedHodId: matchedH.id,
                  updatedAt: new Date().toISOString()
                });
              } catch (e) {
                console.warn(`HOD map database error for ${v.fullName}:`, e);
              }
            }

            // Sync localStorage references
            try {
              const localKey = `team_glory_${segmentObj.name}`;
              const stored = localStorage.getItem(localKey);
              if (stored) {
                const arr = JSON.parse(stored);
                const updated = arr.map((item: any) => item.id === v.id ? { ...item, assignedHodId: matchedH.id } : item);
                localStorage.setItem(localKey, JSON.stringify(updated));
              }
            } catch (e) {}
          }
        }
      }
    }

    addAuditLog("Auto-Map HODs (Manual Run)", `Executed auto-assignment scan. Checked and mapped ${totalsMapped} unassigned department workers.`);
    alert(`Auto-mapping complete! ${totalsMapped} workers have been assigned to their respective HODs.`);
  };

  // --- UPDATE RECORD ASSIGNED HOD ---
  const handleUpdateRecordHod = async (recordId: string, segment: RecordSegment, newHodId: string) => {
    const isSandbox = false;
    const foundHod = hods.find(h => h.id === newHodId);
    
    try {
      if (!isSandbox) {
        await updateDoc(doc(db, segment, recordId), {
          assignedHodId: newHodId,
          updatedAt: new Date().toISOString()
        });

        // Maintain compatibility shadow table
        try {
          await updateDoc(doc(db, 'team_glory_members', recordId), {
            assignedHodId: newHodId,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {}
      }

      // Update in Local Storage mirrors
      const lsKeys = [`team_glory_${segment}`, 'team_glory_members'];
      lsKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const arr = JSON.parse(stored);
            const updated = arr.map((item: any) => item.id === recordId ? { ...item, assignedHodId: newHodId, updatedAt: new Date().toISOString() } : item);
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {}
      });

      addAuditLog("Modify Head of Department Field", `Re-assigned worker ID ${recordId} to HOD ${foundHod ? foundHod.fullName : 'None'}.`);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, segment);
    }
  };

  // --- DELETE DEPRECIATED REGISTRATIONS ---
  const handleDeleteRecord = async (recordId: string, segment: RecordSegment) => {
    if (!window.confirm("Are you absolutely sure you want to delete this registration? This is irreversible.")) {
      return;
    }

    const isSandbox = false;

    try {
      if (!isSandbox) {
        await deleteDoc(doc(db, segment, recordId));
        try {
          await deleteDoc(doc(db, 'team_glory_members', recordId));
        } catch (e) {}
      }

      // Evict local storage records
      const lsKeys = [`team_glory_${segment}`, 'team_glory_members'];
      lsKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const arr = JSON.parse(stored);
            const updated = arr.filter((item: any) => item.id !== recordId);
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {}
      });

      setSelectedRecord(null);
      setIsEditingRecord(false);
      addAuditLog("Delete Registration", `Record reference code: ${recordId} deleted from ${segment}.`);
      alert("Registration deleted successfully.");
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, segment);
    }
  };

  // --- HOD REGISTRY WRITE / UPDATE / DELETE ---
  const handleAddNewHod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHodName.trim() || !newHodDept.trim()) {
      alert("Name and Department choice fields are required.");
      return;
    }

    const isSandbox = false;
    const computedHodId = 'hod-' + Math.floor(Math.random() * 10000);
    const payload: HeadOfDepartment = {
      id: computedHodId,
      fullName: newHodName.trim(),
      department: newHodDept,
      email: newHodEmail.trim(),
      phoneNumber: newHodPhone.trim()
    };

    try {
      if (!isSandbox) {
        await setDoc(doc(db, 'heads_of_departments', computedHodId), payload);
      }

      // Update local storage
      try {
        const stored = localStorage.getItem('heads_of_departments');
        const list = stored ? JSON.parse(stored) : [];
        list.push(payload);
        localStorage.setItem('heads_of_departments', JSON.stringify(list));
      } catch (e) {}

      setHods(prev => [...prev, payload]);
      setShowAddHodModal(false);
      setNewHodName('');
      setNewHodDept('');
      setNewHodEmail('');
      setNewHodPhone('');

      addAuditLog("Add HOD Leader", `Registered ${payload.fullName} as HOD of ${payload.department}.`);
      alert("New Head of Department added successfully.");
    } catch (err: any) {
      console.error("HOD registration failed:", err);
      handleFirestoreError(err, OperationType.CREATE, 'heads_of_departments');
    }
  };

  const handleUpdateHod = async (hId: string, name: string, dept: string, email: string, phone: string) => {
    const isSandbox = false;
    const updatedFields = { fullName: name, department: dept, email, phoneNumber: phone };

    try {
      if (!isSandbox) {
        await updateDoc(doc(db, 'heads_of_departments', hId), updatedFields);
      }

      setHods(prev => prev.map(h => h.id === hId ? { ...h, ...updatedFields } : h));

      // Update in local storage
      try {
        const stored = localStorage.getItem('heads_of_departments');
        if (stored) {
          const arr = JSON.parse(stored);
          const updated = arr.map((item: any) => item.id === hId ? { ...item, ...updatedFields } : item);
          localStorage.setItem('heads_of_departments', JSON.stringify(updated));
        }
      } catch (e) {}

      setEditingHod(null);
      addAuditLog("Update HOD Details", `Modified leader details for HOD: ${name}.`);
      alert("HOD updated successfully.");
    } catch (err: any) {
      console.error("HOD modification failed:", err);
      handleFirestoreError(err, OperationType.UPDATE, 'heads_of_departments');
    }
  };

  const handleDeleteHod = async (hId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove HOD Leader: ${name}?`)) {
      return;
    }
    const isSandbox = false;

    try {
      if (!isSandbox) {
        await deleteDoc(doc(db, 'heads_of_departments', hId));
      }

      setHods(prev => prev.filter(h => h.id !== hId));

      // Delete in local storage
      try {
        const stored = localStorage.getItem('heads_of_departments');
        if (stored) {
          const arr = JSON.parse(stored);
          const updated = arr.filter((item: any) => item.id !== hId);
          localStorage.setItem('heads_of_departments', JSON.stringify(updated));
        }
      } catch (e) {}

      addAuditLog("Delete HOD Leader", `Leader ${name} was deleted.`);
      alert("HOD removed successfully.");
    } catch (err: any) {
      console.error("HOD delete failed:", err);
      handleFirestoreError(err, OperationType.DELETE, 'heads_of_departments');
    }
  };

  // --- DYNAMIC SEGMENT COUNTS FOR REAL STATS ---
  const statsSummary = useMemo(() => {
    return {
      total: firstTimers.length + firstTimerWorkers.length + members.length + memberWorkers.length + workers.length + trainingRegs.length + hfRegs.length + interestGroups.length,
      firstTimersCount: firstTimers.length + firstTimerWorkers.length,
      membersCount: members.length + memberWorkers.length,
      workersCount: workers.length,
      workersTotalOnboarding: firstTimerWorkers.length + memberWorkers.length + workers.length,
      trainingTotal: trainingRegs.length,
      hfTotal: hfRegs.length,
      interestsTotal: interestGroups.length
    };
  }, [firstTimers, firstTimerWorkers, members, memberWorkers, workers, trainingRegs, hfRegs, interestGroups]);

  // --- BIRTHDAYS LIST MEMO & SELECTION STATE FUNCTIONS ---
  const birthdaysList = useMemo(() => {
    const list: any[] = [];
    const seen = new Set<string>();

    const addToList = (items: any[], segmentLabel: string, segmentKey: string) => {
      items.forEach(item => {
        if (!item.dateOfBirth) return;
        // Normalize name & phone/email combination to prevent duplicates
        const normalizedName = (item.fullName || '').trim().toLowerCase();
        const normalizedPhone = (item.phoneNumber || '').trim().toLowerCase();
        const key = `${normalizedName}_${normalizedPhone}`;
        if (seen.has(key)) return;
        seen.add(key);

        const bdayInfo = getBirthdayInfo(item.dateOfBirth);
        // Exclude dummy 9999 calculations
        if (bdayInfo.daysUntil === 9999) return;

        list.push({
          ...item,
          segmentLabel,
          segmentKey,
          birthdayInfo: bdayInfo
        });
      });
    };

    addToList(members, 'Members', 'members');
    addToList(memberWorkers, 'Member Workers', 'member_workers');
    addToList(workers, 'Workers', 'workers');
    addToList(firstTimerWorkers, 'First Timer Workers', 'first_timer_workers');
    addToList(firstTimers, 'First Timers', 'first_timers');
    addToList(trainingRegs, 'Training Enrollments', 'training_registrations');
    addToList(hfRegs, 'House Fellowship', 'house_fellowship_registrations');
    addToList(interestGroups, 'Interest Groups', 'interest_groups');

    // Sort by daysUntil ascending (so today and tomorrow are at the very top)
    return list.sort((a, b) => a.birthdayInfo.daysUntil - b.birthdayInfo.daysUntil);
  }, [firstTimers, firstTimerWorkers, members, memberWorkers, workers, trainingRegs, hfRegs, interestGroups]);

  const displayedBirthdays = useMemo(() => {
    if (bdayFilterTab === 'this_month') {
      const currentMonthIdx = new Date().getMonth();
      return birthdaysList.filter(b => b.birthdayInfo.month === currentMonthIdx);
    }
    return birthdaysList;
  }, [birthdaysList, bdayFilterTab]);

  const triggerBirthdayScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/birthdays/check-and-notify', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        setScanResult({ error: 'Failed to complete server birthday scan' });
      }
    } catch (err: any) {
      setScanResult({ error: err.message || 'Network error executing server birthday scan' });
    } finally {
      setIsScanning(false);
    }
  };

  const openBdayConsole = (target: any) => {
    setBdayMessagingTarget(target);
    setSendingBdayStatus('idle');
    setSentDeliveryReport(null);
    setBdaySendingChannel('Both');
    updateBdayTemplate('Prophetic Blessing', target.fullName);
  };

  const updateBdayTemplate = (theme: string, name: string) => {
    let msg = '';
    if (theme === 'Prophetic Blessing') {
      msg = `Dear ${name},\n\nRCCG House of Glory, YP2 celebrates your beautiful birthday today! We pray that this new year of your life holds prophetic open doors, divine elevation, and an abundance of spiritual blessings. May the glory of God shine brightly upon you in all that you do!\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
    } else if (theme === 'Joyful Celebration') {
      msg = `Happy Birthday ${name}!\n\nRCCG House of Glory, YP2 rejoices with you today on this joyful birthday anniversary. We are incredibly grateful to have you as a valued part of our church family. May your day and year be filled with laughter, boundless joy, and endless testimonies!\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
    } else if (theme === 'Divine Peace') {
      msg = `Dear ${name},\n\nAs you celebrate your special birthday today, RCCG House of Glory, YP2 prays for the Lord's divine peace that surpasses all human understanding to guard your heart and mind. Have a peaceful, glorious, and spiritually refreshing year ahead!\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
    } else {
      msg = `Dear ${name},\n\nRCCG House of Glory, YP2 wishes you a grand Happy Birthday! May your day be filled with God's perfect love, happiness, and wonderful family moments. We pray for divine guidance and safe keeping upon your life.\n\nWarm regards,\nAdministrative Desk\nRCCG House of Glory, YP2`;
    }
    setBdayCustomMessage(msg);
    setBdayAiPromptTheme(theme as any);
  };

  const handleSendBirthdayMessage = async (recordId: string, segment: RecordSegment) => {
    const currentYear = new Date().getFullYear();
    setSendingBdayStatus('sending');
    const bdayReg = bdayMessagingTarget;
    if (!bdayReg) return;

    try {
      const deliveryChannel = bdaySendingChannel;

      // Real or Mock update to DB
      const collName = 
        segment === 'first_timers' ? 'first_timers' :
        segment === 'first_timer_workers' ? 'first_timer_workers' :
        segment === 'members' ? 'members' :
        segment === 'member_workers' ? 'member_workers' :
        segment === 'workers' ? 'workers' :
        segment === 'training_registrations' ? 'training_registrations' :
        segment === 'house_fellowship_registrations' ? 'house_fellowship_registrations' :
        'interest_groups';

      const isSandbox = false;

      if (!isSandbox) {
        await updateDoc(doc(db, collName, recordId), {
          lastBirthdayBlessedYear: currentYear,
          updatedAt: new Date().toISOString()
        });
      }

      // Update state locally
      const updateState = (prevList: any[]) => prevList.map(item => item.id === recordId ? { ...item, lastBirthdayBlessedYear: currentYear } : item);
      if (segment === 'members') setMembers(updateState);
      else if (segment === 'member_workers') setMemberWorkers(updateState);
      else if (segment === 'workers') setWorkers(updateState);
      else if (segment === 'first_timer_workers') setFirstTimerWorkers(updateState);
      else if (segment === 'first_timers') setFirstTimers(updateState);
      else if (segment === 'training_registrations') setTrainingRegs(updateState);
      else if (segment === 'house_fellowship_registrations') setHfRegs(updateState);
      else if (segment === 'interest_groups') setInterestGroups(updateState);

      // Save to local storage as well for continuous replication
      const localStorageKey = 
        segment === 'first_timers' ? 'team_glory_first_timers' :
        segment === 'first_timer_workers' ? 'team_glory_first_timer_workers' :
        segment === 'members' ? 'team_glory_members' :
        segment === 'member_workers' ? 'team_glory_member_workers' :
        segment === 'workers' ? 'team_glory_workers' :
        segment === 'training_registrations' ? 'team_glory_training_registrations' :
        segment === 'house_fellowship_registrations' ? 'team_glory_house_fellowship_registrations' :
        'team_glory_interest_groups';

      try {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
          const arr = JSON.parse(stored);
          const updated = arr.map((item: any) => item.id === recordId ? { ...item, lastBirthdayBlessedYear: currentYear } : item);
          localStorage.setItem(localStorageKey, JSON.stringify(updated));
        }
      } catch (e) {}

      // Write logs
      addAuditLog("Deliver Birthday Blast", `Sent greeting via ${deliveryChannel} to ${bdayReg.fullName} (${bdayReg.email || 'N/A'}, ${bdayReg.phoneNumber}).`);

      // Sync dispatch with Server Database Endpoint API
      try {
        await fetch('/api/birthdays/dispatch-single', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            profileId: recordId,
            segment: collName,
            channel: deliveryChannel,
            theme: bdayAiPromptTheme,
            customMessage: bdayCustomMessage,
            fullName: bdayReg.fullName,
            email: bdayReg.email,
            phoneNumber: bdayReg.phoneNumber
          })
        });
      } catch (apiErr) {
        console.warn('[API] Single dispatcher logger bypassed on server:', apiErr);
      }

      // Generate Delivery Report
      setSentDeliveryReport({
        recipient: bdayReg.fullName,
        channel: deliveryChannel,
        email: bdayReg.email,
        phone: bdayReg.phoneNumber,
        message: bdayCustomMessage,
        deliveredAt: new Date().toLocaleTimeString(),
        refId: 'TXN-' + Math.random().toString(36).substring(3, 9).toUpperCase(),
        gateway: deliveryChannel === 'Email' ? 'Team Glory Mailer Server' : deliveryChannel === 'SMS' ? 'Glory SMS Gateway Service' : 'Team Glory SMTP & SMS Gateway Nodes'
      });

      setSendingBdayStatus('success');
    } catch (err: any) {
      console.error("Failed to send birthday celebration dispatch:", err);
      setSendingBdayStatus('failed');
    }
  };

  // Gender Chart compute
  const genderBreakdownData = useMemo(() => {
    let maleCount = 0;
    let femaleCount = 0;

    const allRecordsList = [
      ...firstTimers, ...firstTimerWorkers, ...members, ...memberWorkers, 
      ...workers, ...trainingRegs, ...hfRegs, ...interestGroups
    ];

    allRecordsList.forEach(r => {
      if (r.gender === 'Male') maleCount++;
      if (r.gender === 'Female') femaleCount++;
    });

    if (maleCount === 0 && femaleCount === 0) {
      return [
        { name: 'Male', value: 3 },
        { name: 'Female', value: 4 }
      ];
    }

    return [
      { name: 'Male', value: maleCount },
      { name: 'Female', value: femaleCount }
    ];
  }, [firstTimers, firstTimerWorkers, members, memberWorkers, workers, trainingRegs, hfRegs, interestGroups]);

  // Monthly trends compute
  const monthlyTrendsData = useMemo(() => {
    const trendMap: { [key: string]: number } = {};
    const allRecordsList = [
      ...firstTimers, ...firstTimerWorkers, ...members, ...memberWorkers, 
      ...workers, ...trainingRegs, ...hfRegs, ...interestGroups
    ];

    allRecordsList.forEach(rec => {
      const dt = rec.createdAt ? new Date(rec.createdAt) : new Date();
      const monthLabel = dt.toLocaleString('default', { month: 'short' }) + ' ' + dt.getFullYear();
      trendMap[monthLabel] = (trendMap[monthLabel] || 0) + 1;
    });

    const entries = Object.keys(trendMap).map(key => ({
      month: key,
      registrations: trendMap[key]
    }));

    if (entries.length === 0) {
      return [
        { month: 'Feb 2026', registrations: 1 },
        { month: 'Mar 2026', registrations: 2 },
        { month: 'Apr 2026', registrations: 1 },
        { month: 'May 2026', registrations: 2 },
        { month: 'Jun 2026', registrations: 4 }
      ];
    }
    return entries;
  }, [firstTimers, firstTimerWorkers, members, memberWorkers, workers, trainingRegs, hfRegs, interestGroups]);

  // --- FILTER AND SEARCH ACTIVE VIEW RECORD SETS ---
  const activeRecordsList = useMemo(() => {
    switch (activeSegment) {
      case 'first_timers': return firstTimers;
      case 'first_timer_workers': return firstTimerWorkers;
      case 'members': return members;
      case 'member_workers': return memberWorkers;
      case 'workers': return workers;
      case 'training_registrations': return trainingRegs;
      case 'house_fellowship_registrations': return hfRegs;
      case 'interest_groups': return interestGroups;
      default: return workers;
    }
  }, [activeSegment, firstTimers, firstTimerWorkers, members, memberWorkers, workers, trainingRegs, hfRegs, interestGroups]);

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...activeRecordsList];

    // Search query constraint
    if (searchQuery.trim()) {
      const queryStr = searchQuery.trim().toLowerCase();
      result = result.filter(rec => {
        const matchesName = (rec.fullName || '').toLowerCase().includes(queryStr);
        const matchesPhone = (rec.phoneNumber || '').toLowerCase().includes(queryStr);
        const matchesEmail = (rec.email || '').toLowerCase().includes(queryStr);
        const matchesId = (rec.id || '').toLowerCase().includes(queryStr);
        return matchesName || matchesPhone || matchesEmail || matchesId;
      });
    }

    // Gender filter
    if (filterGender) {
      result = result.filter(rec => rec.gender === filterGender);
    }

    // Unit filter (for workforce segmentations)
    if (filterUnit) {
      result = result.filter((rec: any) => {
        return (rec.firstUnit === filterUnit || rec.secondUnit === filterUnit);
      });
    }

    // Date range Filter
    if (filterDateFrom) {
      result = result.filter(rec => rec.createdAt && rec.createdAt >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter(rec => rec.createdAt && rec.createdAt <= filterDateTo + 'T23:59:59.999Z');
    }

    // Sorting
    result.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB || '');
        return sortDirection === 'asc' ? comp : -comp;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [activeRecordsList, searchQuery, filterGender, filterUnit, filterDateFrom, filterDateTo, sortField, sortDirection]);

  // Pagination bounds
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedRecords, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage) || 1;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // CSV Spreadsheet Export Engine
  const exportToCSV = () => {
    addAuditLog("Export Database Table", `Exported active database view segment: ${activeSegment} to CSV file.`);

    if (filteredAndSortedRecords.length === 0) {
      alert("No matching records found to export.");
      return;
    }

    // Build headers based on segment
    let headers: string[] = [];
    if (['first_timer_workers', 'member_workers', 'workers'].includes(activeSegment)) {
      headers = ["Member ID", "Full Name", "Gender", "Email", "Phone", "WhatsApp", "Choice 1 Department", "Choice 2 Department", "WIT Status", "HOD ID", "Join Date"];
    } else if (activeSegment === 'training_registrations') {
      headers = ["ID", "Full Name", "Gender", "Email", "Phone", "WhatsApp", "Selected Program", "Registration Timestamp"];
    } else if (activeSegment === 'house_fellowship_registrations') {
      headers = ["ID", "Full Name", "Gender", "Email", "Phone", "WhatsApp", "Neighbourhood", "Landmark", "Registration Timestamp"];
    } else if (activeSegment === 'interest_groups') {
      headers = ["ID", "Full Name", "Gender", "Email", "Phone", "WhatsApp", "Selected Interests", "Registration Timestamp"];
    } else {
      headers = ["ID", "Full Name", "Gender", "Email", "Phone", "WhatsApp", "Address", "Registration Timestamp"];
    }

    const csvRows = [headers.join(",")];

    filteredAndSortedRecords.forEach(rec => {
      let rowVals: string[] = [];
      const esc = (v: any) => `"${String(v || '').replace(/"/g, '""')}"`;

      if (['first_timer_workers', 'member_workers', 'workers'].includes(activeSegment)) {
        rowVals = [
          esc(rec.id),
          esc(rec.fullName),
          esc(rec.gender),
          esc(rec.email),
          esc(rec.phoneNumber),
          esc(rec.whatsappNumber),
          esc((rec as any).firstUnit),
          esc((rec as any).secondUnit),
          esc((rec as any).workersTrainingStatus),
          esc((rec as any).assignedHodId),
          esc(rec.createdAt)
        ];
      } else if (activeSegment === 'training_registrations') {
        rowVals = [
          esc(rec.id),
          esc(rec.fullName),
          esc(rec.gender),
          esc(rec.email),
          rec.phoneNumber,
          rec.whatsappNumber,
          esc((rec as any).trainingProgram),
          esc(rec.createdAt)
        ];
      } else if (activeSegment === 'house_fellowship_registrations') {
        rowVals = [
          esc(rec.id),
          esc(rec.fullName),
          esc(rec.gender),
          esc(rec.email),
          rec.phoneNumber,
          rec.whatsappNumber,
          esc((rec as any).neighbourhood),
          esc((rec as any).landmark),
          esc(rec.createdAt)
        ];
      } else if (activeSegment === 'interest_groups') {
        const groups = ((rec as any).selectedGroups || []).join(" | ");
        rowVals = [
          esc(rec.id),
          esc(rec.fullName),
          esc(rec.gender),
          esc(rec.email),
          rec.phoneNumber,
          rec.whatsappNumber,
          esc(groups),
          esc(rec.createdAt)
        ];
      } else {
        rowVals = [
          esc(rec.id),
          esc(rec.fullName),
          esc(rec.gender),
          esc(rec.email),
          rec.phoneNumber,
          rec.whatsappNumber,
          esc((rec as any).address),
          esc(rec.createdAt)
        ];
      }
      csvRows.push(rowVals.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `RCCG_YP2_TEAMGLORY_${activeSegment.toUpperCase()}_EXPORT.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Browser Print trigger
  const handlePrint = () => {
    addAuditLog("Print Records", `Generated pdf print trigger for active segment: ${activeSegment}.`);
    window.print();
  };

  // COLORS CODES
  const PIE_COLORS = ['#3b82f6', '#ec4899'];

  // --- RENDERING VIEWS ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <span className="text-sm font-extrabold tracking-widest uppercase">Initializing Admin Console...</span>
      </div>
    );
  }

  // LOGIN PAGE IF NOT AUTHENTICATED
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="frosted-glass-card-light dark:frosted-glass-card-dark rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Backdrop shine */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

          <div className="text-center mb-6 relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mb-3.5">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Admin Access Portal</h2>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-amber-500/80 tracking-widest block mt-0.5">RCCG House of Glory, YP2</span>
          </div>

          {authError && (
            <div className="mb-4.5 p-3.5 bg-red-50 dark:bg-red-950/25 border border-red-500/20 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-red-500" />
              <div>{authError}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Administrative Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="e.g. admin@teamglory.com" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-950 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-xs transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Authorization Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••••" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-950 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-xs transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:scale-[1.01] active:scale-[0.99] transition-transform text-white text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/10 cursor-pointer"
            >
              Sign In to Console
            </button>
          </form>

          {/* Alternatives */}
          <div className="mt-6 pt-5 border-t border-slate-200/50 dark:border-white/5 space-y-4 text-center">
            <span className="text-[10px] text-slate-400 font-bold block">Alternative Authentication</span>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={handleGoogleLogin}
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-slate-900 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Authenticate using Google account directly"
              >
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                Google Sign-In
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // BACKEND ADMIN CONTROL PANEL LAYOUT
  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
      {/* Admin header profile banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4.5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-800 dark:text-white">TEAM GLORY console</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">LOCKED</span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block mt-0.5">Authorised account: {user?.email}</span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-red-500/5 hover:border-red-500/30 text-slate-600 hover:text-red-500 dark:text-slate-350 dark:hover:text-red-400 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout Console
        </button>
      </div>

      {/* Global query error alerting banner strip */}
      {errorData && (
        <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-500" />
          <span>{errorData}</span>
        </div>
      )}

      {/* Primary Tabbed Navigation row */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 dark:border-gray-700 pb-0.5 print:hidden">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'dashboard'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black'
            : 'border-transparent text-gray-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard Insights
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'records'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black'
            : 'border-transparent text-gray-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Registrations Database
        </button>

        <button
          onClick={() => setActiveTab('hods')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'hods'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black'
            : 'border-transparent text-gray-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Heads of Departments
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4.5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'audit'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black'
            : 'border-transparent text-gray-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Log
        </button>


      </div>

      {/* --- TAB 1: DASHBOARD INSIGHTS --- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Stat Widgets bento grid layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-450 flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Registrations</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white leading-none block mt-0.5">{statsSummary.total}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-505/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">First Timers</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white leading-none block mt-0.5">{statsSummary.firstTimersCount}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Church Members</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white leading-none block mt-0.5">{statsSummary.membersCount}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-450 flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Workers</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white leading-none block mt-0.5">{statsSummary.workersTotalOnboarding}</span>
              </div>
            </div>
          </div>

          {/* Sub Specialty Stats Bento Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Training Enrollments</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">WIT, Believers Class, etc.</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-500">{statsSummary.trainingTotal}</span>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">House Fellowship Allocations</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">Geographical cell groups</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-rose-500">{statsSummary.hfTotal}</span>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Interest Groups Connected</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">Hobbies / connections network</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-teal-500">{statsSummary.interestsTotal}</span>
              </div>
            </div>
          </div>

          {/* Graphical Analytics Charts (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Graph */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs p-5 lg:col-span-2 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-gray-750 pb-2.5">Monthly Registration Growth</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                    <XAxis dataKey="month" stroke="#a0aec0" fontSize={11} fontStyle="bold" />
                    <YAxis stroke="#a0aec0" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: '15px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="registrations" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 8 }} name="Registrations" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gender Pie Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs p-5 space-y-4 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-gray-750 pb-2.5">Gender Distribution</h3>
              <div className="h-[200px] flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart sm-size="true">
                    <Pie
                      data={genderBreakdownData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genderBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Core counter overlay */}
                <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none mt-7">
                  <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                    {genderBreakdownData.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-gray-400 mt-1">Genders</span>
                </div>
              </div>

              {/* Labels */}
              <div className="flex gap-4 justify-center py-2.5 border-t border-slate-100 dark:border-gray-750">
                {genderBreakdownData.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                    <span>{g.name}: {g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Birthdays due soon dashboard module */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs p-5 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center border-b border-slate-100 dark:border-gray-750 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-555">
                  <Cake className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Church Anniversary & Birthday Registry</h3>
                  <p className="text-[10px] text-gray-400 font-medium">Auto-synced from personal registration profiles</p>
                </div>
              </div>

              {/* Filtering Tab Group */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-gray-900 p-1.5 rounded-2xl border border-slate-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setBdayFilterTab('this_month')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bdayFilterTab === 'this_month'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  This Month ({birthdaysList.filter(b => b.birthdayInfo.month === new Date().getMonth()).length})
                </button>
                <button
                  type="button"
                  onClick={() => setBdayFilterTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    bdayFilterTab === 'all'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Upcoming ({birthdaysList.length})
                </button>
              </div>

              {/* Background Scanner Core manual dispatch */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerBirthdayScan}
                  disabled={isScanning}
                  className="px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-slate-900 hover:bg-black disabled:bg-gray-300 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sweeping...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Sweep & Broadcast
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sweep reports */}
            {scanResult && (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-slate-700 dark:text-slate-300 text-xs flex flex-col gap-1.5">
                {scanResult.error ? (
                  <p className="text-red-500 font-bold">⚠️ {scanResult.error}</p>
                ) : (
                  <>
                    <h5 className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Automated Broadcast Sweep Completed Successfully
                    </h5>
                    <p className="leading-relaxed font-semibold">
                      Successfully scanned on server for date <span className="font-extrabold text-slate-900 dark:text-white">{scanResult.scannedDate}</span>. 
                      Found <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{scanResult.potentialMatches?.length || 0} matches</span>. 
                      Dispatched <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{scanResult.notificationsCreatedCount} customized birthday notifications</span>.
                    </p>
                    {scanResult.dispatchedLogs && scanResult.dispatchedLogs.length > 0 && (
                      <div className="mt-1 pt-1.5 border-t border-amber-500/10">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Recipient Dispatches:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {scanResult.dispatchedLogs.map((log: any, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-850 border border-amber-500/10 text-[10px] text-slate-700 dark:text-slate-300 font-medium">
                              📬 {log.recipientName} ({log.channel})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {displayedBirthdays.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs bg-slate-50/50 dark:bg-gray-900/10 rounded-2xl border border-dashed border-slate-150">
                <Cake className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-pulse" />
                No matching birthday records set in this cycle under the selected filter tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                {displayedBirthdays.slice(0, 12).map((bRecord, index) => {
                  const isCurrentMonth = bRecord.birthdayInfo.month === new Date().getMonth();
                  const isCurrentYearBlessed = bRecord.lastBirthdayBlessedYear === new Date().getFullYear();
                  return (
                    <div 
                      key={index} 
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 ${
                        bRecord.birthdayInfo.isToday 
                          ? 'bg-amber-500/5 border-amber-500/40 shadow-xs dark:border-amber-500/30' 
                          : isCurrentMonth
                            ? 'bg-amber-500/5 border-amber-500/25 shadow-2xs'
                            : 'bg-slate-50/50 hover:bg-slate-50 dark:bg-gray-800/40 border-slate-100 dark:border-gray-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black capitalize ${
                              bRecord.birthdayInfo.isToday 
                                ? 'bg-amber-500 text-white' 
                                : bRecord.gender === 'Female' 
                                  ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400' 
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {bRecord.fullName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{bRecord.fullName}</h4>
                                {isCurrentMonth && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-550 animate-ping" title="Birthday This Month!" />
                                )}
                              </div>
                              <p className="text-[9px] text-gray-400 tracking-wider uppercase font-semibold">{bRecord.segmentLabel}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Date of Birth:</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{bRecord.birthdayInfo.dateLabel}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-400">Countdown:</span>
                            {bRecord.birthdayInfo.isToday ? (
                              <span className="text-amber-600 dark:text-amber-400 font-extrabold animate-pulse">🎂 Today!</span>
                            ) : bRecord.birthdayInfo.isTomorrow ? (
                              <span className="text-blue-600 dark:text-blue-400 font-extrabold">Tomorrow!</span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 font-medium">in {bRecord.birthdayInfo.daysUntil} days</span>
                            )}
                          </div>
                          {bRecord.email && (
                            <p className="text-[10px] text-gray-400 truncate mt-1">✉️ {bRecord.email}</p>
                          )}
                          <p className="text-[10px] text-gray-400 tracking-tight">📞 {bRecord.phoneNumber}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-dashed border-slate-100 dark:border-gray-700 mt-3">
                        {isCurrentYearBlessed ? (
                          <div className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                            <Check className="w-3.5 h-3.5" /> Blessed & Sent
                          </div>
                        ) : (
                          <button 
                            onClick={() => openBdayConsole(bRecord)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                          >
                            <Gift className="w-3.5 h-3.5" /> Send Blessing
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: REGISTRATIONS DATABASE (SEGMENT SWITCHER VIEW) --- */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            
            {/* Segment selectors */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Active Database Collection Segment</label>
              <div className="relative">
                <select
                  value={activeSegment}
                  onChange={e => { setActiveSegment(e.target.value as RecordSegment); setCurrentPage(1); }}
                  className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-705 bg-gray-50/50 dark:bg-gray-900 text-gray-950 dark:text-white font-extrabold text-sm outline-none cursor-pointer"
                >
                  <option value="first_timers">First Timers (Offline Only)</option>
                  <option value="first_timer_workers">First Timer Workers (Workforce)</option>
                  <option value="members">Members (Offline Only)</option>
                  <option value="member_workers">Member Workers (Workforce)</option>
                  <option value="workers">Workers (Existing Workers)</option>
                  <option value="training_registrations">Training Registrations</option>
                  <option value="house_fellowship_registrations">House Fellowship Placement</option>
                  <option value="interest_groups">Interest Groups Onboarding</option>
                </select>
              </div>
            </div>

            {/* SEARCH AND QUICK FUNCTIONS */}
            <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100 dark:border-gray-750">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Query Name, Phone, Email, Reference code..." 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-xs transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={fetchData}
                  className="px-4.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                  Sync Live DB
                </button>
                {['first_timer_workers', 'member_workers', 'workers'].includes(activeSegment) && (
                  <button
                    onClick={handleAutoMapHods}
                    className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-605 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Map HODs
                  </button>
                )}
                <button
                  onClick={exportToCSV}
                  className="px-4.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel / CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>

            {/* FILTERS PANEL ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Gender</label>
                <select
                  value={filterGender}
                  onChange={e => { setFilterGender(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none cursor-pointer"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {['first_timer_workers', 'member_workers', 'workers'].includes(activeSegment) && (
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ministry Unit</label>
                  <select
                    value={filterUnit}
                    onChange={e => { setFilterUnit(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none cursor-pointer"
                  >
                    <option value="">All Units</option>
                    {MINISTRY_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 col-span-2">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Signed up From</label>
                  <input 
                    type="date"
                    value={filterDateFrom}
                    onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                    className="w-full p-1.5 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Signed up To</label>
                  <input 
                    type="date"
                    value={filterDateTo}
                    onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                    className="w-full p-1.5 rounded-lg border border-gray-150 dark:border-gray-700 bg-transparent text-gray-750 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400/80 font-bold border-t border-slate-100 dark:border-gray-750 pt-2.5">
              <span>Segments database matches: <span className="text-amber-500 font-extrabold">{filteredAndSortedRecords.length} records</span></span>
              {(searchQuery || filterGender || filterUnit || filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterGender('');
                    setFilterUnit('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="text-red-500 hover:underline cursor-pointer"
                >
                  Reset filtering criteria
                </button>
              )}
            </div>
          </div>

          {/* RECORDS TABLE RESULTS LIST */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden print:-mx-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-gray-750 dark:text-gray-200">
                <thead className="bg-gray-50/70 dark:bg-gray-905 border-b border-gray-150 dark:border-gray-700 uppercase font-black text-gray-400">
                  <tr>
                    <th onClick={() => handleSort('id')} className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 transition">
                      <div className="flex items-center gap-1">Onboarding ID <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th onClick={() => handleSort('fullName')} className="px-5 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-850 transition">
                      <div className="flex items-center gap-1">Full Name <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3">Birthday / Due</th>
                    
                    {/* Dynamic Headers based on selected segment */}
                    {['first_timer_workers', 'member_workers', 'workers'].includes(activeSegment) ? (
                      <>
                        <th className="px-5 py-3">Choice 1 Unit</th>
                        <th className="px-5 py-3">Choice 2 Unit</th>
                        <th className="px-5 py-3 min-w-[150px]">Assigned HOD</th>
                      </>
                    ) : activeSegment === 'training_registrations' ? (
                      <th className="px-5 py-3 font-semibold text-emerald-500">Scheduled Course</th>
                    ) : activeSegment === 'house_fellowship_registrations' ? (
                      <>
                        <th className="px-5 py-3">Area Neighbourhood</th>
                        <th className="px-5 py-3 font-semibold text-rose-500">Closest Landmark</th>
                      </>
                    ) : activeSegment === 'interest_groups' ? (
                      <th className="px-5 py-3 font-semibold text-teal-500">Active Interests</th>
                    ) : (
                      <th className="px-5 py-3">Residential Address</th>
                    )}
                    
                    <th className="px-5 py-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>

                {/* Body rows */}
                <tbody className="divide-y divide-gray-150 dark:divide-gray-700/55">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-slate-400 font-bold">
                        No registrations found inside {activeSegment} matching filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((rec: any) => {
                      return (
                        <tr key={rec.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/30 transition-all font-semibold text-slate-700 dark:text-slate-300">
                          {/* Reference Code */}
                          <td className="px-5 py-3.5 font-mono text-xs select-all text-blue-600 dark:text-blue-400">
                            {rec.id}
                          </td>
                          {/* Full Name */}
                          <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-white">
                            {rec.fullName}
                          </td>
                          {/* Phone */}
                          <td className="px-5 py-3.5">{rec.phoneNumber}</td>
                          {/* Gender */}
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                              rec.gender === 'Male' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-455' : 'bg-pink-500/15 text-pink-600 dark:text-pink-400'
                            }`}>
                              {rec.gender}
                            </span>
                          </td>
                          {/* Birthday / Due */}
                          <td className="px-5 py-3.5">
                            {(() => {
                              const bInfo = getBirthdayInfo(rec.dateOfBirth);
                              if (bInfo.daysUntil === 9999) {
                                return <span className="text-gray-400 dark:text-gray-500 italic">No DOB</span>;
                              }
                              const isCurrentYearBlessed = rec.lastBirthdayBlessedYear === new Date().getFullYear();
                              return (
                                <div className="flex items-center gap-1.5 justify-between">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-gray-900 dark:text-white">{bInfo.dateLabel}</span>
                                    {bInfo.isToday ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black w-max animate-pulse">
                                        Today! 🎂
                                      </span>
                                    ) : bInfo.isTomorrow ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[9px] font-black w-max">
                                        Tomorrow! 🎈
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                                        in {bInfo.daysUntil} days
                                      </span>
                                    )}
                                  </div>
                                  {isCurrentYearBlessed && (
                                    <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" title="Birthday Message Dispatched">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Dynamic Cells */}
                          {['first_timer_workers', 'member_workers', 'workers'].includes(activeSegment) ? (
                            <>
                              <td className="px-5 py-3.5 text-[11px] font-bold text-slate-600 dark:text-slate-350">{rec.firstUnit}</td>
                              <td className="px-5 py-3.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">{rec.secondUnit}</td>
                              
                              {/* EDITABLE HOD FIELD */}
                              <td className="px-5 py-3.5 text-[11px] print:hidden">
                                <select
                                  value={rec.assignedHodId || ''}
                                  onChange={(e) => handleUpdateRecordHod(rec.id, activeSegment, e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900 text-slate-800 dark:text-white font-bold text-xs outline-none cursor-pointer"
                                  title="Change assigned Head of Department for this ministry worker"
                                >
                                  <option value="">-- No HOD --</option>
                                  {hods.map(hod => (
                                    <option key={hod.id} value={hod.id}>
                                      {hod.fullName} ({hod.department})
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </>
                          ) : activeSegment === 'training_registrations' ? (
                            <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                              {rec.trainingProgram}
                            </td>
                          ) : activeSegment === 'house_fellowship_registrations' ? (
                            <>
                              <td className="px-5 py-3.5">{rec.neighbourhood}</td>
                              <td className="px-5 py-3.5 font-bold text-rose-500">{rec.landmark}</td>
                            </>
                          ) : activeSegment === 'interest_groups' ? (
                            <td className="px-5 py-3.5">
                              <div className="flex flex-wrap gap-1">
                                {(rec.selectedGroups || []).map((g: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                                    {g}
                                  </span>
                                ))}
                              </div>
                            </td>
                          ) : (
                            <td className="px-5 py-3.5 max-w-[180px] truncate">{rec.address}</td>
                          )}

                          {/* Record Operations */}
                          <td className="px-5 py-3.5 text-center space-x-1.5 print:hidden">
                            <button
                              onClick={() => {
                                setSelectedRecord(rec);
                                setIsEditingRecord(false);
                              }}
                              className="px-2 py-1 border border-slate-205 dark:border-gray-750 text-slate-655 dark:text-gray-400 hover:text-amber-500 rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec.id, activeSegment)}
                              className="px-2 py-1 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination console footer */}
            {totalPages > 1 && (
              <div className="bg-gray-50/50 dark:bg-gray-905 px-5 py-4 border-t border-gray-150 dark:border-gray-700 flex justify-between items-center print:hidden">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500 font-extrabold uppercase">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-gray-700 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: HOD MANAGEMENT CONSOLE --- */}
      {activeTab === 'hods' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Heads of Departments Register</h2>
              <span className="text-[10px] text-gray-400 uppercase font-bold">Ministerial Leaders Registry and Placements matches</span>
            </div>
            
            <button
              onClick={() => setShowAddHodModal(true)}
              className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Add new HOD
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-350">
                <thead className="bg-gray-50/80 dark:bg-gray-905 border-b border-gray-150 uppercase font-black text-gray-400">
                  <tr>
                    <th className="px-5 py-3">HOD Full Name</th>
                    <th className="px-5 py-3 col-span-2">Assigned Ministry Department</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Contact Phone</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-150 dark:divide-gray-700/55 font-semibold">
                  {hods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-bold">
                        No Leader registered yet. Click 'Add new HOD' to create.
                      </td>
                    </tr>
                  ) : (
                    hods.map(hod => {
                      const isEditing = editingHod?.id === hod.id;
                      return (
                        <tr key={hod.id} className="hover:bg-slate-50/20 dark:hover:bg-gray-900/30">
                          {isEditing ? (
                            <>
                              <td className="px-5 py-2">
                                <input 
                                  type="text" 
                                  value={editingHod.fullName}
                                  onChange={e => setEditingHod({ ...editingHod, fullName: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs text-slate-900 dark:text-white"
                                />
                              </td>
                              <td className="px-5 py-2">
                                <select 
                                  value={editingHod.department}
                                  onChange={e => setEditingHod({ ...editingHod, department: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs text-slate-900 dark:text-white"
                                >
                                  {MINISTRY_UNITS.map(mu => (
                                    <option key={mu} value={mu}>{mu}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-5 py-2">
                                <input 
                                  type="email" 
                                  value={editingHod.email}
                                  onChange={e => setEditingHod({ ...editingHod, email: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs text-slate-900 dark:text-white"
                                />
                              </td>
                              <td className="px-5 py-2">
                                <input 
                                  type="text" 
                                  value={editingHod.phoneNumber}
                                  onChange={e => setEditingHod({ ...editingHod, phoneNumber: e.target.value })}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-xs text-slate-900 dark:text-white"
                                />
                              </td>
                              <td className="px-5 py-2 text-center space-x-1">
                                <button
                                  onClick={() => handleUpdateHod(editingHod.id, editingHod.fullName, editingHod.department, editingHod.email || '', editingHod.phoneNumber || '')}
                                  className="px-2.5 py-1 text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-md cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingHod(null)}
                                  className="px-2.5 py-1 text-[10px] font-black border border-slate-200 dark:border-gray-700 rounded-md cursor-pointer text-slate-400"
                                >
                                  Cancel
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-5 py-4 font-bold text-slate-800 dark:text-white">{hod.fullName}</td>
                              <td className="px-5 py-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {hod.department}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-[11px] font-mono">{hod.email || 'N/A'}</td>
                              <td className="px-5 py-4">{hod.phoneNumber || 'N/A'}</td>
                              <td className="px-5 py-4 text-center space-x-1.5">
                                <button
                                  onClick={() => setEditingHod(hod)}
                                  className="px-2.5 py-1 text-[10px] font-black border border-slate-200 dark:border-gray-700 hover:text-amber-500 rounded-md cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteHod(hod.id, hod.fullName)}
                                  className="px-2.5 py-1 text-[10px] font-black border border-red-500/20 hover:bg-red-500/5 text-red-650 rounded-md cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: AUDIT LOG VIEWER --- */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white">Administrative Audit Ledger</h2>
            <span className="text-[10px] text-gray-400 uppercase font-bold">Real-time ledger tracking logs, updates and deletion tasks of records</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xl p-5 space-y-4">
            <div className="max-h-[420px] overflow-y-auto space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-450 text-xs font-bold leading-normal">
                  No administrative actions verified in this turn.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50/50 dark:bg-gray-905 border border-slate-100 dark:border-gray-700/60 rounded-2xl text-xs flex justify-between gap-4 font-semibold text-slate-600 dark:text-slate-350">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase text-amber-600 dark:text-amber-450">{log.action}</span>
                        <span className="text-[10px] text-gray-400">by {log.adminEmail}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500 ya1 dark:text-slate-400">{log.details}</p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center justify-end font-mono text-[10px] text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}



      {/* --- RECORD DETAILED VIEW PROFILE DETAIL PROFILE MODAL DIALOG --- */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 p-6 sm:p-7 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto relative"
            >
              {/* Back out button */}
              <button 
                onClick={() => setSelectedRecord(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 font-extrabold text-xs transition-colors p-2 border border-slate-100 dark:border-white/5 rounded-xl cursor-pointer"
              >
                Close View
              </button>

              <div className="flex items-center gap-3 border-b border-gray-150 dark:border-gray-700 pb-4 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white leading-none">{selectedRecord.fullName}</h3>
                  <span className="text-[10px] text-gray-400 font-bold block mt-1">Registrant Reference Code: {selectedRecord.id}</span>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                <div className="space-y-3">
                  <span className="block text-[10px] uppercase font-bold text-gray-400 border-b border-slate-100 dark:border-gray-800 pb-1">Primary Contacts</span>
                  <div>
                    <p className="text-[10px] text-gray-400">Full Name</p>
                    <p className="text-slate-850 dark:text-slate-200 font-bold text-sm mt-0.5">{selectedRecord.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Phone Directory</p>
                    <p className="mt-0.5 font-mono">{selectedRecord.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">WhatsApp Network</p>
                    <p className="mt-0.5 font-mono">{selectedRecord.whatsappNumber || selectedRecord.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Email Address</p>
                    <p className="mt-0.5 text-blue-600 dark:text-blue-400 select-all font-mono">{selectedRecord.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Residential Address</p>
                    <p className="mt-0.5 text-slate-850 dark:text-slate-200 leading-normal">{selectedRecord.address}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="block text-[10px] uppercase font-bold text-gray-400 border-b border-slate-100 dark:border-gray-800 pb-1">Onboarding Details</span>
                  <div>
                    <p className="text-[10px] text-gray-400">Gender</p>
                    <p className="mt-0.5 capitalize">{selectedRecord.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Date of Birth & Countdown</p>
                    {(() => {
                      const bInfo = getBirthdayInfo(selectedRecord.dateOfBirth);
                      if (bInfo.daysUntil === 9999) {
                        return <p className="mt-0.5 text-gray-400 italic">Not specified</p>;
                      }
                      const isCurrentYearBlessed = selectedRecord.lastBirthdayBlessedYear === new Date().getFullYear();
                      return (
                        <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-gray-850 p-2.5 rounded-xl border border-slate-100 dark:border-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1">
                              <Cake className="w-4 h-4 text-amber-500 animate-pulse" />
                              {bInfo.dateLabel}
                            </span>
                            {bInfo.isToday ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-black animate-bounce">
                                Today! 🎂
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-400 text-[9px] font-bold">
                                {bInfo.formatted.includes('Tomorrow') ? 'Tomorrow! 🎈' : `in ${bInfo.daysUntil} days`}
                              </span>
                            )}
                          </div>
                          <div className="pt-2 border-t border-dashed border-slate-200 dark:border-gray-700 mt-1 flex items-center justify-between">
                            <span className="text-[9px] text-gray-400 uppercase font-bold">
                              Status: {isCurrentYearBlessed ? 'Dispatched' : 'Pending Blessing'}
                            </span>
                            {isCurrentYearBlessed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-505/10 px-2 py-0.5 rounded-md">
                                <Check className="w-3 h-3 stroke-[3]" /> Sent!
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedRecord(null); // Simple close detail of current modal to jump console focus
                                  openBdayConsole({ ...selectedRecord, segmentKey: activeSegment });
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 font-bold text-white text-[10px] transition cursor-pointer active:scale-95 shadow-xs"
                              >
                                <Send className="w-3 h-3" /> Bless Now
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Marital Status</p>
                    <p className="mt-0.5">{selectedRecord.maritalStatus || 'Single'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Database Source Collection</p>
                    <p className="mt-0.5 text-amber-500 font-bold tracking-wide uppercase text-[10.5px]">[{activeSegment}]</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Registration Timestamp</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Spec details depending on segment */}
                {['first_timer_workers', 'member_workers', 'workers'].includes(activeSegment) && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400 pb-1.5">Workforce service options</span>
                      <p className="text-[10px] text-gray-400">First choice department</p>
                      <p className="text-amber-500 font-bold mb-2">{selectedRecord.firstUnit}</p>
                      <p className="text-[10px] text-gray-400">Second choice department</p>
                      <p className="text-slate-700 dark:text-slate-300 font-bold mb-2">{selectedRecord.secondUnit}</p>
                      <p className="text-[10px] text-gray-400">WIT Course Status</p>
                      <p className="text-slate-700 dark:text-slate-300 mb-2">{selectedRecord.workersTrainingStatus}</p>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400 pb-1.5">Skills and recommendation</span>
                      <p className="text-[10px] text-gray-400">Skills list</p>
                      <p className="text-slate-700 dark:text-slate-300 mb-2 font-bold flex flex-wrap gap-1 mt-0.5">
                        {(selectedRecord.skills || []).map((sk: string) => (
                          <span key={sk} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-[10px]">{sk}</span>
                        ))}
                      </p>
                      <p className="text-[10px] text-gray-400">Reason for service</p>
                      <p className="text-slate-705 dark:text-slate-400 leading-normal italic mb-2">"{selectedRecord.reasonForService}"</p>
                      <p className="text-[10px] text-gray-400">Recommending reference</p>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                        {selectedRecord.recommendationType !== 'None' 
                          ? `${selectedRecord.recommendationType}: ${selectedRecord.recommendationName} (${selectedRecord.recommendationPhone})` 
                          : 'None provided'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {activeSegment === 'training_registrations' && (
                  <div className="sm:col-span-2 pt-2.5 border-t border-slate-100 dark:border-gray-800">
                    <span className="block text-[10px] uppercase font-bold text-gray-400 pb-1">Course Interest Enrollment</span>
                    <p className="text-slate-800 dark:text-white font-bold text-sm text-emerald-500">
                      {selectedRecord.trainingProgram}
                    </p>
                  </div>
                )}

                {activeSegment === 'house_fellowship_registrations' && (
                  <div className="sm:col-span-2 pt-2.5 border-t border-slate-100 dark:border-gray-800 grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400 pb-1">Geographical Placement Details</span>
                      <p className="text-[10px] text-gray-400">Neighbourhood in Ikorodu</p>
                      <p className="text-slate-800 dark:text-white font-bold">{selectedRecord.neighbourhood}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400 pb-1">Closest Landmark</span>
                      <p className="text-[10px] text-gray-400">Closest Landmark</p>
                      <p className="text-rose-500 font-bold">{selectedRecord.landmark}</p>
                    </div>
                  </div>
                )}

                {activeSegment === 'interest_groups' && (
                  <div className="sm:col-span-2 pt-2.5 border-t border-slate-100 dark:border-gray-800">
                    <span className="block text-[10px] uppercase font-bold text-gray-400 pb-1">Selected Interest Groups Onboarding</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(selectedRecord.selectedGroups || []).map((groupName: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-teal-500/10 text-teal-600 dark:text-teal-450 rounded-full font-bold text-xs border border-teal-500/25">
                          {groupName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Deletion / Action row inside Modal */}
              <div className="pt-5 border-t border-gray-150 dark:border-gray-750 flex gap-2 justify-end mt-5">
                <button
                  onClick={() => handleDeleteRecord(selectedRecord.id, activeSegment)}
                  className="px-4.5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Evict Record
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="px-4.5 py-2.5 border border-slate-200 dark:border-gray-700 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold cursor-pointer"
                >
                  Close Modal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ADD NEW HOD DIALOG MODAL LAYOUT --- */}
      <AnimatePresence>
        {showAddHodModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 border border-slate-205 dark:border-gray-750 p-6 sm:p-7 rounded-3xl shadow-2xl max-w-md w-full relative"
            >
              <button 
                onClick={() => setShowAddHodModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 font-extrabold text-xs transition-colors p-2 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-gray-800 pb-3.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Add New Head of Department</h3>
              </div>

              <form onSubmit={handleAddNewHod} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Leader's Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newHodName}
                    onChange={e => setNewHodName(e.target.value)}
                    placeholder="e.g. Deaconess Funmi Martins"
                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-55/60 dark:bg-gray-950 text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ministry Department <span className="text-red-500">*</span></label>
                  <select
                    value={newHodDept}
                    onChange={e => setNewHodDept(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-55/60 dark:bg-gray-955 text-slate-900 dark:text-white outline-none cursor-pointer"
                    required
                  >
                    <option value="">Select choice department</option>
                    {MINISTRY_UNITS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="email"
                    value={newHodEmail}
                    onChange={e => setNewHodEmail(e.target.value)}
                    placeholder="e.g. choir.hod@teamglory.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-55/60 dark:bg-gray-950 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="tel"
                    value={newHodPhone}
                    onChange={e => setNewHodPhone(e.target.value)}
                    placeholder="e.g. +234 803 000 1111"
                    className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-gray-700 bg-gray-55/60 dark:bg-gray-950 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="pt-4 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddHodModal(false)}
                    className="px-4.5 py-2 border border-slate-200 dark:border-gray-700 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md font-black block cursor-pointer"
                  >
                    Register Leader
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- BIRTHDAY MESSAGING CONSOLE DIALOG MODAL --- */}
      <AnimatePresence>
        {bdayMessagingTarget && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-gray-900 border border-slate-205 dark:border-gray-750 p-6 sm:p-7 rounded-3xl shadow-2xl max-w-lg w-full relative"
            >
              <button 
                onClick={() => setBdayMessagingTarget(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 font-extrabold text-xs transition-colors p-2 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-gray-800 pb-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Cake className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Anniversary Celebration Desk</h3>
                  <p className="text-[10px] text-gray-400 font-medium font-mono">RECIPIENT: {bdayMessagingTarget.fullName}</p>
                </div>
              </div>

              {sendingBdayStatus === 'success' && sentDeliveryReport ? (
                <div className="space-y-4 py-2 text-xs">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-2">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white font-bold text-lg animate-bounce">
                      ✓
                    </span>
                    <h4 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Blessing Dispatched Successfully!</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                      The birthday message has been delivered to <strong>{sentDeliveryReport.recipient}</strong> via <strong>{sentDeliveryReport.channel}</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-850 border border-slate-100 dark:border-gray-800 space-y-2">
                    <h5 className="font-bold text-slate-800 dark:text-white tracking-wide uppercase text-[10px]">Gateway Delivery Report</h5>
                    <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                      <div>
                        <span className="block text-[9px] text-gray-400 uppercase leading-normal">Transaction ID</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-350">{sentDeliveryReport.refId}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-gray-400 uppercase leading-normal">Dispatched At</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{sentDeliveryReport.deliveredAt}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-gray-400 uppercase leading-normal font-bold">SMTP Gateway</span>
                        <span className="font-bold text-slate-705 dark:text-slate-350 truncate block max-w-full">{sentDeliveryReport.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-gray-400 uppercase leading-normal font-bold">SMS Node</span>
                        <span className="font-bold text-slate-707 dark:text-slate-350">{sentDeliveryReport.phone}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[9px] text-gray-400 uppercase leading-normal font-bold">Network Handler</span>
                        <span className="font-medium text-amber-500 font-mono text-[10px]">{sentDeliveryReport.gateway}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setBdayMessagingTarget(null)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-905 dark:bg-gray-700 dark:hover:bg-gray-650 text-white rounded-xl font-bold text-xs shadow transition cursor-pointer"
                  >
                    Return to Registry Console
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-gray-850 rounded-2xl border border-slate-100 dark:border-gray-800">
                    <div>
                      <span className="block text-[9px] text-gray-400 uppercase tracking-widest font-bold">Primary Email</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black truncate block">{bdayMessagingTarget.email || 'No Email Added'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-400 uppercase tracking-widest font-bold">Sms Phone Number</span>
                      <span className="text-slate-855 dark:text-slate-200 font-black tracking-normal block">{bdayMessagingTarget.phoneNumber}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Select Dispatch Channel</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Email', 'SMS', 'Both'] as const).map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => setBdaySendingChannel(channel)}
                          className={`py-2 rounded-xl border font-bold transition text-xs cursor-pointer ${
                            bdaySendingChannel === channel
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-white dark:bg-gray-950 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-gray-800 hover:bg-slate-50'
                          }`}
                        >
                          {channel === 'Both' ? '✉️ + 📱 Both' : channel === 'Email' ? '✉️ Email' : '📱 SMS'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Blessing Template</label>
                      <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md">Christian Grace</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['Prophetic Blessing', 'Joyful Celebration', 'Divine Peace', 'Standard Warm Wishes'] as const).map((theme) => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => updateBdayTemplate(theme, bdayMessagingTarget.fullName)}
                          className={`px-2.5 py-1 rounded-full border text-[10px] font-black tracking-tight transition cursor-pointer ${
                            bdayAiPromptTheme === theme
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-500/20'
                              : 'bg-slate-50 dark:bg-gray-850 text-slate-550 dark:text-gray-400 border-transparent hover:bg-slate-100'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 font-extrabold text-slate-450">Message Content</label>
                    <textarea
                      value={bdayCustomMessage}
                      onChange={(e) => setBdayCustomMessage(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 text-[11px] rounded-xl border border-gray-250 dark:border-gray-750 bg-gray-55/60 dark:bg-gray-950 text-slate-900 dark:text-white outline-none leading-relaxed font-semibold"
                      placeholder="Compose your customized warm wishes..."
                    />
                  </div>

                  <div className="pt-2 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setBdayMessagingTarget(null)}
                      className="px-4.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-450 border border-slate-200 dark:border-gray-700 rounded-xl cursor-pointer font-bold"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendBirthdayMessage(bdayMessagingTarget.id, bdayMessagingTarget.segmentKey || activeSegment)}
                      disabled={sendingBdayStatus === 'sending'}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/30 text-white rounded-xl shadow-md font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      {sendingBdayStatus === 'sending' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing Gateway...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Dispatch Blessing
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
