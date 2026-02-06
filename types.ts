
export type ChurchLocation = 'Dollar' | 'Muckhart' | 'Both';

export enum UserRole {
  ADMIN = 'Admin',
  GENERAL = 'General'
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  location: ChurchLocation;
}

export type RecurrenceType = 'None' | 'Weekly' | 'BiWeekly' | 'MonthlyRelative';

export interface ChurchEvent {
  id: string;
  title: string;
  description: string;
  startTime?: string; // ISO string or just time
  endTime?: string;   // ISO string or just time
  eventDate: string;  // YYYY-MM-DD
  location: ChurchLocation;
  isRecurring: boolean;
  recurrence?: RecurrenceType;
  dayOfWeek?: number; // 0 (Sun) to 6 (Sat)
  weekOfMonth?: 1 | 2 | 3 | 4 | 5; // 1-4, or 5 for 'Last'
  recurrenceEndDate?: string;
  tag: ChurchLocation | 'All';
}

export interface ChurchGroup {
  id: string;
  name: string;
  description: string;
  church: 'Dollar' | 'Muckhart';
  meetingTime: string;
  contactPerson: string;
}

export interface MissionStatement {
  text: string;
  lastUpdated: string;
}

export interface ChurchContact {
  id: string;
  name?: string;
  title?: string;
  role?: string;
  password?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  displayPublicly: boolean;
}

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  subscribedAt: string;
}

export interface Feedback {
  id: string;
  foundLooking: 'Yes' | 'No' | "I'm still looking";
  improveWebsite: string;
  addRemove: string;
  submittedAt: string;
  pagePath: string;
}
