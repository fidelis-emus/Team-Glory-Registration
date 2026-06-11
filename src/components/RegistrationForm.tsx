import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Volunteer } from '../types';
import { 
  User, BookOpen, Heart, CheckSquare, Sparkles, Building, Briefcase, 
  ChevronRight, ChevronLeft, Loader2, Save, Users, AlertCircle 
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccess: (memberId: string) => void;
  onBack: () => void;
  darkMode: boolean;
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

export default function RegistrationForm({ onSuccess, onBack, darkMode }: RegistrationFormProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 8;
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'Single' | 'Married' | 'Divorced' | 'Widowed' | ''>('');
  const [residentialAddress, setResidentialAddress] = useState('');

  // Church Info
  const [churchDuration, setChurchDuration] = useState<'Less than 3 months' | '3–6 months' | '6–12 months' | 'Over 1 year' | ''>('');
  const [churchMember, setChurchMember] = useState<boolean | null>(null);
  const [houseFellowshipStatus, setHouseFellowshipStatus] = useState<boolean | null>(null);
  const [houseFellowshipName, setHouseFellowshipName] = useState('');

  // Workers In Training
  const [workersTrainingStatus, setWorkersTrainingStatus] = useState<'I have completed the programme.' | 'I am currently undergoing the programme.' | 'I have not yet enrolled.' | ''>('');
  const [trainingClass, setTrainingClass] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [enrollNextClass, setEnrollNextClass] = useState<boolean | null>(null);

  // Ministry Unit Select
  const [firstUnit, setFirstUnit] = useState('');
  const [secondUnit, setSecondUnit] = useState('');
  const [flexibleUnit, setFlexibleUnit] = useState<boolean | null>(null);

  // Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [reasonForService, setReasonForService] = useState('');

  // Availability
  const [sundayAvailability, setSundayAvailability] = useState(false);
  const [meetingsAvailability, setMeetingsAvailability] = useState(false);
  const [trainingAvailability, setTrainingAvailability] = useState(false);
  const [programmesAvailability, setProgrammesAvailability] = useState(false);

  // Recommendation
  const [recommendationType, setRecommendationType] = useState<'House Fellowship Leader' | 'Unit Leader' | 'Pastor' | 'Church Worker' | 'None' | ''>('');
  const [recommendationName, setRecommendationName] = useState('');
  const [recommendationPhone, setRecommendationPhone] = useState('');

  // Commitment
  const [commitmentAgreed, setCommitmentAgreed] = useState(false);

  // Skill Options Toggle Handler
  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Generate Unique Member ID with Collision Protection
  const generateMemberId = async (): Promise<string> => {
    // Read count from fast query
    let currentCount = 0;
    try {
      const q = query(collection(db, 'team_glory_members'));
      const snapshot = await getDocs(q);
      currentCount = snapshot.size;
    } catch (e) {
      console.warn("Failed to retrieve count, generating fallback standard random tracker:", e);
      currentCount = Math.floor(Math.random() * 100000);
    }
    
    // Auto-formatting (e.g., TG000001, TG000002)
    let nextNum = currentCount + 1;
    let computedId = `TG${String(nextNum).padStart(6, '0')}`;
    
    // Double check collisions
    let collision = true;
    let attempts = 0;
    while (collision && attempts < 10) {
      const doubleCheckQ = query(collection(db, 'team_glory_members'), where('memberId', '==', computedId));
      const doubleCheckSnap = await getDocs(doubleCheckQ);
      if (doubleCheckSnap.empty) {
        collision = false;
      } else {
        nextNum += 1;
        computedId = `TG${String(nextNum).padStart(6, '0')}`;
        attempts += 1;
      }
    }
    return computedId;
  };

  // Section Validation before moving forward
  const validateStep = (): boolean => {
    setErrorMessage(null);
    if (step === 1) {
      if (!fullName.trim()) {
        setErrorMessage("Please enter your Full Name");
        return false;
      }
      if (!phoneNumber.trim()) {
        setErrorMessage("Please enter your Phone Number");
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
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
    }

    if (step === 2) {
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

    if (step === 3) {
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

    if (step === 4) {
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

    if (step === 5) {
      if (selectedSkills.length === 0) {
        setErrorMessage("Please select at least one skill option");
        return false;
      }
      if (!reasonForService.trim()) {
        setErrorMessage("Please write down why you would like to serve in these units");
        return false;
      }
    }

    if (step === 6) {
      if (!sundayAvailability && !meetingsAvailability && !trainingAvailability && !programmesAvailability) {
        setErrorMessage("Please select at least one availability slot to proceed");
        return false;
      }
    }

    if (step === 7) {
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

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setErrorMessage(null);
    setStep(prev => prev - 1);
  };

  // Submit Handler with Duplicate Email / Phone Verification and security mapping
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Final checks
    if (!commitmentAgreed) {
      setErrorMessage("You must agree to the Worker's Commitment contract to enroll");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Prevent duplicate submissions using phone number or email string queries
      const cleanPhone = phoneNumber.trim();
      const cleanEmail = email.trim().toLowerCase();

      // Look up phone duplicates
      const phoneQuery = query(collection(db, 'team_glory_members'), where('phoneNumber', '==', cleanPhone));
      const phoneSnap = await getDocs(phoneQuery);

      if (!phoneSnap.empty) {
        const existVol = phoneSnap.docs[0].data() as Volunteer;
        setErrorMessage(`Duplicate registration found with this Phone Number! Your Registered Member ID is: ${existVol.memberId}`);
        setSubmitting(false);
        return;
      }

      // Look up email duplicates
      const emailQuery = query(collection(db, 'team_glory_members'), where('email', '==', cleanEmail));
      const emailSnap = await getDocs(emailQuery);

      if (!emailSnap.empty) {
        const existVol = emailSnap.docs[0].data() as Volunteer;
        setErrorMessage(`Duplicate registration found with this Email address! Your Registered Member ID is: ${existVol.memberId}`);
        setSubmitting(false);
        return;
      }

      // 2. Generate Safe Member ID
      const computedMemberId = await generateMemberId();

      const todayStr = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      // 3. Construct Volunteer Dataset
      const volunteerData: Omit<Volunteer, "id"> = {
        memberId: computedMemberId,
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        whatsappNumber: whatsappNumber.trim() || cleanPhone,
        email: cleanEmail,
        gender: gender as 'Male' | 'Female',
        dateOfBirth,
        maritalStatus: maritalStatus as 'Single' | 'Married' | 'Divorced' | 'Widowed',
        address: residentialAddress.trim(),
        churchDuration: churchDuration as 'Less than 3 months' | '3–6 months' | '6–12 months' | 'Over 1 year',
        churchMember: !!churchMember,
        houseFellowshipStatus: !!houseFellowshipStatus,
        houseFellowshipName: houseFellowshipStatus ? houseFellowshipName.trim() : '',
        workersTrainingStatus: workersTrainingStatus as 'I have completed the programme.' | 'I am currently undergoing the programme.' | 'I have not yet enrolled.',
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
        recommendationType: recommendationType as 'House Fellowship Leader' | 'Unit Leader' | 'Pastor' | 'Church Worker' | 'None',
        recommendationName: recommendationType !== 'None' ? recommendationName.trim() : '',
        recommendationPhone: recommendationType !== 'None' ? recommendationPhone.trim() : '',
        commitmentAgreed,
        registrationDate: todayStr,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // 4. Save to Firestore DB
      await addDoc(collection(db, 'team_glory_members'), volunteerData);

      // Trigger OnSuccess Call to Parent routing
      onSuccess(computedMemberId);

    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'team_glory_members');
      } catch (safeErr: any) {
        setErrorMessage(`Server registration failed: ${safeErr.message || 'Firestore rules permission failure'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Section titles & icons mapping
  const stepMeta = [
    { title: 'Personal Info', icon: User },
    { title: 'Church Info', icon: Building },
    { title: 'Workers Training', icon: BookOpen },
    { title: 'Ministry Select', icon: Users },
    { title: 'Skills & Passion', icon: Sparkles },
    { title: 'Availability', icon: CheckSquare },
    { title: 'Recommendation', icon: Heart },
    { title: 'Commitment', icon: Briefcase },
  ];

  const CurrentIcon = stepMeta[step - 1].icon;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back to welcome indicator */}
      <button 
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 mb-6 transition-colors duration-200 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Welcome Page
      </button>

      {/* Progress Rail Header */}
      <div className="mb-8">
        <div className="hidden sm:grid grid-cols-8 gap-1 text-center text-xs font-semibold mb-3">
          {stepMeta.map((s, idx) => {
            const num = idx + 1;
            const isActive = num === step;
            const isCompleted = num < step;
            return (
              <div 
                key={idx}
                className={`pb-2 border-b-2 transition-all duration-300 ${
                  isActive ? 'border-blue-600 text-blue-600 dark:border-blue-450 dark:text-blue-400' : 
                  isCompleted ? 'border-indigo-550 text-indigo-700 dark:border-indigo-500/80 dark:text-indigo-300' : 'border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500'
                }`}
              >
                {s.title}
              </div>
            );
          })}
        </div>

        {/* Small Progress Bar */}
        <div className="w-full bg-slate-200/50 dark:bg-slate-950/40 h-1.5 rounded-full overflow-hidden border border-white/10">
          <div 
            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-300 shadow-md shadow-blue-500/20" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 sm:hidden text-xs text-gray-500 dark:text-gray-400 font-bold">
          <span>{stepMeta[step - 1].title}</span>
          <span>Step {step} of {totalSteps}</span>
        </div>
      </div>

      {/* Error Warnings */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2.5 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="font-medium">{errorMessage}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="frosted-glass-card-light dark:frosted-glass-card-dark rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden">
        {/* Colorful backdrop highlights inside form card */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-6 border-b border-slate-200/50 dark:border-white/10 pb-4 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <CurrentIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">Section {step} of {totalSteps}</span>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{stepMeta[step - 1].title}</h2>
          </div>
        </div>

        {/* Step Cards View */}
        <div className="min-h-[280px]">
          {/* STEP 1: PERSONAL INFORMATION */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. John Emmanuel" 
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +234 803 123 4567" 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">WhatsApp Number <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(Leave blank if same as above)</span></label>
                  <input 
                    type="tel" 
                    value={whatsappNumber}
                    onChange={e => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. +234 803 123 4567" 
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Email Address <span className="text-red-500">*</span></label>
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
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        gender === 'Male' 
                        ? 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/15' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Female')}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        gender === 'Female' 
                        ? 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/15' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
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
                  <input 
                    type="date" 
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Marital Status <span className="text-red-500">*</span></label>
                  <select
                    value={maritalStatus}
                    onChange={e => setMaritalStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
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
                  placeholder="e.g. 12 Glorious Avenue, Lagos"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 2: CHURCH INFORMATION */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">How long have you been attending the church? <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['Less than 3 months', '3–6 months', '6–12 months', 'Over 1 year'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setChurchDuration(option)}
                      className={`px-4 py-3 border rounded-xl text-sm font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                        churchDuration === option 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      {option}
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${churchDuration === option ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                        {churchDuration === option && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">Are you a member of the church? <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChurchMember(true)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        churchMember === true 
                        ? 'bg-amber-500 border-amber-600 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setChurchMember(false)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        churchMember === false 
                        ? 'bg-amber-500 border-amber-600 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">Are you part of a House Fellowship/Cell group? <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHouseFellowshipStatus(true)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        houseFellowshipStatus === true 
                        ? 'bg-amber-500 border-amber-600 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setHouseFellowshipStatus(false)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        houseFellowshipStatus === false 
                        ? 'bg-amber-500 border-amber-600 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Display of House Fellowship Name */}
              <AnimatePresence>
                {houseFellowshipStatus && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">House Fellowship Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={houseFellowshipName}
                      onChange={e => setHouseFellowshipName(e.target.value)}
                      placeholder="e.g. Shiloh Cell, Glory Center, etc." 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP 3: WORKERS-IN-TRAINING STATUS */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">What is your current Workers-in-Training status? <span className="text-red-500">*</span></label>
                <div className="space-y-2.5">
                  {(['I have completed the programme.', 'I am currently undergoing the programme.', 'I have not yet enrolled.'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setWorkersTrainingStatus(option);
                        // Reset subfields
                        setTrainingClass('');
                        setCompletionDate('');
                        setEnrollNextClass(null);
                      }}
                      className={`w-full px-4 py-3 border rounded-xl text-sm font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                        workersTrainingStatus === option 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      {option}
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${workersTrainingStatus === option ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                        {workersTrainingStatus === option && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Display Fields */}
              <AnimatePresence mode="wait">
                {workersTrainingStatus === 'I have completed the programme.' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Class / Batch <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={trainingClass}
                        onChange={e => setTrainingClass(e.target.value)}
                        placeholder="e.g. Batch B, 2025" 
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Completion Date <span className="text-red-500">*</span></label>
                      <input 
                        type="date" 
                        value={completionDate}
                        onChange={e => setCompletionDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                      />
                    </div>
                  </motion.div>
                )}

                {workersTrainingStatus === 'I am currently undergoing the programme.' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Current Class / Module <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={trainingClass}
                      onChange={e => setTrainingClass(e.target.value)}
                      placeholder="e.g. Class 3: Ministry & Service" 
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                    />
                  </motion.div>
                )}

                {workersTrainingStatus === 'I have not yet enrolled.' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20"
                  >
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">Would you like to be enrolled in the next Workers-in-Training class? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEnrollNextClass(true)}
                        className={`py-2 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                          enrollNextClass === true 
                          ? 'bg-amber-500 border-amber-600 text-white' 
                          : 'border-amber-500/20 text-gray-700 dark:text-gray-300 hover:bg-amber-500/5'
                        }`}
                      >
                        Yes, enroll me
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnrollNextClass(false)}
                        className={`py-2 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                          enrollNextClass === false 
                          ? 'bg-gray-600 border-gray-700 text-white' 
                          : 'border-amber-500/20 text-gray-700 dark:text-gray-300 hover:bg-amber-500/5'
                        }`}
                      >
                        No, not yet
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP 4: MINISTRY UNIT SELECTION */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <p className="text-xs text-red-500 font-bold bg-red-500/10 p-2.5 rounded-lg">
                ⚠️ IMPORTANT: Every worker must select EXACTLY TWO distinct units. Choices cannot be identical.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">First Unit of Service <span className="text-red-500">*</span></label>
                  <select
                    value={firstUnit}
                    onChange={e => setFirstUnit(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  >
                    <option value="">Select First Unit</option>
                    {MINISTRY_UNITS.map(unit => (
                      <option key={unit} value={unit} disabled={unit === secondUnit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Second Unit of Service <span className="text-red-500">*</span></label>
                  <select
                    value={secondUnit}
                    onChange={e => setSecondUnit(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                  >
                    <option value="">Select Second Unit</option>
                    {MINISTRY_UNITS.map(unit => (
                      <option key={unit} value={unit} disabled={unit === firstUnit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Are you willing to serve in another unit if one of your selected units reaches capacity? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setFlexibleUnit(true)}
                    className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      flexibleUnit === true 
                      ? 'bg-amber-500 border-amber-600 text-white' 
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlexibleUnit(false)}
                    className={`py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      flexibleUnit === false 
                      ? 'bg-amber-500 border-amber-600 text-white' 
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: SKILLS, EXPERIENCE AND PASSION */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">Skills and Experience <span className="text-xs text-gray-400 font-normal">(Select all that apply)</span> <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SKILL_OPTIONS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-2 border rounded-xl text-xs font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                        selectedSkills.includes(skill)
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      {skill}
                      {selectedSkills.includes(skill) ? (
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full flex-shrink-0" />
                      ) : (
                        <span className="w-2.5 h-2.5 border border-gray-300 dark:border-gray-600 rounded-full flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Why would you like to serve in these units? <span className="text-red-500">*</span></label>
                <textarea 
                  value={reasonForService}
                  onChange={e => setReasonForService(e.target.value)}
                  placeholder="Share your primary motivations, passions or relevant spiritual experiences..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 6: AVAILABILITY */}
          {step === 6 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Which meetings are you available for? <span className="text-red-500">*</span></label>

              <div className="space-y-2.5">
                {[
                  { id: 'sun', label: 'Available on Sundays', val: sundayAvailability, set: setSundayAvailability },
                  { id: 'meet', label: "Available for Workers' Meetings", val: meetingsAvailability, set: setMeetingsAvailability },
                  { id: 'train', label: 'Available for Trainings', val: trainingAvailability, set: setTrainingAvailability },
                  { id: 'spec', label: 'Available for Special Programmes', val: programmesAvailability, set: setProgrammesAvailability },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.set(!item.val)}
                    className={`w-full px-4 py-3.5 border rounded-xl text-sm font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                      item.val 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold' 
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                  >
                    {item.label}
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${item.val ? 'bg-amber-500 border-amber-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                      {item.val && (
                        <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 20 20">
                          <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 7: RECOMMENDATION */}
          {step === 7 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">Do any of the following know you well in the church? <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['House Fellowship Leader', 'Unit Leader', 'Pastor', 'Church Worker', 'None'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setRecommendationType(option);
                        if (option === 'None') {
                          setRecommendationName('');
                          setRecommendationPhone('');
                        }
                      }}
                      className={`px-4 py-3.5 border rounded-xl text-sm font-semibold text-left transition-all cursor-pointer flex justify-between items-center ${
                        recommendationType === option 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      {option}
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${recommendationType === option ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                        {recommendationType === option && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Display of Recommendation Fields */}
              <AnimatePresence>
                {recommendationType && recommendationType !== 'None' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden pt-2"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Official Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={recommendationName}
                        onChange={e => setRecommendationName(e.target.value)}
                        placeholder="e.g. Pastor Samuel" 
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Official Phone Number <span className="text-red-500">*</span></label>
                      <input 
                        type="tel" 
                        value={recommendationPhone}
                        onChange={e => setRecommendationPhone(e.target.value)}
                        placeholder="e.g. +234 803 000 0000" 
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP 8: WORKER'S COMMITMENT */}
          {step === 8 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-gradient-to-br from-amber-500/5 to-red-500/5 dark:from-amber-550/10 dark:to-red-950/10 border border-amber-500/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 dark:bg-amber-400/5 rounded-full -mr-8 -mt-8" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">RCCG Covenant Pledge</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  "I understand that serving in the workforce requires commitment, faithfulness, teachability, and cooperation with church leadership. I commit to serving responsibly and to participating in the Workers-in-Training Programme if required."
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCommitmentAgreed(!commitmentAgreed)}
                  className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                    commitmentAgreed 
                    ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-500/15' 
                    : 'border-slate-300 dark:border-white/15 dark:bg-slate-950 text-transparent'
                  }`}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-slate-800 dark:text-blue-100">
                  I Agree <span className="text-red-500">*</span>
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Form Actions footer */}
        <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/10 flex justify-between items-center bg-transparent relative z-10">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200/60 dark:border-white/10 text-sm font-bold text-slate-700 dark:text-blue-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/15 transition-all cursor-pointer"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Registration...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Register Now
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
