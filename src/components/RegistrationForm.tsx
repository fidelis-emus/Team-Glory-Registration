import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, BookOpen, Heart, CheckSquare, Sparkles, Building, Briefcase, 
  ChevronRight, ChevronLeft, Loader2, Save, Users, AlertCircle, 
  MapPin, CheckCircle2, Copy, Check, Info, Library, ShieldCheck, HelpCircle
} from 'lucide-react';
import { HeadOfDepartment } from '../types';
import { MOCK_HODS } from '../mockData';

interface RegistrationFormProps {
  onSuccess: (memberId: string) => void;
  onBack: () => void;
  darkMode: boolean;
  sandboxBypassActive: boolean;
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
  'Logistics/Transport',
];

const SKILL_OPTIONS = [
  'Teaching',
  'Prayer',
  'Administration',
  'Music',
  'Media',
  'Technical Support',
  'Hospitality',
  'Leadership',
  'Evangelism',
  'Creative Arts',
  "Children's Ministry",
  'Welfare',
  'Other'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

type PathwayType = 
  | 'first_timers'
  | 'first_timer_workers'
  | 'members'
  | 'member_workers'
  | 'workers'
  | 'training_registrations'
  | 'house_fellowship_registrations'
  | 'interest_groups';

type FormScreen =
  | 'personal_info'
  | 'pathway_select'
  | 'first_timer_workforce_ask'
  | 'member_workforce_ask'
  | 'workforce_steps'
  | 'training_steps'
  | 'house_fellowship_steps'
  | 'interest_groups_steps'
  | 'success';

interface InterestCategory {
  title: string;
  items: string[];
}

const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    title: "Creative & Digital",
    items: [
      "Content Creation & Social Media",
      "Photography & Videography",
      "Graphic Design",
      "Music / Sound Production",
      "Writing / Spoken Word"
    ]
  },
  {
    title: "Career & Growth",
    items: [
      "Tech & Software",
      "Entrepreneurship",
      "Career Development",
      "Finance & Money Skills"
    ]
  },
  {
    title: "Relationships & Life",
    items: [
      "Relationships & Identity",
      "Emotional Health & Growth",
      "Marriage Preparation (Young Adults)"
    ]
  },
  {
    title: "Spiritual Life",
    items: [
      "Bible Discussion Circle",
      "Prayer & Worship Community",
      "New Believers Support"
    ]
  },
  {
    title: "Lifestyle & Social",
    items: [
      "Sports & Fitness",
      "Games & Hangout Community",
      "Movies & Media Discussion",
      "Travel & Adventure"
    ]
  },
  {
    title: "Impact",
    items: [
      "Outreach & Evangelism",
      "Community Service Projects"
    ]
  }
];

export default function RegistrationForm({ onSuccess, onBack, darkMode, sandboxBypassActive }: RegistrationFormProps) {
  // Screens navigation state
  const [screen, setScreen] = useState<FormScreen>('personal_info');
  const [currPathway, setCurrPathway] = useState<PathwayType | null>(null);
  
  // Workforce steps (1 to 7)
  const [workforceStep, setWorkforceStep] = useState(1);
  const totalWorkforceSteps = 7;
  
  // App system states
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedRecordId, setCompletedRecordId] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [backendSuccessMessage, setBackendSuccessMessage] = useState<string>('');

  // --- FORM DATA FIELDS ---
  // Personal Info (Page 2)
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');

  const handleDobChange = (day: string, month: string) => {
    setDobDay(day);
    setDobMonth(month);
    if (day && month) {
      setDateOfBirth(`${month} ${day}`);
    } else {
      setDateOfBirth('');
    }
  };
  const [maritalStatus, setMaritalStatus] = useState<'Single' | 'Married' | 'Divorced' | 'Widowed' | ''>('');
  const [residentialAddress, setResidentialAddress] = useState('');

  // Workforce Form fields (7 sections)
  // Section 1: Church Info
  const [churchDuration, setChurchDuration] = useState<'Less than 3 months' | '3–6 months' | '6–12 months' | 'Over 1 year' | ''>('');
  const [churchMember, setChurchMember] = useState<boolean | null>(null);
  const [houseFellowshipStatus, setHouseFellowshipStatus] = useState<boolean | null>(null);
  const [houseFellowshipName, setHouseFellowshipName] = useState('');

  // Section 2: Workers Training
  const [workersTrainingStatus, setWorkersTrainingStatus] = useState<'I have completed the programme.' | 'I am currently undergoing the programme.' | 'I have not yet enrolled.' | ''>('');
  const [trainingClass, setTrainingClass] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [enrollNextClass, setEnrollNextClass] = useState<boolean | null>(null);

  // Section 3: Ministry Units
  const [firstUnit, setFirstUnit] = useState('');
  const [secondUnit, setSecondUnit] = useState('');
  const [flexibleUnit, setFlexibleUnit] = useState<boolean | null>(null);

  // Section 4: Skills & Passion
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [reasonForService, setReasonForService] = useState('');

  // Section 5: Availability
  const [sundayAvailability, setSundayAvailability] = useState(false);
  const [meetingsAvailability, setMeetingsAvailability] = useState(false);
  const [trainingAvailability, setTrainingAvailability] = useState(false);
  const [programmesAvailability, setProgrammesAvailability] = useState(false);

  // Section 6: Recommendation
  const [recommendationType, setRecommendationType] = useState<'House Fellowship Leader' | 'Unit Leader' | 'Pastor' | 'Church Worker' | 'None' | ''>('');
  const [recommendationName, setRecommendationName] = useState('');
  const [recommendationPhone, setRecommendationPhone] = useState('');

  // Section 7: Commitment
  const [commitmentAgreed, setCommitmentAgreed] = useState(false);

  // --- SPECIAL FLOW PATH FIELDS ---
  // Training Selection option
  const [selectedTrainingProgram, setSelectedTrainingProgram] = useState<string>('');

  // House Fellowship location details
  const [neighbourhood, setNeighbourhood] = useState('');
  const [landmark, setLandmark] = useState('');
  const [hfConfirmCorrect, setHfConfirmCorrect] = useState(false);
  const [hfUnderstandAssignment, setHfUnderstandAssignment] = useState(false);
  const [hfAgreeContact, setHfAgreeContact] = useState(false);

  // Interest Onboarding selection (Max 2)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [agreeOptionalInterests, setAgreeOptionalInterests] = useState(false);

  // Custom skills helper
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Custom Interest selection helper (Max 2)
  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      if (selectedInterests.length >= 2) {
        // limit reached, remove first and add new or ignore
        setSelectedInterests([selectedInterests[1], interest]);
      } else {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  // Helper to ensure API responses are actually JSON, which routes around static hosting fallbacks gracefully
  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const resp = await fetch(url, options);
      if (!resp.ok) {
        throw new Error(`HTTP Error ${resp.status}`);
      }
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('Fallback page returned (Local Node server offline or static hosting active)');
      }
      const text = await resp.text();
      if (text.trim().startsWith('<!')) {
        throw new Error('HTML payload received (Local Node server offline or static hosting active)');
      }
      return JSON.parse(text);
    } catch (err: any) {
      console.warn(`[SafeFetch] Failed on ${url}:`, err.message);
      throw err;
    }
  };

  // Safe Member ID Generator with padding
  const generateSpecialId = async (prefix: string, tableName: string): Promise<string> => {
    let currentCount = 0;
    try {
      const arr = await safeFetchJson(`/api/records/${tableName}`);
      if (Array.isArray(arr)) {
        currentCount = arr.length;
      } else {
        currentCount = Math.floor(Math.random() * 900);
      }
    } catch (e) {
      console.warn(`Failed to retrieve count for ${tableName}, using random:`, e);
      currentCount = Math.floor(Math.random() * 900);
    }
    
    // Auto incremental or random
    const nextNum = currentCount + 1;
    const padding = String(nextNum).padStart(5, '0');
    return `${prefix}${padding}`;
  };

  // Global Check for duplicate entries (delegated to backend in accordance with requirements)
  const triggerDuplicateCheck = async (): Promise<boolean> => {
    setErrorMessage(null);
    setCheckingDuplicates(false);
    return false; // Delegated completely to server-side check.
  };

  // Validate Step 1 (Personal Info)
  const validatePersonalInfo = (): boolean => {
    setErrorMessage(null);
    if (!fullName.trim()) {
      setErrorMessage("Please enter your Full Name");
      return false;
    }
    // phoneNumber is optional!
    // email is optional! If entered, it must contain '@'
    if (email.trim() && !email.includes('@')) {
      setErrorMessage("Please enter a valid Email Address");
      return false;
    }
    if (!gender) {
      setErrorMessage("Please select your Gender");
      return false;
    }
    if (!dateOfBirth) {
      setErrorMessage("Please select your Date of Birth");
      return false;
    }
    if (!maritalStatus) {
      setErrorMessage("Please select your Marital Status");
      return false;
    }
    if (!residentialAddress.trim()) {
      setErrorMessage("Please enter your Residential Address");
      return false;
    }
    return true;
  };

  // Validate Workforce step
  const validateWorkforceStep = (): boolean => {
    setErrorMessage(null);
    if (workforceStep === 1) {
      if (!churchDuration) {
        setErrorMessage("Please specify how long you have been attending");
        return false;
      }
      if (churchMember === null) {
        setErrorMessage("Please select whether you are a member of the church");
        return false;
      }
      if (houseFellowshipStatus === null) {
        setErrorMessage("Please specify if you are part of a House Fellowship");
        return false;
      }
      if (houseFellowshipStatus && !houseFellowshipName.trim()) {
        setErrorMessage("Please enter your House Fellowship Name");
        return false;
      }
    }

    if (workforceStep === 2) {
      if (!workersTrainingStatus) {
        setErrorMessage("Please select your Workers-In-Training Status");
        return false;
      }
      if (workersTrainingStatus === 'I have completed the programme.') {
        if (!trainingClass.trim()) {
          setErrorMessage("Please specify your completed Class");
          return false;
        }
        if (!completionDate) {
          setErrorMessage("Please specify your Completion Date");
          return false;
        }
      }
      if (workersTrainingStatus === 'I am currently undergoing the programme.' && !trainingClass.trim()) {
        setErrorMessage("Please specify your current Class");
        return false;
      }
      if (workersTrainingStatus === 'I have not yet enrolled.' && enrollNextClass === null) {
        setErrorMessage("Please select whether you would like to be enrolled");
        return false;
      }
    }

    if (workforceStep === 3) {
      if (!firstUnit) {
        setErrorMessage("Please select your First Unit of Service");
        return false;
      }
      if (!secondUnit) {
        setErrorMessage("Please select your Second Unit of Service");
        return false;
      }
      if (firstUnit === secondUnit) {
        setErrorMessage("First and Second units cannot be identical. Please select two unique units");
        return false;
      }
      if (flexibleUnit === null) {
        setErrorMessage("Please specify if you are willing to serve in another unit if capacity is reached");
        return false;
      }
    }

    if (workforceStep === 4) {
      if (selectedSkills.length === 0) {
        setErrorMessage("Please select at least one skill option");
        return false;
      }
      if (!reasonForService.trim()) {
        setErrorMessage("Please write down why you would like to serve in these units");
        return false;
      }
    }

    if (workforceStep === 5) {
      if (!sundayAvailability && !meetingsAvailability && !trainingAvailability && !programmesAvailability) {
        setErrorMessage("Please select at least one availability slot to proceed");
        return false;
      }
    }

    if (workforceStep === 6) {
      if (!recommendationType) {
        setErrorMessage("Please select your recommendation option");
        return false;
      }
      if (recommendationType !== 'None') {
        if (!recommendationName.trim()) {
          setErrorMessage("Please enter the name of the recommending official");
          return false;
        }
        if (!recommendationPhone.trim()) {
          setErrorMessage("Please enter the phone number of the recommending official");
          return false;
        }
      }
    }

    return true;
  };

  // --- SUBMISSIONS PROCEDURES ---

  // Standard Base Personal Dataset Builder
  const getBaseDataset = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    return {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      gender: gender as 'Male' | 'Female',
      dateOfBirth,
      maritalStatus: maritalStatus as 'Single' | 'Married' | 'Divorced' | 'Widowed',
      address: residentialAddress.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
      registrationDate: todayStr
    };
  };

  // Local Storage persist utility
  const saveToLocalStorage = (key: string, data: any) => {
    try {
      const stored = localStorage.getItem(key);
      const arr = stored ? JSON.parse(stored) : [];
      arr.push(data);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      console.warn("localStorage mirror write failure:", e);
    }
  };

  // Save registration helper to route dynamically via backend API endpoints
  const saveRegistrationRecord = async (collectionName: string, data: any) => {
    const res = await safeFetchJson(`/api/records/${collectionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (res && res.success === false) {
      const errorMsg = res.message || "This person already exists in the database. You cannot register the same person twice.";
      try {
        window.alert(errorMsg);
      } catch (e) {
        console.warn("Iframe window.alert failed. Fallback UI is active.", e);
      }
      throw new Error(errorMsg);
    }

    if (res && res.success === true && res.message) {
      setBackendSuccessMessage(res.message);
    } else {
      setBackendSuccessMessage('');
    }

    return res;
  };

  // Submit NO-Workforce (First Timer / Member)
  const submitOfflinePersonal = async (pathway: 'first_timers' | 'members') => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      // 1. Is there duplicate? Double check before write
      const duplicateFound = await triggerDuplicateCheck();
      if (duplicateFound) {
        return;
      }

      const rawCode = await generateSpecialId(pathway === 'first_timers' ? 'FT' : 'MB', pathway);
      const docData = {
        id: rawCode,
        ...getBaseDataset()
      };

      // 2. Save cloud or sandbox database
      try {
        await saveRegistrationRecord(pathway, docData);
      } catch (err) {
        console.warn("Cloud save was bypassed, stored locally first:", err);
      }

      // 3. Local Mirror
      saveToLocalStorage(`team_glory_${pathway}`, docData);

      setCompletedRecordId(rawCode);
      setCurrPathway(pathway);
      setScreen('success');
    } catch (glErr: any) {
      setErrorMessage(`Registration submission error: ${glErr.message || glErr}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Training Registration
  const submitTrainingRegistration = async () => {
    if (!selectedTrainingProgram) {
      setErrorMessage("Please select a training programme to join");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const duplicateFound = await triggerDuplicateCheck();
      if (duplicateFound) return;

      const rawCode = await generateSpecialId('TR', 'training_registrations');
      const docData = {
        id: rawCode,
        ...getBaseDataset(),
        trainingProgram: selectedTrainingProgram
      };

      try {
        await saveRegistrationRecord('training_registrations', docData);
      } catch (err) {
        console.warn("Bypassed cloud save for TR:", err);
      }

      saveToLocalStorage('team_glory_training_registrations', docData);

      setCompletedRecordId(rawCode);
      setCurrPathway('training_registrations');
      setScreen('success');
    } catch (glErr: any) {
      setErrorMessage(`Training submission error: ${glErr.message || glErr}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit House Fellowship Registration
  const submitHouseFellowship = async () => {
    if (!neighbourhood.trim()) {
      setErrorMessage("Please enter your Neighborhood area in Ikorodu");
      return;
    }
    if (!landmark.trim()) {
      setErrorMessage("Please enter a nearby recognizable landmark");
      return;
    }
    if (!hfConfirmCorrect || !hfUnderstandAssignment || !hfAgreeContact) {
      setErrorMessage("You must accept all three guidelines acknowledgements to submit");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const duplicateFound = await triggerDuplicateCheck();
      if (duplicateFound) return;

      const rawCode = await generateSpecialId('HF', 'house_fellowship_registrations');
      const docData = {
        id: rawCode,
        ...getBaseDataset(),
        neighbourhood: neighbourhood.trim(),
        landmark: landmark.trim(),
        confirmCorrect: hfConfirmCorrect,
        understandAssignment: hfUnderstandAssignment,
        agreeContact: hfAgreeContact
      };

      try {
        await saveRegistrationRecord('house_fellowship_registrations', docData);
      } catch (err) {
        console.warn("Bypassed cloud save for HF:", err);
      }

      saveToLocalStorage('team_glory_house_fellowship_registrations', docData);

      setCompletedRecordId(rawCode);
      setCurrPathway('house_fellowship_registrations');
      setScreen('success');
    } catch (glErr: any) {
      setErrorMessage(`House Fellowship submission error: ${glErr.message || glErr}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Interest Groups Onboarding
  const submitInterestGroups = async () => {
    if (selectedInterests.length === 0) {
      setErrorMessage("Please select at least one Interest Group");
      return;
    }
    if (!agreeOptionalInterests) {
      setErrorMessage("You must agree to the Interest Groups connection agreement to complete onboarding");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const duplicateFound = await triggerDuplicateCheck();
      if (duplicateFound) return;

      const rawCode = await generateSpecialId('IG', 'interest_groups');
      const docData = {
        id: rawCode,
        ...getBaseDataset(),
        selectedGroups: selectedInterests,
        agreeOptional: agreeOptionalInterests
      };

      try {
        await saveRegistrationRecord('interest_groups', docData);
      } catch (err) {
        console.warn("Bypassed cloud save for IG:", err);
      }

      saveToLocalStorage('team_glory_interest_groups', docData);

      setCompletedRecordId(rawCode);
      setCurrPathway('interest_groups');
      setScreen('success');
    } catch (glErr: any) {
      setErrorMessage(`Interest Groups submission error: ${glErr.message || glErr}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Full Workforce Registration (first_timer_workers, member_workers, workers)
  const submitWorkforceRecord = async () => {
    if (!commitmentAgreed) {
      setErrorMessage("You must agree to the Worker's Commitment contract to complete registration");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    const targetCollection = currPathway || 'workers';

    try {
      // 1. Is there duplicate?
      const duplicateFound = await triggerDuplicateCheck();
      if (duplicateFound) return;

      const computedId = await generateSpecialId('TG', targetCollection);

      // Match HOD for first Choose Department
      let matchedHodId: string | undefined = undefined;
      try {
        const fetchRes = await safeFetchJson('/api/hods');
        const listHods: HeadOfDepartment[] = Array.isArray(fetchRes) ? fetchRes : [];

        const storedHodsRaw = localStorage.getItem('heads_of_departments');
        const localHods: HeadOfDepartment[] = storedHodsRaw ? JSON.parse(storedHodsRaw) : [];
        const allHods = [...listHods, ...localHods];

        if (allHods.length === 0) allHods.push(...MOCK_HODS);

        const match = allHods.find(h => h.department.trim().toLowerCase() === firstUnit.trim().toLowerCase());
        if (match) {
          matchedHodId = match.id;
          console.log(`Auto HOD assigning: matched HOD ${match.fullName}`);
        }
      } catch (hodErr) {
        console.warn("Could not retrieve HODs, using Mock fallbacks instead:", hodErr);
        const match = MOCK_HODS.find(h => h.department.trim().toLowerCase() === firstUnit.trim().toLowerCase());
        if (match) matchedHodId = match.id;
      }

      // Construct final payload
      const docData = {
        id: computedId,
        memberId: computedId,
        ...getBaseDataset(),
        churchDuration: churchDuration as any,
        churchMember: !!churchMember,
        houseFellowshipStatus: !!houseFellowshipStatus,
        houseFellowshipName: houseFellowshipStatus ? houseFellowshipName.trim() : '',
        workersTrainingStatus: workersTrainingStatus as any,
        class: workersTrainingStatus !== 'I have not yet enrolled.' ? trainingClass.trim() : '',
        completionDate: workersTrainingStatus === 'I have completed the programme.' ? completionDate : '',
        enrollNextClass: workersTrainingStatus === 'I have not yet enrolled.' ? !!enrollNextClass : false,
        firstUnit,
        secondUnit,
        flexibleUnit: !!flexibleUnit,
        skills: selectedSkills,
        reasonForService: reasonForService.trim(),
        sundayAvailability,
        meetingsAvailability,
        trainingAvailability,
        programmesAvailability,
        recommendationType: recommendationType as any,
        recommendationName: recommendationType !== 'None' ? recommendationName.trim() : '',
        recommendationPhone: recommendationType !== 'None' ? recommendationPhone.trim() : '',
        commitmentAgreed,
        assignedHodId: matchedHodId
      };

      // Push Cloud DB / Sandbox
      try {
        await saveRegistrationRecord(targetCollection, docData);
        // Deprecated unified table for fallback syncing
        await saveRegistrationRecord('team_glory_members', docData);
      } catch (err) {
        console.warn("Bypassed cloud save for workforce:", err);
      }

      // Save Local Storage
      saveToLocalStorage(`team_glory_${targetCollection}`, docData);
      saveToLocalStorage('team_glory_members', docData);

      setCompletedRecordId(computedId);
      setScreen('success');
    } catch (glErr: any) {
      setErrorMessage(`Workforce registration error: ${glErr.message || glErr}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Navigation from Step 1 (Personal Info) to Pathway Select after validation
  const handleProceedToPathways = async () => {
    if (validatePersonalInfo()) {
      // Run quick duplicate check before option list opens
      const duplicateFound = await triggerDuplicateCheck();
      if (!duplicateFound) {
        setScreen('pathway_select');
      }
    }
  };

  // Navigation handlers within Workforce multi-step form
  const handleWorkforceNext = () => {
    if (validateWorkforceStep()) {
      if (workforceStep < totalWorkforceSteps) {
        setWorkforceStep(prev => prev + 1);
      } else {
        submitWorkforceRecord();
      }
    }
  };

  const handleWorkforcePrev = () => {
    setErrorMessage(null);
    if (workforceStep > 1) {
      setWorkforceStep(prev => prev - 1);
    } else {
      // Go back to the screen where is was asked
      if (currPathway === 'first_timer_workers') {
        setScreen('first_timer_workforce_ask');
      } else if (currPathway === 'member_workers') {
        setScreen('member_workforce_ask');
      } else {
        setScreen('pathway_select');
      }
    }
  };

  // Copy success member id
  const copyToClipboard = () => {
    navigator.clipboard.writeText(completedRecordId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // --- RENDERING VIEWS ---

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Back to previous action bar */}
      {screen !== 'success' && (
        <button 
          onClick={() => {
            setErrorMessage(null);
            if (screen === 'personal_info') {
              onBack();
            } else if (screen === 'pathway_select') {
              setScreen('personal_info');
            } else if (screen === 'first_timer_workforce_ask' || screen === 'member_workforce_ask') {
              setScreen('pathway_select');
            } else if (screen === 'workforce_steps') {
              handleWorkforcePrev();
            } else {
              setScreen('pathway_select');
            }
          }}
          className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 mb-5 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          {screen === 'personal_info' ? 'Back to Welcome Page' : 'Back to Previous Step'}
        </button>
      )}

      {/* Global alert bar */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-500/20 text-red-700 dark:text-red-400 rounded-2xl flex items-start gap-2.5 text-sm font-medium z-10 relative"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <div>{errorMessage}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <form 
        onSubmit={(e) => e.preventDefault()} 
        className="frosted-glass-card-light dark:frosted-glass-card-dark rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Decor loops */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

        {/* --- PAGE 2: PERSONAL INFORMATION --- */}
        {screen === 'personal_info' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-2.5 mb-6 border-b border-slate-200/50 dark:border-white/10 pb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">Personal Onboarding</span>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Personal Information</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. John Emmanuel" 
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Phone Number <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(Optional)</span></label>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 08031234567" 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">WhatsApp Number <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(Leave blank if same as above)</span></label>
                  <input 
                    type="tel" 
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 08031234567" 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Email Address <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(Optional)</span></label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. email@address.com" 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Gender <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGender('Male')}
                      className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        gender === 'Male' 
                        ? 'bg-amber-500 border-amber-600 text-white shadow-md' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-900/40'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Female')}
                      className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        gender === 'Female' 
                        ? 'bg-amber-500 border-amber-600 text-white shadow-md' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-900/40'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={dobMonth}
                      onChange={e => handleDobChange(dobDay, e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all cursor-pointer"
                      required
                    >
                      <option value="">Month</option>
                      {MONTHS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <select
                      value={dobDay}
                      onChange={e => handleDobChange(e.target.value, dobMonth)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all cursor-pointer"
                      required
                    >
                      <option value="">Day</option>
                      {DAYS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Marital Status <span className="text-red-500">*</span></label>
                  <select
                    value={maritalStatus}
                    onChange={e => setMaritalStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                    required
                  >
                    <option value="">Select status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Residential Address <span className="text-red-500">*</span></label>
                <textarea 
                  value={residentialAddress}
                  onChange={e => setResidentialAddress(e.target.value)}
                  placeholder="e.g. 12 Glorious Avenue, Ikorodu, Lagos"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all resize-none"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  id="btn-personal-continue"
                  onClick={handleProceedToPathways}
                  disabled={checkingDuplicates}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {checkingDuplicates ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Database...
                    </>
                  ) : (
                    <>
                      Proceed & Choose Pathway
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- DYNAMIC PATHWAYS DIRECTORY --- */}
        {screen === 'pathway_select' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-center mb-6">
              <span className="text-xs uppercase tracking-widest text-amber-500 font-extrabold">TEAM GLORY INTERCONNECTIONS</span>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-1">Select Onboarding Pathway</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                Please select the option that best reflects you or your spiritual connection goals today.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Submit as First Timer */}
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('first_timers');
                  setScreen('first_timer_workforce_ask');
                }}
                className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl text-left bg-blue-50/20 hover:bg-blue-50/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 hover:border-blue-400 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Submit as First Timer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Worshiping with us for the first time? We'd love to connect, welcome, and support you.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-bold mt-4">
                  Proceed <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option 2: Submit as Member */}
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('members');
                  setScreen('member_workforce_ask');
                }}
                className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl text-left bg-indigo-50/20 hover:bg-indigo-50/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 hover:border-indigo-400 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Submit as Member</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    A regular member at House of Glory, YP2, seeking to verify details or explore groups.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-4">
                  Proceed <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option 3: Submit as Worker */}
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('workers');
                  setWorkforceStep(1);
                  setScreen('workforce_steps');
                }}
                className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl text-left bg-amber-50/25 hover:bg-amber-50/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 hover:border-amber-400 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                    <Briefcase className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Submit as Worker</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Directly enroll/onboard into our workforce service across choices of 2 distinct units.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-bold mt-4">
                  Proceed to Workforce <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option 4: Register for Training */}
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('training_registrations');
                  setSelectedTrainingProgram('');
                  setScreen('training_steps');
                }}
                className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl text-left bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 hover:border-emerald-400 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Register for Training</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Join Believers' Class, Baptismal, Workers-In-Training or School of Disciples paths.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-4">
                  Open Programmes <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option 5: Register for House Fellowship */}
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('house_fellowship_registrations');
                  setNeighbourhood('');
                  setLandmark('');
                  setHfConfirmCorrect(false);
                  setHfUnderstandAssignment(false);
                  setHfAgreeContact(false);
                  setScreen('house_fellowship_steps');
                }}
                className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl text-left bg-rose-50/20 hover:bg-rose-50/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 hover:border-rose-400 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-450 flex items-center justify-center mb-3">
                    <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Register for House Fellowship</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Locate, allocate, and align with the closest RCCG House Fellowship zone in Ikorodu.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-bold mt-4">
                  Onboard Location <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* Option 6: Interest Groups */}
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('interest_groups');
                  setSelectedInterests([]);
                  setAgreeOptionalInterests(false);
                  setScreen('interest_groups_steps');
                }}
                className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl text-left bg-teal-50/20 hover:bg-teal-50/40 dark:bg-slate-950/20 dark:hover:bg-slate-950/35 hover:border-teal-400 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                    <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">Interest Groups</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Select custom social and life connection groups (Sports, Tech, Spoken Word, etc.) to thrive.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-bold mt-4">
                  Select Groups <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* --- PATHWAY: FIRST TIMER WORKFORCE OPTION CHECK --- */}
        {screen === 'first_timer_workforce_ask' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Join the Workforce?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Would you like to join the workforce as a dedicated worker serving in any of our church ministries?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('first_timer_workers');
                  setWorkforceStep(1);
                  setScreen('workforce_steps');
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md pointer cursor-pointer hover:scale-[1.01] transition-transform"
              >
                YES, I'd Love To!
              </button>
              <button
                type="button"
                onClick={() => submitOfflinePersonal('first_timers')}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold rounded-xl cursor-pointer hover:scale-[1.01] transition-transform inline-flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "NO, Just Register"}
              </button>
            </div>
          </motion.div>
        )}

        {/* --- PATHWAY: MEMBER WORKFORCE OPTION CHECK --- */}
        {screen === 'member_workforce_ask' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
            <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Join the Workforce?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Would you like to register or join the official church workforce and serve in any department?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  setCurrPathway('member_workers');
                  setWorkforceStep(1);
                  setScreen('workforce_steps');
                }}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer hover:scale-[1.01] transition-transform"
              >
                YES, Show Units
              </button>
              <button
                type="button"
                onClick={() => submitOfflinePersonal('members')}
                disabled={submitting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold rounded-xl cursor-pointer hover:scale-[1.01] transition-transform inline-flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "NO, Just Save"}
              </button>
            </div>
          </motion.div>
        )}

        {/* --- PATHWAY: FULL WORKFORCE MULTI-STEP FORM (Steps 1 to 7) --- */}
        {screen === 'workforce_steps' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Workforce step progress bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1.5 text-xs text-gray-500 dark:text-gray-400 font-bold">
                <span className="uppercase text-amber-500">
                  {currPathway === 'first_timer_workers' ? 'First-Timer Workforce' : currPathway === 'member_workers' ? 'Member Onboarding' : 'Regular Worker Application'}
                </span>
                <span>Section {workforceStep} of {totalWorkforceSteps}</span>
              </div>
              <div className="w-full bg-slate-200/50 dark:bg-slate-950/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-full transition-all duration-300" 
                  style={{ width: `${(workforceStep / totalWorkforceSteps) * 100}%` }}
                />
              </div>
            </div>

            <div className="min-h-[280px]">
              {/* Step 1: Church Info */}
              {workforceStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <Building className="w-5 h-5 text-amber-500" />
                    Church Details
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">How long have you been worshiping with us? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(['Less than 3 months', '3–6 months', '6–12 months', 'Over 1 year'] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setChurchDuration(option)}
                          className={`px-4 py-2.5 border rounded-xl text-sm font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                            churchDuration === option 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50/40 dark:hover:bg-gray-900/40'
                          }`}
                        >
                          {option}
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${churchDuration === option ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                            {churchDuration === option && <span className="w-1 bg-white rounded-full h-1" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Are you a registered member of RCCG? <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setChurchMember(true)}
                          className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            churchMember === true ? 'bg-amber-500 border-amber-600 text-white shadow' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setChurchMember(false)}
                          className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            churchMember === false ? 'bg-amber-500 border-amber-600 text-white shadow' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Are you in a House Fellowship? <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setHouseFellowshipStatus(true)}
                          className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            houseFellowshipStatus === true ? 'bg-amber-500 border-amber-600 text-white shadow' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setHouseFellowshipStatus(false)}
                          className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            houseFellowshipStatus === false ? 'bg-amber-500 border-amber-600 text-white shadow' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>

                  {houseFellowshipStatus === true && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">What is the Name of your House Fellowship? <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        value={houseFellowshipName}
                        onChange={e => setHouseFellowshipName(e.target.value)}
                        placeholder="e.g. Hebron Center, Ikorodu"
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none"
                      />
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 2: Workers Training */}
              {workforceStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                    Workers' Training Development
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">What is your current Workers-In-Training (WIT) status? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {([
                        'I have completed the programme.',
                        'I am currently undergoing the programme.',
                        'I have not yet enrolled.'
                      ] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setWorkersTrainingStatus(option)}
                          className={`px-4 py-3 border rounded-xl text-sm font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                            workersTrainingStatus === option 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50/40 dark:hover:bg-gray-900/40'
                          }`}
                        >
                          {option}
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${workersTrainingStatus === option ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                            {workersTrainingStatus === option && <span className="w-1 bg-white rounded-full h-1" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {workersTrainingStatus === 'I have completed the programme.' && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Class / Batch completed <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={trainingClass}
                          onChange={e => setTrainingClass(e.target.value)}
                          placeholder="e.g. Cohort 12 or 2025 WIT"
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/55 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Completion Date <span className="text-red-500">*</span></label>
                        <input 
                          type="date"
                          value={completionDate}
                          onChange={e => setCompletionDate(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/55 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none"
                        />
                      </div>
                    </motion.div>
                  )}

                  {workersTrainingStatus === 'I am currently undergoing the programme.' && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Your current class / Cohort name <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        value={trainingClass}
                        onChange={e => setTrainingClass(e.target.value)}
                        placeholder="e.g. Cohort B or Group A"
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/55 dark:bg-gray-950 text-gray-900 dark:text-white text-sm outline-none"
                      />
                    </motion.div>
                  )}

                  {workersTrainingStatus === 'I have not yet enrolled.' && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Would you like to be enrolled in the next upcoming training class? <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEnrollNextClass(true)}
                          className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            enrollNextClass === true ? 'bg-amber-500 border-amber-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-350'
                          }`}
                        >
                          Yes, please
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnrollNextClass(false)}
                          className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                            enrollNextClass === false ? 'bg-amber-500 border-amber-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-350'
                          }`}
                        >
                          Later
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 3: Ministry Select */}
              {workforceStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <Users className="w-5 h-5 text-amber-500" />
                    Ministry Department Selection
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">First Choice Department <span className="text-red-500">*</span></label>
                      <select
                        value={firstUnit}
                        onChange={e => setFirstUnit(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none transition-all"
                      >
                        <option value="">Select choice 1</option>
                        {MINISTRY_UNITS.map(unit => (
                          <option key={unit} value={unit} disabled={secondUnit === unit}>{unit}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Second Choice Department <span className="text-red-500">*</span></label>
                      <select
                        value={secondUnit}
                        onChange={e => setSecondUnit(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none transition-all"
                      >
                        <option value="">Select choice 2</option>
                        {MINISTRY_UNITS.map(unit => (
                          <option key={unit} value={unit} disabled={firstUnit === unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Are you willing to serve in another unit if department quotas are full? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFlexibleUnit(true)}
                        className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                          flexibleUnit === true ? 'bg-amber-500 border-amber-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-350'
                        }`}
                      >
                        Yes, I'm flexible
                      </button>
                      <button
                        type="button"
                        onClick={() => setFlexibleUnit(false)}
                        className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                          flexibleUnit === false ? 'bg-amber-500 border-amber-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-350'
                        }`}
                      >
                        No, prefer my choices
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Skills & Passion */}
              {workforceStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Skills, Passion & Talents
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Select your skills / professional qualities: <span className="text-gray-400 font-normal">(choose all that apply)</span> <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SKILL_OPTIONS.map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-3 py-1.5 border rounded-lg text-xs font-semibold text-center hover:scale-[1.01] transition-all cursor-pointer ${
                            selectedSkills.includes(skill)
                            ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-350 bg-slate-50/50 dark:bg-slate-900/60'
                          }`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Why would you like to serve in these departments? <span className="text-red-500">*</span></label>
                    <textarea
                      value={reasonForService}
                      onChange={e => setReasonForService(e.target.value)}
                      placeholder="Share your heart, passion, or calling for this service field..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Availability */}
              {workforceStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <CheckSquare className="w-5 h-5 text-amber-500" />
                    Availability & Times
                  </h3>

                  <div>
                    <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Which slots are you available to support? <span className="text-red-500">*</span></span>
                    <div className="space-y-2.5">
                      {/* Check 1 */}
                      <label className="flex items-start gap-3 p-3 border border-slate-200/50 dark:border-white/5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <input 
                          type="checkbox"
                          checked={sundayAvailability}
                          onChange={e => setSundayAvailability(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 mt-1" 
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-850 dark:text-slate-200">Sunday morning services</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-0.5">Assistance before, during, or after morning worship hours.</p>
                        </div>
                      </label>
                      {/* Check 2 */}
                      <label className="flex items-start gap-3 p-3 border border-slate-200/50 dark:border-white/5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <input 
                          type="checkbox"
                          checked={meetingsAvailability}
                          onChange={e => setMeetingsAvailability(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 mt-1" 
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-850 dark:text-slate-200">Mid-week prayer and study meetings</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-0.5">Worship and development supports on Wednesdays or special vigils.</p>
                        </div>
                      </label>
                      {/* Check 3 */}
                      <label className="flex items-start gap-3 p-3 border border-slate-200/50 dark:border-white/5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <input 
                          type="checkbox"
                          checked={trainingAvailability}
                          onChange={e => setTrainingAvailability(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 mt-1" 
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-850 dark:text-slate-200">Ad-hoc Training classes/cohort structures</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-0.5">Cohort meetings, review classes, and general training support times.</p>
                        </div>
                      </label>
                      {/* Check 4 */}
                      <label className="flex items-start gap-3 p-3 border border-slate-200/50 dark:border-white/5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <input 
                          type="checkbox"
                          checked={programmesAvailability}
                          onChange={e => setProgrammesAvailability(e.target.checked)}
                          className="w-4 h-4 rounded text-blue-600 mt-1" 
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-850 dark:text-slate-200">Special seasonal church programs</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-0.5">Quarterly conferences, out-station projects, and general outdoor events.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 6: Recommendation */}
              {workforceStep === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <Heart className="w-5 h-5 text-amber-500" />
                    Reference & Recommendation
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">Who is recommending you for service? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {([
                        'House Fellowship Leader',
                        'Unit Leader',
                        'Pastor',
                        'Church Worker',
                        'None'
                      ] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRecommendationType(option)}
                          className={`px-4 py-2 border rounded-xl text-xs font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                            recommendationType === option 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50/40 dark:hover:bg-gray-900/40'
                          }`}
                        >
                          {option}
                          <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${recommendationType === option ? 'border-amber-500 bg-amber-500' : 'border-gray-300 dark:border-gray-600'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {recommendationType && recommendationType !== 'None' && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Leader's Full Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          value={recommendationName}
                          onChange={e => setRecommendationName(e.target.value)}
                          placeholder="e.g. Deacon Victor Obinna"
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-905 text-gray-900 dark:text-white text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Leader's Contact Number <span className="text-red-500">*</span></label>
                        <input 
                          type="tel"
                          value={recommendationPhone}
                          onChange={e => setRecommendationPhone(e.target.value)}
                          placeholder="e.g. 08030001111"
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-905 text-gray-900 dark:text-white text-sm outline-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 7: Commitment */}
              {workforceStep === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <Briefcase className="w-5 h-5 text-amber-500" />
                    Christian Service Worker's Covenant
                  </h3>

                  <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 space-y-3 max-h-[220px] overflow-y-auto text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    <p>I acknowledge that Christian service is a holy, serious calling requiring dedication, character, and love. Standing in church service, I pledge before God:</p>
                    <ul className="list-disc list-inside space-y-1.5 bg-transparent p-0 pl-1">
                      <li>To live a lifestyle that glorifies the name of our Lord Jesus Christ in integrity, modesty, and truth.</li>
                      <li>To submit to our spiritual leaders as we coordinate together under the supervision of the resident pastor of RCCG House of Glory, YP2.</li>
                      <li>To serve with excellence, arrive early for reviews, assist colleagues, and represent the church workforce honorably.</li>
                      <li>To comply with general policies, quotas, and follow prompt assignments made by Cluster Coordinators.</li>
                    </ul>
                    <p className="border-t border-slate-205 dark:border-white/10 pt-2 text-amber-600 dark:text-amber-450 font-bold">This commitment functions as an official covenant of service to Christ's body.</p>
                  </div>

                  <label className="flex items-start gap-3 p-3 border border-amber-500/10 dark:border-amber-500/15 rounded-xl cursor-pointer hover:bg-amber-500/5 transition-colors">
                    <input 
                      type="checkbox"
                      checked={commitmentAgreed}
                      onChange={e => setCommitmentAgreed(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 mt-0.5" 
                    />
                    <div className="text-slate-800 dark:text-slate-200 text-xs font-bold leading-relaxed">
                      I solemnly accept, agree, and pledge to support the Christian Service Worker's Covenant.
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Navigation buttons for Workforce Steps */}
            <div className="pt-6 border-t border-slate-200/50 dark:border-white/10 flex justify-between items-center relative z-10">
              <button
                type="button"
                onClick={handleWorkforcePrev}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                type="button"
                id="btn-workforce-next"
                onClick={handleWorkforceNext}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/15 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    {workforceStep === totalWorkforceSteps ? 'Accept & Submit' : 'Continue'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* --- PATHWAY: TRAINING PROGRAM SELECTIONS --- */}
        {screen === 'training_steps' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200/50 dark:border-white/10 pb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Library className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">Discipleship Pathway</span>
                <h2 className="text-lg font-black text-slate-800 dark:text-white">Training Programme</h2>
              </div>
            </div>

            {/* Welcome messages */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              <p className="mb-2 text-emerald-700 dark:text-emerald-400 font-extrabold">Dear {fullName},</p>
              Thank you for your desire to grow in faith and spiritual maturity. Whether you're taking your first steps as a believer or seeking deeper discipleship and leadership development, we have a training pathway designed to help you grow.
              Please select the programme(s) you are interested in below, and a member of our team will contact you with further details.
            </div>

            <div>
              <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest leading-loose mb-2">Which training programme would you like to join? <span className="text-red-500">*</span></span>
              <div className="space-y-2">
                {[
                  "Believers' Class",
                  "Baptismal Class",
                  "Workers-in-Training",
                  "School of Disciples",
                  "Bible College",
                  "I'm not sure and would like guidance"
                ].map(program => (
                  <button
                    key={program}
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSelectedTrainingProgram(program);
                    }}
                    className={`w-full p-3 border rounded-xl text-left text-xs sm:text-sm font-bold flex justify-between items-center transition-all cursor-pointer ${
                      selectedTrainingProgram === program
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                      : 'border-slate-200/70 dark:border-white/5 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-100/40 dark:hover:bg-slate-900/80'
                    }`}
                  >
                    {program}
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedTrainingProgram === program ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                      {selectedTrainingProgram === program && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 flex justify-between">
              <button
                type="button"
                onClick={() => setScreen('pathway_select')}
                className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-xs text-slate-600 dark:text-slate-350 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                id="btn-training-submit"
                onClick={submitTrainingRegistration}
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Register Programme
              </button>
            </div>
          </motion.div>
        )}

        {/* --- PATHWAY: HOUSE FELLOWSHIP PLACEMENTS --- */}
        {screen === 'house_fellowship_steps' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200/50 dark:border-white/10 pb-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-450 intersection flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 font-bold">Local Community Placement</span>
                <h2 className="text-lg font-black text-slate-800 dark:text-white">Register for House Fellowship</h2>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Your Neighbourhood <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  value={neighbourhood}
                  onChange={e => setNeighbourhood(e.target.value)}
                  placeholder="Please type your area in Ikorodu"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Closest Landmark <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="Please type a nearby landmark"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none"
                  required
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-200/50 dark:border-white/5">
                <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest leading-loose">Guidelines Acknowledgement</span>
                
                {/* Tick 1 */}
                <label className="flex gap-2.5 items-start cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={hfConfirmCorrect}
                    onChange={e => setHfConfirmCorrect(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 mt-0.5" 
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-350 font-bold leading-relaxed select-none">
                     I confirm that the location information provided is correct.
                  </span>
                </label>

                {/* Tick 2 */}
                <label className="flex gap-2.5 items-start cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={hfUnderstandAssignment}
                    onChange={e => setHfUnderstandAssignment(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 mt-0.5" 
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-350 font-bold leading-relaxed select-none">
                     I understand I will be assigned to the nearest House Fellowship in Ikorodu.
                  </span>
                </label>

                {/* Tick 3 */}
                <label className="flex gap-2.5 items-start cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={hfAgreeContact}
                    onChange={e => setHfAgreeContact(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 mt-0.5" 
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-350 font-bold leading-relaxed select-none">
                     I agree to be contacted by a coordinator with my group details.
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 flex justify-between">
              <button
                type="button"
                onClick={() => setScreen('pathway_select')}
                className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-xs text-slate-600 dark:text-slate-350 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                id="btn-hf-submit"
                onClick={submitHouseFellowship}
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Submit Fellowship Location
              </button>
            </div>
          </motion.div>
        )}

        {/* --- PATHWAY: INTEREST GROUPS ONBOARDING --- */}
        {screen === 'interest_groups_steps' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-200/50 dark:border-white/10 pb-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 font-bold">Social & Kingdom Core Alignment</span>
                <h2 className="text-lg font-black text-slate-800 dark:text-white">Interest Groups Connection</h2>
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest leading-none mb-1">What would you like to connect with based on your interests?</span>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-extrabold mb-3">Instruction: Select a maximum of two groups.</p>

              <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-1">
                {INTEREST_CATEGORIES.map((cat, idx) => (
                  <div key={idx} className="space-y-1 bg-slate-50/40 dark:bg-slate-905/20 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="block text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-indigo-305">{cat.title}</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cat.items.map(item => {
                        const isSelected = selectedInterests.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleInterest(item)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition-all cursor-pointer ${
                              isSelected 
                              ? 'bg-teal-500 border-teal-600 text-white shadow' 
                              : 'border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-350 hover:bg-slate-100/50 dark:hover:bg-slate-950/40'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final Agreement */}
            <label className="flex gap-3 items-start p-3 bg-teal-500/5 border border-teal-500/10 rounded-xl cursor-pointer">
              <input 
                type="checkbox"
                checked={agreeOptionalInterests}
                onChange={e => setAgreeOptionalInterests(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 mt-0.5" 
              />
              <span className="text-xs text-slate-650 dark:text-slate-250 font-bold leading-relaxed select-none">
                 I understand that Interest Groups are optional and meant for connection and community growth. <strong>I Agree</strong>
              </span>
            </label>

            <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 flex justify-between">
              <button
                type="button"
                onClick={() => setScreen('pathway_select')}
                className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-xs text-slate-600 dark:text-slate-350 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                id="btn-interests-submit"
                onClick={submitInterestGroups}
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Complete Onboarding
              </button>
            </div>
          </motion.div>
        )}

        {/* --- CUSTOMIZED PATHWAY SUCCESS SCREENS (Inline Layout) --- */}
        {screen === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-500/25 shadow-inner"
            >
              <CheckCircle2 className="w-9 h-9" />
            </motion.div>

            {/* Custom SUCCESS Header depending on path */}
            {currPathway === 'training_registrations' ? (
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mb-3">Registration Successful!</h2>
            ) : currPathway === 'house_fellowship_registrations' ? (
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mb-3">Details Submitted!</h2>
            ) : currPathway === 'interest_groups' ? (
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mb-3">ONBOARDING COMPLETE</h1>
            ) : (
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mb-3">Registration Successful!</h2>
            )}

            {/* Badge displaying generated ID */}
            {completedRecordId && (
              <div className="bg-white/60 dark:bg-slate-900/55 border border-emerald-555/20 max-w-sm mx-auto rounded-xl p-4 my-4 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-blue-200/60 uppercase tracking-widest block mb-1">Onboarding Reference Code</span>
                <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-950 px-4 py-1.5 rounded-lg border border-slate-205 dark:border-white/5 shadow-inner">
                  <span className="font-mono text-base font-extrabold text-blue-600 dark:text-blue-400 select-all tracking-wider">
                    {completedRecordId}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-md transition-colors cursor-pointer"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Custom SUCCESS Body Messages based on selected pathway rules */}
            {backendSuccessMessage ? (
              <div 
                className="max-w-xl mx-auto text-left text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-bold space-y-4 my-5 p-6 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-emerald-500/20 shadow-xs"
                style={{ whiteSpace: 'pre-line' }}
              >
                {backendSuccessMessage}
              </div>
            ) : (
              <div className="max-w-xl mx-auto text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-semibold space-y-4 my-5 p-4 rounded-2xl bg-white/30 dark:bg-slate-900/10 border border-slate-100/50 dark:border-white/5">
                {/* Pathway 1: first_timer_workers, member_workers, workers */}
                {(currPathway === 'first_timer_workers' || currPathway === 'member_workers' || currPathway === 'workers') && (
                  <p>
                    Thank you for joining TEAM GLORY.<br /><br />
                    Your information has been received and you will be connected to the appropriate groups and next steps.
                    A coordinator may contact you with further details. Welcome to community, growth, and service.
                  </p>
                )}

                {/* Pathway 2: first_timers */}
                {currPathway === 'first_timers' && (
                  <p>
                    Thank you for worshiping with us today.<br /><br />
                    God bless you and have a great week.
                    Your information has been saved successfully.<br /><br />
                    A team member of the Follow-Up Department will reach out to you.
                  </p>
                )}

                {/* Pathway 3: members */}
                {currPathway === 'members' && (
                  <p>
                    Thank you for worshiping with us today.<br /><br />
                    God bless you and have a great week.
                    Your information has been saved successfully.<br /><br />
                    A team member of the Follow-Up Department will reach out to you.
                  </p>
                )}

                {/* Pathway 4: training_registrations */}
                {currPathway === 'training_registrations' && (
                  <p>
                    Your interest in the selected training programme(s) has been received.<br /><br />
                    A member of our team will contact you with details about upcoming classes and next steps.
                    Thank you for your commitment to spiritual growth and discipleship.
                  </p>
                )}

                {/* Pathway 5: house_fellowship_registrations */}
                {currPathway === 'house_fellowship_registrations' && (
                  <p>
                    Thank you for submitting your location details.<br /><br />
                    You will be connected to the nearest House Fellowship in your area within Ikorodu.
                    A coordinator will reach out to you shortly with your group details and meeting information.
                    Welcome to a family near you. We are glad to have you connected.
                  </p>
                )}

                {/* Pathway 6: interest_groups */}
                {currPathway === 'interest_groups' && (
                  <p>
                    Thank you for joining TEAM GLORY.<br /><br />
                    Your information has been received and you will be connected to the appropriate groups and next steps.
                    A coordinator may contact you with further details. Welcome to community, growth, and service.
                  </p>
                )}
              </div>
            )}

            <div className="pt-6 border-t border-slate-205 dark:border-white/5 space-y-4">
              <button
                type="button"
                id="btn-return-home"
                onClick={onBack}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-extrabold text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
              >
                Return to Home Page
              </button>

              <div className="block">
                <button
                  type="button"
                  onClick={() => {
                    // reset all fields
                    setFullName('');
                    setPhoneNumber('');
                    setWhatsappNumber('');
                    setEmail('');
                    setGender('');
                    setDateOfBirth('');
                    setDobMonth('');
                    setDobDay('');
                    setMaritalStatus('');
                    setResidentialAddress('');
                    setChurchDuration('');
                    setChurchMember(null);
                    setHouseFellowshipStatus(null);
                    setHouseFellowshipName('');
                    setWorkersTrainingStatus('');
                    setTrainingClass('');
                    setCompletionDate('');
                    setEnrollNextClass(null);
                    setFirstUnit('');
                    setSecondUnit('');
                    setFlexibleUnit(null);
                    setSelectedSkills([]);
                    setReasonForService('');
                    setSundayAvailability(false);
                    setMeetingsAvailability(false);
                    setTrainingAvailability(false);
                    setProgrammesAvailability(false);
                    setRecommendationType('');
                    setRecommendationName('');
                    setRecommendationPhone('');
                    setCommitmentAgreed(false);
                    setSelectedTrainingProgram('');
                    setNeighbourhood('');
                    setLandmark('');
                    setHfConfirmCorrect(false);
                    setHfUnderstandAssignment(false);
                    setHfAgreeContact(false);
                    setSelectedInterests([]);
                    setAgreeOptionalInterests(false);
                    setCurrPathway(null);
                    setScreen('personal_info');
                  }}
                  className="text-xs text-slate-400 hover:text-blue-500 font-bold transition-all underline cursor-pointer"
                >
                  Fill another registration form
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}
