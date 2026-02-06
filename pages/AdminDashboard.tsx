
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit3, Save, X, Sparkles, Calendar as CalendarIcon, Users, Target, 
  ShieldCheck, Database, Copy, RefreshCw, 
  Link, CheckCircle2, Info,
  Code2, Loader2, Check, CloudDownload, CalendarDays, ExternalLink, AlertTriangle,
  Activity, Mail, Download, Camera, LogOut, UserCircle, Key, Clock, MapPin, Tag, Repeat,
  Church, MessageSquare, ThumbsUp, ThumbsDown, HelpCircle, CalendarDays as CalendarIcon2
} from 'lucide-react';
import { ChurchEvent, ChurchGroup, MissionStatement, ChurchContact, Subscriber, ChurchLocation, RecurrenceType, Feedback } from '../types';
import { ROLES, LOCATIONS, CONTACT_TITLES } from '../constants';
import { refineMissionStatement } from '../services/geminiService';
import { 
  fetchSheetData, 
  syncFullTableToSheet, 
  testConnection, 
  SyncResult,
  syncEntryToSheet 
} from '../services/googleSheetsService';
import Calendar from '../components/Calendar';
import { format } from 'date-fns';

interface AdminDashboardProps {
  events: ChurchEvent[];
  groups: ChurchGroup[];
  contacts: ChurchContact[];
  subscribers: Subscriber[];
  feedback: Feedback[];
  mission: MissionStatement;
  googleSheetsUrl: string;
  isSyncing: boolean;
  onSaveEvent: (event: ChurchEvent) => void;
  onDeleteEvent: (id: string) => void;
  onSaveGroup: (group: ChurchGroup) => void;
  onDeleteGroup: (id: string) => void;
  onSaveContact: (contact: ChurchContact) => void;
  onDeleteContact: (id: string) => void;
  onSaveMission: (mission: MissionStatement) => void;
  onUpdateSubscribers: (subscribers: Subscriber[]) => void;
  onUpdateFeedback: (feedback: Feedback[]) => void;
  onUpdateSheetsUrl: (url: string) => void;
  onBulkUpdateEvents: (events: ChurchEvent[]) => void;
  onBulkUpdateGroups: (groups: ChurchGroup[]) => void;
  onBulkUpdateContacts: (contacts: ChurchContact[]) => void;
  onRefreshAll: () => Promise<void>;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events, groups, contacts, subscribers, feedback, mission, googleSheetsUrl, isSyncing,
  onSaveEvent, onDeleteEvent, onSaveGroup, onDeleteGroup, onSaveContact, onDeleteContact,
  onSaveMission, onUpdateSubscribers, onUpdateFeedback, onUpdateSheetsUrl,
  onBulkUpdateEvents, onBulkUpdateGroups, onBulkUpdateContacts, onRefreshAll, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'groups' | 'contacts' | 'subscribers' | 'feedback' | 'mission' | 'system' | 'account'>('events');
  const [isRefining, setIsRefining] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncResult[]>([]);
  const [urlInput, setUrlInput] = useState(googleSheetsUrl);
  
  const [missionInput, setMissionInput] = useState(mission.text);

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ChurchEvent> & { timeStart?: string; timeEnd?: string } | null>(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<ChurchGroup> | null>(null);

  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<ChurchContact> | null>(null);
  const contactFileInputRef = useRef<HTMLInputElement>(null);

  const [adminEmail, setAdminEmail] = useState('');
  const [newPassword, setPassword] = useState('');
  const [accountUpdateSuccess, setAccountUpdateSuccess] = useState(false);

  useEffect(() => { setUrlInput(googleSheetsUrl); }, [googleSheetsUrl]);
  useEffect(() => { setMissionInput(mission.text); }, [mission.text]);
  
  useEffect(() => {
    const creds = JSON.parse(localStorage.getItem('admin_account_credentials') || '{"email":"admin@easthillfoots.org","password":"password123"}');
    setAdminEmail(creds.email);
  }, []);

  const addLog = (res: SyncResult) => setSyncLogs(prev => [res, ...prev].slice(0, 10));

  const getFlexibleValue = (obj: any, keys: string[]) => {
    if (!obj) return undefined;
    const objKeys = Object.keys(obj);
    for (const searchKey of keys) {
      const normalizedSearch = searchKey.toLowerCase().replace(/\s/g, '');
      const foundActualKey = objKeys.find(k => k.toLowerCase().replace(/\s/g, '') === normalizedSearch);
      if (foundActualKey !== undefined) return obj[foundActualKey];
    }
    return undefined;
  };

  const parseCloudDate = (val: any): string | null => {
    if (!val) return null;
    const s = String(val).trim();
    if (!s) return null;
    const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    const slashMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (slashMatch) {
      let d = parseInt(slashMatch[1]);
      let m = parseInt(slashMatch[2]);
      let y = parseInt(slashMatch[3]);
      if (d > 12) return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      try {
        const testDate = new Date(s);
        if (!isNaN(testDate.getTime())) return testDate.toISOString().split('T')[0];
      } catch (e) {}
    }
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return null;
  };

  const sanitizeData = (items: any[], type: string) => {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item, idx) => {
      if (type === 'events') {
        const rawDate = getFlexibleValue(item, ['eventdate', 'date', 'day']);
        const rawRecur = getFlexibleValue(item, ['isrecurring', 'recurring', 'repeat?']);
        const recurrence = getFlexibleValue(item, ['recurrence', 'frequency', 'repeat']) || 'None';
        const normalizeLoc = (val: any) => {
          const v = String(val || '').trim().toLowerCase();
          if (v.includes('dollar')) return 'Dollar';
          if (v.includes('muckhart')) return 'Muckhart';
          return 'All';
        };
        const e: any = {
          id: getFlexibleValue(item, ['id']) || `event-${idx}`,
          title: getFlexibleValue(item, ['title', 'name', 'event']) || 'Untitled',
          description: getFlexibleValue(item, ['description', 'details']) || '',
          location: normalizeLoc(getFlexibleValue(item, ['location'])),
          tag: normalizeLoc(getFlexibleValue(item, ['tag'])),
          startTime: getFlexibleValue(item, ['starttime', 'start']) || '',
          endTime: getFlexibleValue(item, ['endtime', 'end']) || '',
          eventDate: parseCloudDate(rawDate) || new Date().toISOString().split('T')[0],
          recurrence: recurrence,
          isRecurring: rawRecur !== undefined ? (String(rawRecur).toLowerCase().trim() === 'true' || String(rawRecur).toLowerCase().trim() === 'yes' || String(rawRecur) === '1') : recurrence !== 'None',
          dayOfWeek: Number(getFlexibleValue(item, ['dayofweek'])) || 0,
          weekOfMonth: Number(getFlexibleValue(item, ['weekofmonth'])) || 1,
        };
        return e;
      } else if (type === 'contacts') {
        return {
          id: getFlexibleValue(item, ['id']) || `contact-${idx}`,
          name: getFlexibleValue(item, ['name', 'fullname']) || 'Unknown',
          title: getFlexibleValue(item, ['title', 'position']) || '',
          role: getFlexibleValue(item, ['role', 'accessrole']) || 'Volunteer',
          email: getFlexibleValue(item, ['email', 'emailaddress']) || '',
          phone: String(getFlexibleValue(item, ['phone', 'telephone']) || ''),
          imageUrl: getFlexibleValue(item, ['imageurl', 'image']) || '',
          displayPublicly: getFlexibleValue(item, ['displaypublicly', 'public']) !== undefined ? (String(getFlexibleValue(item, ['displaypublicly', 'public'])).toLowerCase().trim() === 'true') : true,
        };
      } else if (type === 'groups') {
        return {
          id: getFlexibleValue(item, ['id']) || `group-${idx}`,
          name: getFlexibleValue(item, ['name', 'groupname']) || 'Untitled Group',
          description: getFlexibleValue(item, ['description']) || '',
          church: String(getFlexibleValue(item, ['church', 'location']) || '').toLowerCase().includes('muckhart') ? 'Muckhart' : 'Dollar',
          meetingTime: getFlexibleValue(item, ['meetingtime', 'time']) || '',
          contactPerson: getFlexibleValue(item, ['contactperson', 'contact']) || '',
        };
      } else if (type === 'subscriber') {
        return {
          id: getFlexibleValue(item, ['id', 'uuid']) || `sub-${idx}`,
          name: getFlexibleValue(item, ['name', 'fullname', 'member']) || 'Subscriber',
          email: getFlexibleValue(item, ['email', 'emailaddress']) || '',
          subscribedAt: getFlexibleValue(item, ['subscribedat', 'date']) || new Date().toISOString()
        };
      } else if (type === 'feedback') {
        return {
          id: getFlexibleValue(item, ['id', 'uuid']) || `fb-${idx}`,
          foundLooking: getFlexibleValue(item, ['foundlooking', 'found']) || 'Yes',
          improveWebsite: getFlexibleValue(item, ['improvewebsite', 'improve']) || '',
          addRemove: getFlexibleValue(item, ['addremove', 'changes']) || '',
          submittedAt: getFlexibleValue(item, ['submittedat', 'date']) || new Date().toISOString(),
          pagePath: getFlexibleValue(item, ['pagepath', 'page']) || 'Home'
        };
      } else if (type === 'mission') {
        return {
          text: getFlexibleValue(item, ['text', 'mission', 'statement']) || '',
          lastUpdated: getFlexibleValue(item, ['lastupdated', 'date']) || new Date().toISOString()
        };
      }
      return item;
    });
  };

  const handlePullSection = async (sheetName: string, updateFn: (data: any[]) => void) => {
    if (!googleSheetsUrl) return alert("Configure URL in System tab first");
    setIsPulling(true);
    try {
      const data = await fetchSheetData(googleSheetsUrl, sheetName);
      if (data && data.length > 0) {
        const sanitized = sanitizeData(data, sheetName);
        updateFn(sanitized);
        addLog({ success: true, message: `Successfully pulled and sanitized ${sanitized.length} items from ${sheetName}.`, timestamp: new Date().toLocaleTimeString() });
      } else {
        addLog({ success: false, message: `No data found in cloud for ${sheetName}.`, timestamp: new Date().toLocaleTimeString() });
      }
    } catch (err: any) {
      addLog({ success: false, message: `Pull failed: ${err.message}`, timestamp: new Date().toLocaleTimeString() });
    } finally {
      setIsPulling(false);
    }
  };

  const handleRefineMission = async () => {
    if (!missionInput) return;
    setIsRefining(true);
    try {
      const refined = await refineMissionStatement(missionInput);
      setMissionInput(refined);
      addLog({ success: true, message: "Mission refined by Gemini AI.", timestamp: new Date().toLocaleTimeString() });
    } catch (err) {
      addLog({ success: false, message: "AI refinement failed.", timestamp: new Date().toLocaleTimeString() });
    } finally {
      setIsRefining(false);
    }
  };

  const handleUpdateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = JSON.parse(localStorage.getItem('admin_account_credentials') || '{"email":"admin@easthillfoots.org","password":"password123"}');
    const updated = { email: adminEmail, password: newPassword || creds.password };
    localStorage.setItem('admin_account_credentials', JSON.stringify(updated));
    setAccountUpdateSuccess(true);
    setPassword('');
    setTimeout(() => setAccountUpdateSuccess(false), 3000);
    addLog({ success: true, message: "Admin account settings updated.", timestamp: new Date().toLocaleTimeString() });
  };

  const handleSaveMissionToCloud = async () => {
    const newMission = { text: missionInput, lastUpdated: new Date().toISOString() };
    onSaveMission(newMission);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleAddNewEvent = () => {
    const now = new Date();
    setEditingEvent({
      title: '',
      description: '',
      eventDate: now.toISOString().slice(0, 10),
      timeStart: '',
      timeEnd: '',
      location: 'Dollar',
      tag: 'Dollar',
      isRecurring: false,
      recurrence: 'None',
      weekOfMonth: 1
    });
    setShowEventForm(true);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    const weekOfMonth = Math.ceil(date.getDate() / 7) as 1 | 2 | 3 | 4 | 5;
    setEditingEvent({
      title: '',
      description: '',
      eventDate: dateStr,
      timeStart: '',
      timeEnd: '',
      location: 'Dollar',
      tag: 'Dollar',
      isRecurring: false,
      recurrence: 'None',
      weekOfMonth: weekOfMonth > 4 ? 5 : weekOfMonth as 1 | 2 | 3 | 4 | 5
    });
    setShowEventForm(true);
  };

  const handleEditEvent = (event: ChurchEvent) => {
    const extractTime = (iso?: string) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toTimeString().slice(0, 5); 
      } catch { return ''; }
    };
    setEditingEvent({
      ...event,
      timeStart: extractTime(event.startTime),
      timeEnd: extractTime(event.endTime),
      recurrenceEndDate: event.recurrenceEndDate ? new Date(event.recurrenceEndDate).toISOString().slice(0, 10) : undefined,
      weekOfMonth: event.weekOfMonth || 1
    });
    setShowEventForm(true);
  };

  const handleSaveEventForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title || !editingEvent?.eventDate) return;
    try {
      const { eventDate, timeStart, timeEnd, isRecurring, recurrenceEndDate, weekOfMonth: userWeekOfMonth } = editingEvent;
      const constructISO = (dateStr: string, timeStr?: string) => {
        if (!timeStr) return new Date(dateStr).toISOString();
        return new Date(`${dateStr}T${timeStr}:00`).toISOString();
      };
      const startTimeISO = timeStart ? constructISO(eventDate, timeStart) : undefined;
      const endTimeISO = timeEnd ? constructISO(eventDate, timeEnd) : undefined;
      const dateObj = new Date(eventDate);
      const dayOfWeek = dateObj.getDay();
      const detectedWeekOfMonth = Math.ceil(dateObj.getDate() / 7) as 1 | 2 | 3 | 4 | 5;
      const event: ChurchEvent = {
        title: editingEvent.title || '',
        description: editingEvent.description || '',
        eventDate: eventDate,
        startTime: startTimeISO,
        endTime: endTimeISO,
        location: editingEvent.location || 'Dollar',
        tag: editingEvent.tag || 'Dollar',
        isRecurring: !!isRecurring,
        recurrence: editingEvent.recurrence || 'None',
        id: editingEvent.id || Math.random().toString(36).substr(2, 9),
        recurrenceEndDate: (isRecurring && recurrenceEndDate) ? new Date(recurrenceEndDate).toISOString() : undefined,
        dayOfWeek: isRecurring ? dayOfWeek : undefined,
        weekOfMonth: isRecurring ? (userWeekOfMonth || detectedWeekOfMonth) : undefined
      };
      onSaveEvent(event);
      setShowEventForm(false);
      setEditingEvent(null);
      addLog({ success: true, message: `Event '${event.title}' saved locally.`, timestamp: new Date().toLocaleTimeString() });
    } catch (err: any) {
      alert("Error saving event.");
    }
  };

  const handleAddNewGroup = () => {
    setEditingGroup({ name: '', description: '', church: 'Dollar', meetingTime: '', contactPerson: '' });
    setShowGroupForm(true);
  };

  const handleEditGroup = (group: ChurchGroup) => {
    setEditingGroup(group);
    setShowGroupForm(true);
  };

  const handleSaveGroupForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup?.name) return;
    const group: ChurchGroup = { ...editingGroup as ChurchGroup, id: editingGroup.id || Math.random().toString(36).substr(2, 9) };
    onSaveGroup(group);
    setShowGroupForm(false);
    setEditingGroup(null);
  };

  const handleAddNewContact = () => {
    setEditingContact({ name: '', title: '', role: '', password: '', email: '', phone: '', imageUrl: '', displayPublicly: true });
    setShowContactForm(true);
  };

  const handleEditContact = (contact: ChurchContact) => {
    setEditingContact(contact);
    setShowContactForm(true);
  };

  const handleSaveContactForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact?.name) return;
    const contact: ChurchContact = { ...editingContact as ChurchContact, id: editingContact.id || Math.random().toString(36).substr(2, 9) };
    onSaveContact(contact);
    setShowContactForm(false);
    setEditingContact(null);
  };

  const handleContactFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditingContact(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "w-full p-4 border border-slate-200 rounded-2xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400";

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold font-serif">Admin Dashboard</h1>
           <p className="text-xs text-slate-400 mt-1">Managed East Hillfoots Unified Parish</p>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold transition-all text-sm"><LogOut className="w-4 h-4" /> Sign Out</button>
           <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg flex items-center space-x-2 border border-indigo-200 shadow-sm"><ShieldCheck className="w-5 h-5" /><span className="font-bold text-sm">Authenticated</span></div>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-fit overflow-x-auto shadow-inner">
        {['events','groups','contacts','subscribers','feedback','mission','system','account'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Unified Parish Calendar</h2>
            <div className="flex gap-2">
              <button onClick={() => handlePullSection('events', onBulkUpdateEvents)} disabled={isPulling} className="bg-slate-100 p-2.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-xs font-bold">{isPulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />} Cloud Pull</button>
              <button onClick={handleAddNewEvent} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100"><Plus className="w-4 h-4" /> Add Event</button>
            </div>
          </div>
          <Calendar events={events} onEdit={handleEditEvent} onDelete={onDeleteEvent} onEventClick={handleEditEvent} onDateClick={handleDateClick} />
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Parish Groups</h2>
            <div className="flex gap-2">
              <button onClick={() => handlePullSection('groups', onBulkUpdateGroups)} disabled={isPulling} className="bg-slate-100 p-2.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-xs font-bold">{isPulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />} Cloud Pull</button>
              <button onClick={handleAddNewGroup} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus className="w-4 h-4" /> Add Group</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group.id} className="bg-white p-6 rounded-2xl border shadow-sm group hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Users className="w-6 h-6" /></div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditGroup(group)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteGroup(group.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2">{group.name}</h3>
                <p className="text-slate-500 text-sm mb-6 flex-grow line-clamp-3">{group.description}</p>
                <div className="space-y-3 pt-6 border-t border-slate-50">
                  <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest"><Church className="w-3.5 h-3.5 mr-2 text-indigo-400" /> {group.church}</div>
                  <div className="flex items-center text-xs font-medium text-slate-500"><Clock className="w-3.5 h-3.5 mr-2 text-slate-400" /> {group.meetingTime}</div>
                  <div className="flex items-center text-xs font-medium text-slate-500"><UserCircle className="w-3.5 h-3.5 mr-2 text-slate-400" /> {group.contactPerson}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Parish Contacts</h2>
              <div className="flex gap-2">
                 <button onClick={handleAddNewContact} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700"><Plus className="w-4 h-4" /> Add Contact</button>
                 <button onClick={() => handlePullSection('contacts', onBulkUpdateContacts)} className="bg-slate-100 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200"><CloudDownload className="w-4 h-4" /> Pull Contacts</button>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {contacts.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-2xl border text-center space-y-4 hover:shadow-md transition-all group">
                   <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 font-bold overflow-hidden border">
                     {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" /> : (c.name || '?')[0]}
                   </div>
                   <div className="space-y-1">
                      <h3 className="font-bold truncate px-2 text-slate-800">{c.name}</h3>
                      <div className="flex flex-wrap justify-center gap-1 px-1">
                        {c.title && <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase truncate max-w-full">{c.title}</span>}
                        {c.role && <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase truncate max-w-full">{c.role}</span>}
                      </div>
                   </div>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditContact(c)} className="flex-1 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold border border-indigo-100">Edit</button>
                      <button onClick={() => onDeleteContact(c.id)} className="flex-1 py-2 text-red-400 hover:bg-red-50 rounded-lg text-xs font-bold border border-red-100">Remove</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Subscribers</h2>
              <button onClick={() => handlePullSection('subscriber', onUpdateSubscribers)} disabled={isPulling} className="bg-slate-100 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200"><CloudDownload className="w-4 h-4" /> Pull Subscribers</button>
           </div>
           <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 border-b text-[10px] font-bold uppercase text-slate-400">
                    <tr>
                       <th className="p-4">Name</th>
                       <th className="p-4">Email</th>
                       <th className="p-4">Joined</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y">
                    {subscribers.map(s => (
                      <tr key={s.id}>
                         <td className="p-4 font-bold">{s.name}</td>
                         <td className="p-4">{s.email}</td>
                         <td className="p-4 text-xs text-slate-400">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Feedback</h2>
              <button onClick={() => handlePullSection('feedback', onUpdateFeedback)} disabled={isPulling} className="bg-slate-100 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200"><CloudDownload className="w-4 h-4" /> Pull Feedback</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {feedback.map(f => (
                <div key={f.id} className="bg-white p-6 rounded-2xl border shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">{f.foundLooking}</span>
                      <span className="text-[10px] text-slate-400">{new Date(f.submittedAt).toLocaleDateString()}</span>
                   </div>
                   <p className="text-sm font-bold mb-1">To Improve:</p>
                   <p className="text-sm text-slate-600 mb-4 italic">"{f.improveWebsite}"</p>
                   <p className="text-sm font-bold mb-1">Add/Remove:</p>
                   <p className="text-sm text-slate-600">"{f.addRemove}"</p>
                   <div className="mt-4 pt-4 border-t text-[10px] text-slate-400">Page: {f.pagePath}</div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'mission' && (
        <div className="space-y-6 max-w-4xl mx-auto">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Parish Mission Statement</h2>
              <button onClick={() => handlePullSection('mission', (data) => onSaveMission(data[data.length-1]))} className="bg-slate-100 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200"><CloudDownload className="w-4 h-4" /> Pull Cloud</button>
           </div>
           <div className="bg-white p-10 rounded-[2.5rem] border shadow-xl space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1">Current Mission</label>
                 <textarea value={missionInput} onChange={(e) => setMissionInput(e.target.value)} className="w-full p-8 border rounded-3xl bg-slate-50 font-serif text-2xl leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[180px] text-slate-900" placeholder="Unified Parish Mission..." />
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
                 <button onClick={handleRefineMission} disabled={isRefining || !missionInput} className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-6 py-3 rounded-2xl transition-all disabled:opacity-50">{isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} AI Refine</button>
                 <button onClick={handleSaveMissionToCloud} className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2">{showSavedToast ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />} {showSavedToast ? 'Synced!' : 'Save Mission'}</button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-8">
           <div className="bg-indigo-600 p-10 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-indigo-100">
              <div className="space-y-2">
                 <h3 className="text-2xl font-bold flex items-center gap-3"><RefreshCw className={`w-7 h-7 ${isSyncing ? 'animate-spin' : ''}`} /> Global Cloud Sync</h3>
                 <p className="text-indigo-100 opacity-80 text-sm">Synchronize all parish tables with your connected Google Spreadsheet.</p>
              </div>
              <button onClick={() => onRefreshAll()} disabled={isSyncing} className="bg-white text-indigo-600 px-10 py-5 rounded-[1.5rem] font-bold shadow-xl hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50">
                {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <CloudDownload className="w-6 h-6" />}
                Pull Everything
              </button>
           </div>
           <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
              <h3 className="text-xl font-bold">Recent Sync Activity</h3>
              <div className="space-y-2 h-[300px] overflow-y-auto">
                {syncLogs.map((log, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-xs ${log.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <strong>{log.timestamp}:</strong> {log.message}
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
