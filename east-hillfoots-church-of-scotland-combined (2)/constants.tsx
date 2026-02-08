
import { ChurchEvent, ChurchGroup, UserRole, ChurchLocation, ChurchContact } from './types';

/**
 * CONFIGURATION CONSTANTS
 * 
 * Paste your Google Apps Script Web App URL here to make it permanent.
 */
export const DEFAULT_GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbwG2DX2bpkga1xsy2CPFh2H3rbIvjdAnk30xw-HHWO37KxhbDvt0mvEEjyazU0kkda2ng/exec";

/**
 * INITIAL DATA STORE
 * 
 * Seed data has been removed to prevent conflicts with Google Sheets integration.
 * The application will now start empty and only display data entered through the 
 * Admin Dashboard or synchronized from your connected Google Spreadsheet.
 */

export const INITIAL_MISSION = "";

export const INITIAL_GROUPS: ChurchGroup[] = [];

export const INITIAL_EVENTS: ChurchEvent[] = [];

export const INITIAL_CONTACTS: ChurchContact[] = [];

export const ROLES: UserRole[] = Object.values(UserRole);

export const CONTACT_TITLES = [
  'Minister',
  'Session Clerk',
  'Depute Session Clerk',
  'Secretary',
  'Treasurer',
  'Dollar Beadle',
  'Muckhart Beadle',
  'Volunteer'
];

export const LOCATIONS: ChurchLocation[] = ['Dollar', 'Muckhart', 'Both'];
