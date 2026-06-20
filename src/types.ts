export interface BaseRegistration {
  id: string;
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  gender: 'Male' | 'Female';
  dateOfBirth: string;
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  address: string;
  occupation?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface FirstTimer extends BaseRegistration {}

export interface Member extends BaseRegistration {}

export interface Volunteer extends BaseRegistration {
  memberId: string;
  // Church Details
  churchDuration: 'Less than 3 months' | '3–6 months' | '6–12 months' | 'Over 1 year';
  churchMember: boolean;
  houseFellowshipStatus: boolean;
  houseFellowshipName?: string;
  
  // Workers Training
  workersTrainingStatus: 'I have completed the programme.' | 'I am currently undergoing the programme.' | 'I have not yet enrolled.';
  class?: string;
  completionDate?: string;
  enrollNextClass?: boolean;
  
  // Ministry Units
  firstUnit: string;
  secondUnit: string;
  flexibleUnit: boolean;
  
  // Skills & Passion
  skills: string[];
  reasonForService: string;
  
  // Availability
  sundayAvailability: boolean;
  meetingsAvailability: boolean;
  trainingAvailability: boolean;
  programmesAvailability: boolean;
  
  // Recommendation
  recommendationType: 'House Fellowship Leader' | 'Unit Leader' | 'Pastor' | 'Church Worker' | 'None';
  recommendationName?: string;
  recommendationPhone?: string;
  
  // Commitment
  commitmentAgreed: boolean;
  
  // Assignment details
  assignedHodId?: string;

  // Timestamps
  registrationDate: string; // YYYY-MM-DD
}

export interface FirstTimerWorker extends Volunteer {}
export interface MemberWorker extends Volunteer {}
export interface WorkerSectionRecord extends Volunteer {} // worker collection

export interface TrainingRegistration extends BaseRegistration {
  trainingProgram: 'Believers\' Class' | 'Baptismal Class' | 'Workers-in-Training' | 'School of Disciples' | 'Bible College' | 'I\'m not sure and would like guidance';
}

export interface HouseFellowshipRegistration extends BaseRegistration {
  neighbourhood: string;
  landmark: string;
  confirmCorrect: boolean;
  understandAssignment: boolean;
  agreeContact: boolean;
}

export interface InterestGroupsRegistration extends BaseRegistration {
  selectedGroups: string[]; // max 2
  agreeOptional: boolean;
}

export interface HeadOfDepartment {
  id: string;
  fullName: string;
  department: string;
  email?: string;
  phoneNumber?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin' | 'superadmin';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  details: string;
  timestamp: string;
}
