
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Trash2, Edit3, Save, X, Sparkles, Calendar as CalendarIcon, Users, Target, 
  ShieldCheck, Database, Copy, RefreshCw, 
  Link, CheckCircle2, Info,
  Code2, Loader2, Check, CloudDownload, CalendarDays, ExternalLink, AlertTriangle,
  Activity, Mail, Download, Camera, LogOut, UserCircle, Key, Clock, MapPin, Tag, Repeat,
  Church, MessageSquare, ThumbsUp, ThumbsDown, HelpCircle, CalendarDays as CalendarIcon2,
  FileText, ListFilter, PieChart, FileSpreadsheet, ChevronRight, Library, Paperclip, FileJson,
  Eye, EyeOff, Shield, Inbox, Phone, MessageCircle, Send
} from 'lucide-react';
import { ChurchEvent, ChurchGroup, MissionStatement, ChurchContact, Subscriber, ChurchLocation, RecurrenceType, Feedback, KnowledgeEntry, UserRole, ContactRequest } from '../types';
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
import { format, addMonths, endOfMonth, startOfDay, isBefore } from 'date-fns';
import { expandEvents, EventInstance } from '../utils/eventUtils';

interface AdminDashboardProps {
  events: ChurchEvent[];
  groups: ChurchGroup[];
  contacts: ChurchContact[];
  subscribers: Subscriber[];
  requests: ContactRequest[];
  feedback: Feedback[];
  knowledge: KnowledgeEntry[];
  mission: MissionStatement;
  googleSheetsUrl: string;
  isSyncing: boolean;
  onSaveEvent: (event: ChurchEvent) => void;
  onDeleteEvent: (id: string) => void;
  onSaveGroup: (group: ChurchGroup) => void;
  onDeleteGroup: (id: string) => void;
  onSaveContact: (contact: ChurchContact) => void;
  onDeleteContact: (id: string) => void;
  onSaveKnowledge: (entry: KnowledgeEntry) => void;
  onDeleteKnowledge: (id: string) => void;
  onSaveMission: (mission: MissionStatement) => void;
  onUpdateSubscribers: (subscribers: Subscriber[]) => void;
  onUpdateRequests: (requests: ContactRequest[]) => void;
  onUpdateFeedback: (feedback: Feedback[]) => void;
  onUpdateSheetsUrl: (url: string) => void;
  onBulkUpdateEvents: (events: ChurchEvent[]) => void;
  onBulkUpdateGroups: (groups: ChurchGroup[]) => void;
  onBulkUpdateContacts: (contacts: ChurchContact[]) => void;
  onBulkUpdateKnowledge: (knowledge: KnowledgeEntry[]) => void;
  onRefreshAll: () => Promise<void>;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events, groups, contacts, subscribers, requests, feedback, knowledge, mission, googleSheetsUrl, isSyncing,
  onSaveEvent, onDeleteEvent, onSaveGroup, onDeleteGroup, onSaveContact, onDeleteContact,
  onSaveKnowledge, onDeleteKnowledge, onSaveMission, onUpdateSubscribers, onUpdateRequests, onUpdateFeedback, onUpdateSheetsUrl,
  onBulkUpdateEvents, onBulkUpdateGroups, onBulkUpdateContacts, onBulkUpdateKnowledge, onRefreshAll, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'groups' | 'knowledge' | 'contacts' | 'requests' | 'subscribers' | 'feedback' | 'mission' | 'system' | 'account'>('events');
  const [isPulling, setIsPulling] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncResult[]>([]);
  const [urlInput, setUrlInput] = useState(googleSheetsUrl);
  const [pingLoading, setPingLoading] = useState(false);
  
  const [missionInput, setMissionInput] = useState(mission.text);

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<ChurchEvent> & { timeStart?: string; timeEnd?: string } | null>(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Partial<ChurchGroup> | null>(null);

  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<ChurchContact> | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<Partial<KnowledgeEntry> | null>(null);

  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => { setUrlInput(googleSheetsUrl); }, [googleSheetsUrl]);
  useEffect(() => { setMissionInput(mission.text); }, [mission.text]);
  
  useEffect(() => {
    const creds = JSON.parse(localStorage.getItem('admin_account_credentials') || '{"email":"admin@easthillfoots.org","password":"password123"}');
    setAdminEmail(creds.email);
  }, []);

  const addLog = (res: SyncResult) => setSyncLogs(prev => [res, ...prev].slice(0, 10));

  const handlePullSection = async (sheetName: string, updateFn: (data: any[]) => void) => {
    if (!googleSheetsUrl) return alert("Configure URL in System tab first");
    setIsPulling(true);
    try {
      const data = await fetchSheetData(googleSheetsUrl, sheetName);
      if (data && data.length > 0) {
        addLog({ success: true, message: `Successfully pulled items from ${sheetName}.`, timestamp: new Date().toLocaleTimeString() });
        onRefreshAll();
      } else {
        addLog({ success: false, message: `No data found in cloud for ${sheetName}.`, timestamp: new Date().toLocaleTimeString() });
      }
    } catch (err: any) {
      addLog({ success: false, message: `Pull failed: ${err.message}`, timestamp: new Date().toLocaleTimeString() });
    } finally {
      setIsPulling(false);
    }
  };

  const handlePingSync = async () => {
    if (!googleSheetsUrl) return alert("Configure URL in System tab first");
    setPingLoading(true);
    const result = await syncEntryToSheet(googleSheetsUrl, 'requests', {
      name: 'System Ping',
      message: 'This is a test message to verify the requests sheet connection.',
      subject: 'Test Ping',
      email: 'system@easthillfoots.org',
      submittedAt: new Date().toISOString()
    });
    addLog(result);
    setPingLoading(false);
    if (result.success) {
      alert("Ping dispatched! Check your spreadsheet 'requests' sheet.");
    }
  };

  const handleAddNewEvent = () => {
    setEditingEvent({
      title: '',
      description: '',
      eventDate: new Date().toISOString().slice(0, 10),
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
    const event: ChurchEvent = {
      ...editingEvent as ChurchEvent,
      id: editingEvent.id || Math.random().toString(36).substr(2, 9),
      startTime: editingEvent.timeStart ? new Date(`${editingEvent.eventDate}T${editingEvent.timeStart}:00`).toISOString() : undefined,
      endTime: editingEvent.timeEnd ? new Date(`${editingEvent.eventDate}T${editingEvent.timeEnd}:00`).toISOString() : undefined,
    };
    onSaveEvent(event);
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleAddNewKnowledge = () => {
    setEditingKnowledge({ title: '', content: '', attachmentUrl: '', attachmentName: '' });
    setShowKnowledgeForm(true);
  };

  const handleEditKnowledge = (entry: KnowledgeEntry) => {
    setEditingKnowledge(entry);
    setShowKnowledgeForm(true);
  };

  const handleSaveKnowledgeForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKnowledge?.title || !editingKnowledge?.content) return;
    const entry: KnowledgeEntry = {
      ...editingKnowledge as KnowledgeEntry,
      id: editingKnowledge.id || Math.random().toString(36).substr(2, 9),
      lastUpdated: new Date().toISOString()
    };
    onSaveKnowledge(entry);
    setShowKnowledgeForm(false);
    setEditingKnowledge(null);
  };

  const handleAddNewGroup = () => {
    setEditingGroup({ name: '', description: '', church: 'Dollar', meetingTime: '', contactPerson: '' });
    setShowGroupForm(true);
  };

  const handleEditGroup = (group: ChurchGroup) => {
    setEditingGroup({ ...group });
    setShowGroupForm(true);
  };

  const handleSaveGroupForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup?.name) return;
    const group: ChurchGroup = { 
      ...editingGroup as ChurchGroup, 
      id: editingGroup.id || Math.random().toString(36).substr(2, 9)
    };
    onSaveGroup(group);
    setShowGroupForm(false);
    setEditingGroup(null);
  };

  const handleAddNewContact = () => {
    setEditingContact({ name: '', title: CONTACT_TITLES[0], role: UserRole.GENERAL, password: '', email: '', phone: '', imageUrl: '', displayPublicly: true });
    setShowContactForm(true);
    setShowPassword(false);
  };

  const handleEditContact = (contact: ChurchContact) => {
    setEditingContact(contact);
    setShowContactForm(true);
    setShowPassword(false);
  };

  const handleSaveContactForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact?.name) return;
    const contact: ChurchContact = { 
      ...editingContact as ChurchContact, 
      id: editingContact.id || Math.random().toString(36).substr(2, 9) 
    };
    onSaveContact(contact);
    setShowContactForm(false);
    setEditingContact(null);
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

      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl w-fit overflow-x-auto shadow-inner max-w-full">
        {['events','groups','knowledge','contacts','requests','subscribers','feedback','mission','system','account'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
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
          <Calendar events={events} onEdit={handleEditEvent} onDelete={onDeleteEvent} onEventClick={handleEditEvent} onDateClick={(date) => {
             setEditingEvent({ eventDate: date.toISOString().slice(0, 10), title: '', description: '', location: 'Dollar', tag: 'Dollar', isRecurring: false });
             setShowEventForm(true);
          }} />
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
               <h2 className="text-xl font-bold">Knowledge Database</h2>
               <p className="text-xs text-slate-400">Entries here directly inform the Parish Chatbot Assistant.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePullSection('knowledge', onBulkUpdateKnowledge)} disabled={isPulling} className="bg-slate-100 p-2.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-xs font-bold">{isPulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />} Cloud Pull</button>
              <button onClick={handleAddNewKnowledge} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-100"><Plus className="w-4 h-4" /> Add Knowledge</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledge.map(entry => (
              <div key={entry.id} className="bg-white p-6 rounded-2xl border shadow-sm group hover:shadow-md transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Library className="w-6 h-6" /></div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditKnowledge(entry)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDeleteKnowledge(entry.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-600 transition-colors">{entry.title}</h3>
                <p className="text-slate-500 text-sm mb-6 flex-grow line-clamp-4">{entry.content}</p>
                <div className="flex items-center justify-between pt-4 border-t text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-3" /> Updated {format(new Date(entry.lastUpdated), 'MMM d, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <div className="space-y-1">
                 <h2 className="text-xl font-bold">Contact Inquiries</h2>
                 <p className="text-xs text-slate-400">Recent messages submitted via the 'Contact Us' button.</p>
              </div>
              <div className="flex gap-2">
                 <button 
                    onClick={handlePingSync} 
                    disabled={pingLoading} 
                    className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2 text-xs font-bold border border-indigo-100"
                 >
                    {pingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
                    Test Ping
                 </button>
                 <button 
                    onClick={() => handlePullSection('requests', onUpdateRequests)} 
                    disabled={isPulling} 
                    className="bg-slate-100 p-2.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2 text-xs font-bold"
                 >
                    {isPulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />} 
                    Sync from Cloud
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              {requests.sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(req => (
                <div key={req.id} className="bg-white p-6 rounded-2xl border shadow-sm border-l-4 border-l-indigo-600">
                   <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest">{req.subject}</span>
                            <span className="text-[10px] text-slate-400">{format(new Date(req.submittedAt), 'MMM d, yyyy HH:mm')}</span>
                         </div>
                         <h3 className="font-bold text-lg text-slate-800">{req.name}</h3>
                         <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <a href={`mailto:${req.email}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"><Mail className="w-3.5 h-3.5" /> {req.email}</a>
                            {req.phone && <a href={`tel:${req.phone}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"><Phone className="w-3.5 h-3.5" /> {req.phone}</a>}
                         </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl flex-1 border border-slate-100">
                         <p className="text-sm text-slate-700 italic leading-relaxed">"{req.message}"</p>
                      </div>
                   </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed">
                   <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                   <p className="text-slate-400 italic">No inquiries found in the 'requests' table.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Parish Contacts & Admin Users</h2>
              <div className="flex gap-2">
                 <button onClick={handleAddNewContact} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700"><Plus className="w-4 h-4" /> Add Contact</button>
                 <button onClick={() => handlePullSection('contacts', onBulkUpdateContacts)} className="bg-slate-100 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-200"><CloudDownload className="w-4 h-4" /> Pull Contacts</button>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {contacts.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-2xl border text-center space-y-4 hover:shadow-md transition-all group relative">
                   <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 font-bold overflow-hidden border">
                     {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" /> : (c.name || '?')[0]}
                   </div>
                   {c.role === UserRole.ADMIN && (
                     <div className="absolute top-2 left-2 bg-indigo-600 text-white p-1 rounded-full shadow-sm" title="System Admin">
                       <Shield className="w-3 h-3" />
                     </div>
                   )}
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

      {showContactForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="text-2xl font-bold font-serif">{editingContact?.id ? 'Edit Contact' : 'New Contact Profile'}</h3>
                 <button onClick={() => setShowContactForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveContactForm} className="p-8 space-y-6 overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Identification Section */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b pb-2">Identity & Image</h4>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                         <input type="text" placeholder="e.g. Rev. John Smith" className={inputClasses} value={editingContact?.name || ''} onChange={e => setEditingContact({...editingContact, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Parish Title</label>
                         <select className={inputClasses} value={editingContact?.title || ''} onChange={e => setEditingContact({...editingContact, title: e.target.value})}>
                            {CONTACT_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Profile Image URL (Optional)</label>
                         <input type="text" placeholder="https://..." className={inputClasses} value={editingContact?.imageUrl || ''} onChange={e => setEditingContact({...editingContact, imageUrl: e.target.value})} />
                      </div>
                    </div>

                    {/* Contact Info Section */}
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b pb-2">Communication</h4>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
                          <input type="email" placeholder="email@easthillfoots.org" className={inputClasses} value={editingContact?.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Phone Number</label>
                          <input type="tel" placeholder="01234 567890" className={inputClasses} value={editingContact?.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                       </div>
                       <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Public on Website</label>
                          <button 
                            type="button"
                            onClick={() => setEditingContact({...editingContact, displayPublicly: !editingContact?.displayPublicly})}
                            className={`w-12 h-6 rounded-full transition-all relative ${editingContact?.displayPublicly ? 'bg-indigo-600' : 'bg-slate-300'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingContact?.displayPublicly ? 'left-7' : 'left-1'}`} />
                          </button>
                       </div>
                    </div>
                 </div>

                 {/* Security & Roles Section */}
                 <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-6 shadow-xl">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest border-b border-white/10 pb-2">System Access & Roles</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-indigo-200 uppercase ml-1">Access Role</label>
                          <select 
                            className="w-full p-4 bg-white/10 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={editingContact?.role || UserRole.GENERAL}
                            onChange={e => setEditingContact({...editingContact, role: e.target.value as UserRole})}
                          >
                             {Object.values(UserRole).map(r => <option key={r} value={r} className="text-slate-900">{r}</option>)}
                          </select>
                          <p className="text-[9px] text-indigo-200/60 ml-1 italic">"Admin" role allows dashboard access.</p>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-indigo-200 uppercase ml-1">Account Password</label>
                          <div className="relative">
                             <input 
                                type={showPassword ? "text" : "password"} 
                                placeholder="Enter secure password" 
                                className="w-full p-4 pl-4 pr-12 bg-white/10 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                value={editingContact?.password || ''}
                                onChange={e => setEditingContact({...editingContact, password: e.target.value})}
                             />
                             <button 
                               type="button"
                               onClick={() => setShowPassword(!showPassword)}
                               className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white transition-colors"
                             >
                               {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                             </button>
                          </div>
                          <p className="text-[9px] text-indigo-200/60 ml-1 italic">Required for any user with Admin access.</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowContactForm(false)} className="flex-1 py-4 text-slate-500 font-bold border rounded-2xl hover:bg-slate-50 transition-colors">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                     <Save className="w-5 h-5" />
                     Save Profile
                   </button>
                 </div>
              </form>
           </div>
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
                <div className="space-y-3 pt-6 border-t border-slate-50 text-xs text-slate-500">
                  <div className="flex items-center"><Church className="w-3.5 h-3.5 mr-2 text-indigo-400" /> {group.church}</div>
                  <div className="flex items-center"><Clock className="w-3.5 h-3.5 mr-2 text-slate-400" /> {group.meetingTime}</div>
                  <div className="flex items-center"><UserCircle className="w-3.5 h-3.5 mr-2 text-slate-400" /> {group.contactPerson}</div>
                </div>
              </div>
            ))}
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
                {syncLogs.length > 0 ? syncLogs.map((log, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-xs ${log.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <strong>{log.timestamp}:</strong> {log.message}
                  </div>
                )) : <p className="text-slate-400 text-sm italic">No recent activity.</p>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
