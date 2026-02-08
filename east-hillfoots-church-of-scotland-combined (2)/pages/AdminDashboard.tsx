
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Trash2, Edit3, Save, X, Sparkles, Calendar as CalendarIcon, Users, Target, 
  ShieldCheck, Database, Copy, RefreshCw, 
  Link, CheckCircle2, Info,
  Code2, Loader2, Check, CloudDownload, CalendarDays, ExternalLink, AlertTriangle,
  Activity, Mail, Download, Camera, LogOut, UserCircle, Key, Clock, MapPin, Tag, Repeat,
  Church, MessageSquare, ThumbsUp, ThumbsDown, HelpCircle, CalendarDays as CalendarIcon2,
  FileText, ListFilter, PieChart, FileSpreadsheet, ChevronRight, Library, Paperclip, FileJson
} from 'lucide-react';
import { ChurchEvent, ChurchGroup, MissionStatement, ChurchContact, Subscriber, ChurchLocation, RecurrenceType, Feedback, KnowledgeEntry } from '../types';
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
  events, groups, contacts, subscribers, feedback, knowledge, mission, googleSheetsUrl, isSyncing,
  onSaveEvent, onDeleteEvent, onSaveGroup, onDeleteGroup, onSaveContact, onDeleteContact,
  onSaveKnowledge, onDeleteKnowledge, onSaveMission, onUpdateSubscribers, onUpdateFeedback, onUpdateSheetsUrl,
  onBulkUpdateEvents, onBulkUpdateGroups, onBulkUpdateContacts, onBulkUpdateKnowledge, onRefreshAll, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'groups' | 'contacts' | 'subscribers' | 'feedback' | 'mission' | 'knowledge' | 'reports' | 'system' | 'account'>('events');
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

  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<Partial<KnowledgeEntry> | null>(null);

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

  const reportData = useMemo(() => {
    const today = startOfDay(new Date());
    const nextMonthEnd = endOfMonth(addMonths(today, 1));
    const instances = expandEvents(events, today, nextMonthEnd);
    return {
      instances: instances.sort((a, b) => a.instanceStart.getTime() - b.instanceStart.getTime()),
      rangeStart: today,
      rangeEnd: nextMonthEnd
    };
  }, [events]);

  const handleDownloadCSV = () => {
    const headers = ["Title", "Date", "Start Time", "End Time", "Location", "Tag", "Description"];
    const rows = reportData.instances.map(inst => [
      `"${inst.title.replace(/"/g, '""')}"`,
      format(inst.instanceStart, 'yyyy-MM-dd'),
      format(inst.instanceStart, 'HH:mm'),
      inst.instanceEnd ? format(inst.instanceEnd, 'HH:mm') : '',
      inst.location,
      inst.tag,
      `"${(inst.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Parish_Events_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePullSection = async (sheetName: string, updateFn: (data: any[]) => void) => {
    if (!googleSheetsUrl) return alert("Configure URL in System tab first");
    setIsPulling(true);
    try {
      const data = await fetchSheetData(googleSheetsUrl, sheetName);
      if (data && data.length > 0) {
        addLog({ success: true, message: `Successfully pulled items from ${sheetName}.`, timestamp: new Date().toLocaleTimeString() });
        onRefreshAll(); // Refresh local states via shared refresh
      } else {
        addLog({ success: false, message: `No data found in cloud for ${sheetName}.`, timestamp: new Date().toLocaleTimeString() });
      }
    } catch (err: any) {
      addLog({ success: false, message: `Pull failed: ${err.message}`, timestamp: new Date().toLocaleTimeString() });
    } finally {
      setIsPulling(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingKnowledge(prev => ({
        ...prev,
        attachmentUrl: reader.result as string,
        attachmentName: file.name
      }));
    };
    reader.readAsDataURL(file);
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
        {['events','groups','knowledge','contacts','subscribers','feedback','mission','reports','system','account'].map(tab => (
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
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated {format(new Date(entry.lastUpdated), 'MMM d, yyyy')}</span>
                  {entry.attachmentName && <span className="flex items-center gap-1 text-indigo-500 font-bold"><Paperclip className="w-3 h-3" /> Attachment</span>}
                </div>
              </div>
            ))}
            {knowledge.length === 0 && (
               <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                  <Library className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Your knowledge base is currently empty.</p>
                  <button onClick={handleAddNewKnowledge} className="mt-4 text-indigo-600 font-bold hover:underline">Create your first entry</button>
               </div>
            )}
          </div>
        </div>
      )}

      {showKnowledgeForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="text-2xl font-bold font-serif">{editingKnowledge?.id ? 'Edit Knowledge Entry' : 'New Knowledge Entry'}</h3>
                 <button onClick={() => setShowKnowledgeForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveKnowledgeForm} className="p-8 space-y-6 overflow-y-auto">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Entry Title</label>
                    <input type="text" placeholder="e.g. History of Muckhart Church" className={inputClasses} value={editingKnowledge?.title || ''} onChange={e => setEditingKnowledge({...editingKnowledge, title: e.target.value})} />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description / Content</label>
                    <textarea 
                      placeholder="Enter the full knowledge content here. This text will be used by the Parish Assistant AI to answer queries." 
                      className={`${inputClasses} min-h-[300px] leading-relaxed`} 
                      value={editingKnowledge?.content || ''} 
                      onChange={e => setEditingKnowledge({...editingKnowledge, content: e.target.value})} 
                    />
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Attachment (Optional)</label>
                    <div className="flex items-center gap-4 p-6 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                       <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-500">
                          {editingKnowledge?.attachmentName ? <FileText className="w-6 h-6" /> : <Paperclip className="w-6 h-6" />}
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-bold text-slate-700">{editingKnowledge?.attachmentName || 'No file selected'}</p>
                          <p className="text-xs text-slate-400">PDF, JPG, or PNG (Max 5MB)</p>
                       </div>
                       <label className="cursor-pointer bg-white border px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                          {editingKnowledge?.attachmentName ? 'Change' : 'Upload File'}
                          <input type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,image/*" />
                       </label>
                       {editingKnowledge?.attachmentName && (
                          <button type="button" onClick={() => setEditingKnowledge({...editingKnowledge, attachmentUrl: '', attachmentName: ''})} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       )}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4 border-t">
                   <button type="button" onClick={() => setShowKnowledgeForm(false)} className="flex-1 py-4 text-slate-500 font-bold border rounded-2xl hover:bg-slate-50 transition-colors">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                     <Save className="w-5 h-5" />
                     Save Entry
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

      {showEventForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="text-2xl font-bold font-serif">{editingEvent?.id ? 'Edit Parish Event' : 'Create New Parish Event'}</h3>
                 <button onClick={() => setShowEventForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveEventForm} className="overflow-y-auto p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Basic Info</label>
                  <input type="text" placeholder="Event Title" className={inputClasses} value={editingEvent?.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} />
                  <textarea 
                    placeholder="Description" 
                    className={`${inputClasses} min-h-[160px]`} 
                    value={editingEvent?.description || ''} 
                    onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Event Date</label>
                      <input type="date" className={inputClasses} value={editingEvent?.eventDate || ''} onChange={e => setEditingEvent({...editingEvent, eventDate: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Time (Start - End)</label>
                      <div className="flex gap-2">
                         <input type="time" className={inputClasses} value={editingEvent?.timeStart || ''} onChange={e => setEditingEvent({...editingEvent, timeStart: e.target.value})} />
                         <input type="time" className={inputClasses} value={editingEvent?.timeEnd || ''} onChange={e => setEditingEvent({...editingEvent, timeEnd: e.target.value})} />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Recurrence</label>
                        <button 
                          type="button"
                          onClick={() => {
                            const nextState = !editingEvent?.isRecurring;
                            setEditingEvent({
                              ...editingEvent, 
                              isRecurring: nextState,
                              recurrence: nextState ? (editingEvent?.recurrence && editingEvent?.recurrence !== 'None' ? editingEvent.recurrence : 'Weekly') : 'None'
                            });
                          }}
                          className={`w-12 h-6 rounded-full transition-all relative ${editingEvent?.isRecurring ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingEvent?.isRecurring ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      
                      {editingEvent?.isRecurring && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                           <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Frequency</label>
                              <select 
                                className={`${inputClasses} py-2`} 
                                value={editingEvent?.recurrence || 'Weekly'} 
                                onChange={e => setEditingEvent({...editingEvent, recurrence: e.target.value as RecurrenceType})}
                              >
                                <option value="Weekly">Weekly</option>
                                <option value="BiWeekly">Bi-Weekly</option>
                                <option value="MonthlyRelative">Monthly (Relative to date)</option>
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">End Date</label>
                              <input 
                                type="date" 
                                className={`${inputClasses} py-2`} 
                                value={editingEvent?.recurrenceEndDate || ''} 
                                onChange={e => setEditingEvent({...editingEvent, recurrenceEndDate: e.target.value})} 
                              />
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Classification</label>
                      <div className="space-y-4">
                         <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Location</label>
                            <select 
                              className={`${inputClasses} py-2`} 
                              value={editingEvent?.location || 'Dollar'} 
                              onChange={e => setEditingEvent({...editingEvent, location: e.target.value as ChurchLocation})}
                            >
                              <option value="Dollar">Dollar</option>
                              <option value="Muckhart">Muckhart</option>
                              <option value="Both">Both</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Filter Tag</label>
                            <select 
                              className={`${inputClasses} py-2`} 
                              value={editingEvent?.tag || 'Dollar'} 
                              onChange={e => setEditingEvent({...editingEvent, tag: e.target.value as any})}
                            >
                              <option value="Dollar">Dollar</option>
                              <option value="Muckhart">Muckhart</option>
                              <option value="All">All Churches</option>
                            </select>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <button type="button" onClick={() => setShowEventForm(false)} className="flex-1 py-4 text-slate-500 font-bold border rounded-2xl hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    Save Event
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

      {showGroupForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="text-2xl font-bold font-serif">{editingGroup?.id ? 'Edit Group Profile' : 'New Group Profile'}</h3>
                 <button onClick={() => setShowGroupForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveGroupForm} className="p-8 space-y-6 overflow-y-auto">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Group Details</label>
                    <input type="text" placeholder="Group Name" className={inputClasses} value={editingGroup?.name || ''} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} />
                    <textarea placeholder="Description" className={inputClasses} value={editingGroup?.description || ''} onChange={e => setEditingGroup({...editingGroup, description: e.target.value})} />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Parish Branch</label>
                       <select 
                         className={inputClasses} 
                         value={editingGroup?.church || 'Dollar'} 
                         onChange={e => setEditingGroup({...editingGroup, church: e.target.value as any})}
                       >
                         <option value="Dollar">Dollar</option>
                         <option value="Muckhart">Muckhart</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Meeting Time</label>
                       <input 
                         type="text" 
                         placeholder="e.g. Mon 10:00 AM" 
                         className={inputClasses} 
                         value={editingGroup?.meetingTime || ''} 
                         onChange={e => setEditingGroup({...editingGroup, meetingTime: e.target.value})} 
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lead Contact Person</label>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="text" 
                        placeholder="Name of contact" 
                        className={`${inputClasses} pl-12`} 
                        value={editingGroup?.contactPerson || ''} 
                        onChange={e => setEditingGroup({...editingGroup, contactPerson: e.target.value})} 
                      />
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowGroupForm(false)} className="flex-1 py-4 text-slate-500 font-bold border rounded-2xl">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl">Save Group</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showContactForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="text-2xl font-bold font-serif">{editingContact?.id ? 'Edit Contact' : 'New Contact Profile'}</h3>
                 <button onClick={() => setShowContactForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-6 h-6 text-slate-500" /></button>
              </div>
              <form onSubmit={handleSaveContactForm} className="p-8 space-y-6 overflow-y-auto">
                 <input type="text" placeholder="Full Name" className={inputClasses} value={editingContact?.name || ''} onChange={e => setEditingContact({...editingContact, name: e.target.value})} />
                 <input type="text" placeholder="Parish Title" className={inputClasses} value={editingContact?.title || ''} onChange={e => setEditingContact({...editingContact, title: e.target.value})} />
                 <input type="email" placeholder="Email Address" className={inputClasses} value={editingContact?.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                 <input type="tel" placeholder="Phone Number" className={inputClasses} value={editingContact?.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                 <div className="flex gap-4">
                   <button type="button" onClick={() => setShowContactForm(false)} className="flex-1 py-4 text-slate-500 font-bold border rounded-2xl">Cancel</button>
                   <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl">Save Profile</button>
                 </div>
              </form>
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
