
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ChurchPage from './pages/ChurchPage';
import EventsPage from './pages/EventsPage';
import ContactsPage from './pages/ContactsPage';
import AdminDashboard from './pages/AdminDashboard';
import Chatbot from './components/Chatbot';
import { UserRole, ChurchEvent, ChurchGroup, MissionStatement, ChurchContact, Subscriber, Feedback, KnowledgeEntry, ContactRequest } from './types';
import { INITIAL_EVENTS, INITIAL_GROUPS, INITIAL_MISSION, INITIAL_CONTACTS, DEFAULT_GOOGLE_SHEETS_URL } from './constants';
import { Shield, Lock, ArrowRight, AlertCircle, RefreshCw, Mail, Key } from 'lucide-react';
// Fix: removed non-existent export syncSubscriberToGoogleSheets as syncEntryToSheet is used instead
import { syncEntryToSheet, fetchSheetData } from './services/googleSheetsService';

const AdminAuthWrapper: React.FC<{ 
  onLoginSuccess: () => void;
  contacts: ChurchContact[];
}> = ({ onLoginSuccess, contacts }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const matchingContact = contacts.find(c => 
      c.email?.toLowerCase() === email.toLowerCase() && 
      c.password === password && 
      c.role === UserRole.ADMIN
    );

    const masterAccount = JSON.parse(localStorage.getItem('admin_account_credentials') || '{"email":"admin@easthillfoots.org","password":"password123"}');
    const isMasterMatch = email.toLowerCase() === masterAccount.email.toLowerCase() && password === masterAccount.password;

    setTimeout(() => {
      if (matchingContact || isMasterMatch) {
        localStorage.setItem('admin_session_active', 'true');
        onLoginSuccess();
      } else {
        setError('Invalid credentials. Access is restricted to designated Parish Admins.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] border shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg shadow-indigo-100 mb-2">
            <Shield className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold font-serif text-slate-900">Admin Login</h2>
          <p className="text-slate-500 text-sm px-4">Access East Hillfoots unified parish management tools.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="email" 
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900" 
                  placeholder="admin@easthillfoots.org" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="password" 
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-slate-900" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-xs font-medium bg-red-50 p-4 rounded-2xl border border-red-100 animate-in shake duration-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => localStorage.getItem('admin_session_active') === 'true');
  const [userRole, setUserRole] = useState<UserRole>(() => isAdminLoggedIn ? UserRole.ADMIN : UserRole.GENERAL);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>(() => {
    return localStorage.getItem('church_google_sheets_url') || DEFAULT_GOOGLE_SHEETS_URL || '';
  });
  
  const [events, setEvents] = useState<ChurchEvent[]>(() => {
    const saved = localStorage.getItem('church_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
  
  const [groups, setGroups] = useState<ChurchGroup[]>(() => {
    const saved = localStorage.getItem('church_groups');
    return saved ? JSON.parse(saved) : INITIAL_GROUPS;
  });
  
  const [contacts, setContacts] = useState<ChurchContact[]>(() => {
    const saved = localStorage.getItem('church_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>(() => {
    const saved = localStorage.getItem('church_knowledge');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    const saved = localStorage.getItem('church_subscribers');
    return saved ? JSON.parse(saved) : [];
  });

  const [requests, setRequests] = useState<ContactRequest[]>(() => {
    const saved = localStorage.getItem('church_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [feedback, setFeedback] = useState<Feedback[]>(() => {
    const saved = localStorage.getItem('church_feedback');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [mission, setMission] = useState<MissionStatement>(() => {
    const saved = localStorage.getItem('church_mission');
    return saved ? JSON.parse(saved) : { text: INITIAL_MISSION, lastUpdated: new Date().toISOString() };
  });

  /**
   * Flexible key mapper for header-agnostic cloud data
   */
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

  const mapFlexibleEvent = (item: any, idx: number): ChurchEvent => {
    const rawId = getFlexibleValue(item, ['id', 'uuid', 'entryid']);
    const rawDate = getFlexibleValue(item, ['eventdate', 'date', 'day']);
    const rawRecur = getFlexibleValue(item, ['isrecurring', 'recurring', 'repeat?']);
    const recurrence = getFlexibleValue(item, ['recurrence', 'frequency', 'repeat']) || 'None';

    const normalizeLoc = (val: any) => {
      const v = String(val || '').trim().toLowerCase();
      if (v.includes('dollar')) return 'Dollar';
      if (v.includes('muckhart')) return 'Muckhart';
      return 'All';
    };

    const sanitized: any = {
      id: rawId || `event-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      title: getFlexibleValue(item, ['title', 'name', 'event', 'subject']) || 'Untitled Event',
      description: getFlexibleValue(item, ['description', 'details', 'info', 'notes']) || '',
      location: normalizeLoc(getFlexibleValue(item, ['location', 'place', 'venue'])),
      tag: normalizeLoc(getFlexibleValue(item, ['tag', 'category', 'label'])),
      startTime: getFlexibleValue(item, ['starttime', 'start', 'time']) || '',
      endTime: getFlexibleValue(item, ['endtime', 'end']) || '',
      recurrence: recurrence,
      recurrenceEndDate: getFlexibleValue(item, ['recurrenceenddate', 'repeatuntil', 'until']) || '',
      eventDate: parseCloudDate(rawDate) || new Date().toISOString().split('T')[0],
      dayOfWeek: Number(getFlexibleValue(item, ['dayofweek', 'weekday'])) || 0,
      weekOfMonth: Number(getFlexibleValue(item, ['weekofmonth', 'weeknumber'])) || 1,
    };

    if (rawRecur !== undefined) {
      const s = String(rawRecur).toLowerCase().trim();
      sanitized.isRecurring = (s === 'true' || s === 'yes' || s === '1' || s === 'on');
    } else {
      sanitized.isRecurring = sanitized.recurrence !== 'None';
    }

    return sanitized as ChurchEvent;
  };

  const mapFlexibleContact = (item: any, idx: number): ChurchContact => {
    const rawId = getFlexibleValue(item, ['id', 'uuid', 'entryid']);
    const rawPublic = getFlexibleValue(item, ['displaypublicly', 'public', 'visible']);
    
    return {
      id: rawId || `contact-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      name: getFlexibleValue(item, ['name', 'fullname', 'contactname']) || 'Unknown Name',
      title: getFlexibleValue(item, ['title', 'position', 'parishtitle']) || '',
      role: getFlexibleValue(item, ['role', 'accessrole', 'systemrole']) || 'Volunteer',
      email: getFlexibleValue(item, ['email', 'emailaddress', 'contactemail']) || '',
      phone: String(getFlexibleValue(item, ['phone', 'telephone', 'mobile', 'number']) || ''),
      imageUrl: getFlexibleValue(item, ['imageurl', 'image', 'photo', 'profilepicture']) || '',
      password: String(getFlexibleValue(item, ['password', 'pwd', 'accesskey']) || ''),
      displayPublicly: rawPublic !== undefined ? (String(rawPublic).toLowerCase().trim() === 'true' || String(rawPublic).toLowerCase().trim() === 'yes' || String(rawPublic) === '1') : true,
    };
  };

  const mapFlexibleRequest = (item: any, idx: number): ContactRequest => {
    return {
      id: getFlexibleValue(item, ['id', 'uuid']) || `req-${idx}`,
      name: getFlexibleValue(item, ['name', 'fullname', 'sender']) || 'Anonymous',
      email: getFlexibleValue(item, ['email', 'emailaddress']) || '',
      phone: String(getFlexibleValue(item, ['phone', 'telephone']) || ''),
      subject: getFlexibleValue(item, ['subject', 'topic']) || 'General',
      message: getFlexibleValue(item, ['message', 'text', 'inquiry']) || '',
      submittedAt: getFlexibleValue(item, ['submittedat', 'date', 'time']) || new Date().toISOString()
    };
  };

  const mapFlexibleGroup = (item: any, idx: number): ChurchGroup => {
    const rawId = getFlexibleValue(item, ['id', 'uuid', 'entryid']);
    const rawChurch = getFlexibleValue(item, ['church', 'location', 'parish']);
    
    return {
      id: rawId || `group-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      name: getFlexibleValue(item, ['name', 'groupname', 'title']) || 'Unnamed Group',
      description: getFlexibleValue(item, ['description', 'details', 'info']) || '',
      church: String(rawChurch || '').toLowerCase().includes('muckhart') ? 'Muckhart' : 'Dollar',
      meetingTime: getFlexibleValue(item, ['meetingtime', 'time', 'when']) || '',
      contactPerson: getFlexibleValue(item, ['contactperson', 'contact', 'leader']) || '',
    };
  };

  const mapFlexibleKnowledge = (item: any, idx: number): KnowledgeEntry => {
    return {
      id: getFlexibleValue(item, ['id', 'uuid']) || `kb-${idx}`,
      title: getFlexibleValue(item, ['title', 'subject']) || 'Untitled Entry',
      content: getFlexibleValue(item, ['content', 'description', 'text']) || '',
      attachmentUrl: getFlexibleValue(item, ['attachmenturl', 'attachment', 'file']) || '',
      attachmentName: getFlexibleValue(item, ['attachmentname', 'filename']) || '',
      lastUpdated: getFlexibleValue(item, ['lastupdated', 'date']) || new Date().toISOString()
    };
  };

  const mapFlexibleSubscriber = (item: any, idx: number): Subscriber => {
    return {
      id: getFlexibleValue(item, ['id', 'uuid']) || `sub-${idx}`,
      name: getFlexibleValue(item, ['name', 'fullname', 'member']) || 'Subscriber',
      email: getFlexibleValue(item, ['email', 'emailaddress']) || '',
      subscribedAt: getFlexibleValue(item, ['subscribedat', 'date', 'joined']) || new Date().toISOString()
    };
  };

  const mapFlexibleFeedback = (item: any, idx: number): Feedback => {
    return {
      id: getFlexibleValue(item, ['id', 'uuid']) || `fb-${idx}`,
      foundLooking: getFlexibleValue(item, ['foundlooking', 'found', 'status']) || 'Yes',
      improveWebsite: getFlexibleValue(item, ['improvewebsite', 'improve', 'feedback']) || '',
      addRemove: getFlexibleValue(item, ['addremove', 'changes']) || '',
      submittedAt: getFlexibleValue(item, ['submittedat', 'date', 'time']) || new Date().toISOString(),
      pagePath: getFlexibleValue(item, ['pagepath', 'page', 'url']) || 'Home'
    };
  };

  const mapFlexibleMission = (item: any): MissionStatement => {
    return {
      text: getFlexibleValue(item, ['text', 'mission', 'statement', 'missionstatement']) || '',
      lastUpdated: getFlexibleValue(item, ['lastupdated', 'date', 'updated']) || new Date().toISOString()
    };
  };

  const syncAllFromCloud = useCallback(async (urlOverride?: any) => {
    const url = (typeof urlOverride === 'string') ? urlOverride : googleSheetsUrl;
    if (!url || typeof url !== 'string' || !url.includes('/exec')) return;

    setIsSyncing(true);
    try {
      const results = await Promise.allSettled([
        fetchSheetData(url, 'subscriber'),
        fetchSheetData(url, 'events'),
        fetchSheetData(url, 'groups'),
        fetchSheetData(url, 'contacts'),
        fetchSheetData(url, 'mission'),
        fetchSheetData(url, 'feedback'),
        fetchSheetData(url, 'knowledge'),
        fetchSheetData(url, 'requests')
      ]);

      const getVal = (idx: number) => {
        const res = results[idx];
        return res.status === 'fulfilled' ? res.value : [];
      };

      const subData = getVal(0);
      const eventData = getVal(1);
      const groupData = getVal(2);
      const contactData = getVal(3);
      const missionData = getVal(4);
      const feedbackData = getVal(5);
      const knowledgeData = getVal(6);
      const requestData = getVal(7);

      if (subData?.length > 0) setSubscribers(subData.map(mapFlexibleSubscriber));
      if (eventData?.length > 0) setEvents(eventData.map(mapFlexibleEvent));
      if (groupData?.length > 0) setGroups(groupData.map(mapFlexibleGroup));
      if (contactData?.length > 0) setContacts(contactData.map(mapFlexibleContact));
      if (missionData?.length > 0) setMission(mapFlexibleMission(missionData[missionData.length - 1]));
      if (feedbackData?.length > 0) setFeedback(feedbackData.map(mapFlexibleFeedback));
      if (knowledgeData?.length > 0) setKnowledge(knowledgeData.map(mapFlexibleKnowledge));
      if (requestData?.length > 0) setRequests(requestData.map(mapFlexibleRequest));
      
    } catch (err: any) {
      console.error("Cloud Sync Failed:", err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [googleSheetsUrl]);

  const handleUpdateSheetsUrl = (url: string) => {
    const cleanUrl = url.trim();
    localStorage.setItem('church_google_sheets_url', cleanUrl);
    setGoogleSheetsUrl(cleanUrl);
    if (cleanUrl) syncAllFromCloud(cleanUrl);
  };

  useEffect(() => {
    if (googleSheetsUrl && googleSheetsUrl.includes('/exec')) {
      syncAllFromCloud();
    }
  }, [syncAllFromCloud, googleSheetsUrl]);

  useEffect(() => {
    localStorage.setItem('church_events', JSON.stringify(events));
    localStorage.setItem('church_groups', JSON.stringify(groups));
    localStorage.setItem('church_contacts', JSON.stringify(contacts));
    localStorage.setItem('church_subscribers', JSON.stringify(subscribers));
    localStorage.setItem('church_feedback', JSON.stringify(feedback));
    localStorage.setItem('church_requests', JSON.stringify(requests));
    localStorage.setItem('church_mission', JSON.stringify(mission));
    localStorage.setItem('church_knowledge', JSON.stringify(knowledge));
  }, [events, groups, contacts, subscribers, feedback, requests, mission, knowledge]);

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setUserRole(UserRole.ADMIN);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session_active');
    setIsAdminLoggedIn(false);
    setUserRole(UserRole.GENERAL);
  };

  const handleSaveEvent = async (event: ChurchEvent) => {
    setEvents(prev => {
      const exists = prev.find(e => e.id === event.id);
      return exists ? prev.map(e => e.id === event.id ? event : e) : [...prev, event];
    });
    if (googleSheetsUrl) await syncEntryToSheet(googleSheetsUrl, 'events', event);
  };

  const handleSaveGroup = async (group: ChurchGroup) => {
    setGroups(prev => {
      const exists = prev.find(g => g.id === group.id);
      return exists ? prev.map(g => g.id === group.id ? group : g) : [...prev, group];
    });
    if (googleSheetsUrl) await syncEntryToSheet(googleSheetsUrl, 'groups', group);
  };

  const handleSaveContact = async (contact: ChurchContact) => {
    setContacts(prev => {
      const exists = prev.find(c => c.id === contact.id);
      return exists ? prev.map(c => c.id === contact.id ? contact : c) : [...prev, contact];
    });
    if (googleSheetsUrl) await syncEntryToSheet(googleSheetsUrl, 'contacts', contact);
  };

  const handleSaveKnowledge = async (entry: KnowledgeEntry) => {
    setKnowledge(prev => {
      const exists = prev.find(e => e.id === entry.id);
      return exists ? prev.map(e => e.id === entry.id ? entry : e) : [...prev, entry];
    });
    if (googleSheetsUrl) await syncEntryToSheet(googleSheetsUrl, 'knowledge', entry);
  };

  const handleSaveRequest = async (request: ContactRequest) => {
    setRequests(prev => [request, ...prev]);
    if (googleSheetsUrl) {
      await syncEntryToSheet(googleSheetsUrl, 'requests', request);
    }
  };

  const handleSaveMission = async (newMission: MissionStatement) => {
    setMission(newMission);
    if (googleSheetsUrl) await syncEntryToSheet(googleSheetsUrl, 'mission', newMission);
  };

  const handleSubscribe = async (name: string, email: string) => {
    const newSub: Subscriber = { 
      id: Math.random().toString(36).substr(2, 9), 
      name, 
      email, 
      subscribedAt: new Date().toISOString() 
    };
    setSubscribers(prev => [...prev, newSub]);
    if (googleSheetsUrl) await syncEntryToSheet(googleSheetsUrl, 'subscriber', newSub);
  };

  const handleFeedbackSubmitted = (f: Feedback) => {
    setFeedback(prev => [f, ...prev]);
  };

  return (
    <Router>
      <Layout userRole={userRole} onFeedbackSubmitted={handleFeedbackSubmitted} onSaveRequest={handleSaveRequest}>
        {isSyncing && (
          <div className="fixed top-24 right-4 z-[100] bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs font-bold">Cloud Sync...</span>
          </div>
        )}

        <div className="fixed bottom-4 right-4 z-50 group">
          <div className="hidden group-hover:flex flex-col mb-2 bg-white shadow-xl border rounded-lg p-2 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 px-2 uppercase mb-1">Demo Role View</p>
            {Object.values(UserRole).filter(r => r !== UserRole.ADMIN).map(role => (
              <button key={role} onClick={() => setUserRole(role)} className={`text-xs px-3 py-1.5 text-left rounded hover:bg-slate-100 ${userRole === role ? 'bg-indigo-50 text-indigo-700 font-bold' : ''}`}>{role}</button>
            ))}
          </div>
          <button className={`p-3 rounded-full shadow-lg transition-all active:scale-95 ${isAdminLoggedIn ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border'}`}>
            <Shield className="w-6 h-6" />
          </button>
        </div>

        <Routes>
          <Route path="/" element={<Home events={events} mission={mission} onSubscribe={handleSubscribe} onUnsubscribe={(email) => setSubscribers(s => s.filter(x => x.email !== email))} />} />
          <Route path="/dollar" element={<ChurchPage type="Dollar" groups={groups.filter(g => g.church === 'Dollar')} />} />
          <Route path="/muckhart" element={<ChurchPage type="Muckhart" groups={groups.filter(g => g.church === 'Muckhart')} />} />
          <Route path="/events" element={<EventsPage events={events} />} />
          <Route path="/contacts" element={<ContactsPage contacts={contacts} userRole={userRole} onSaveContact={handleSaveContact} onDeleteContact={(id) => setContacts(c => c.filter(x => x.id !== id))} onSubscribe={handleSubscribe} onUnsubscribe={(email) => setSubscribers(s => s.filter(x => x.email !== email))} />} />
          <Route 
            path="/admin" 
            element={isAdminLoggedIn ? (
              <AdminDashboard 
                events={events} 
                groups={groups} 
                contacts={contacts} 
                subscribers={subscribers}
                requests={requests}
                feedback={feedback}
                knowledge={knowledge}
                mission={mission} 
                googleSheetsUrl={googleSheetsUrl} 
                isSyncing={isSyncing} 
                onSaveEvent={handleSaveEvent} 
                onDeleteEvent={(id) => setEvents(e => e.filter(x => x.id !== id))} 
                onSaveGroup={handleSaveGroup} 
                onDeleteGroup={(id) => setGroups(g => g.filter(x => x.id !== id))} 
                onSaveContact={handleSaveContact} 
                onDeleteContact={(id) => setContacts(c => c.filter(x => x.id !== id))} 
                onSaveKnowledge={handleSaveKnowledge}
                onDeleteKnowledge={(id) => setKnowledge(k => k.filter(x => x.id !== id))}
                onSaveMission={handleSaveMission} 
                onUpdateSubscribers={setSubscribers}
                onUpdateRequests={setRequests}
                onUpdateFeedback={setFeedback}
                onUpdateSheetsUrl={handleUpdateSheetsUrl} 
                onBulkUpdateEvents={setEvents} 
                onBulkUpdateGroups={setGroups} 
                onBulkUpdateContacts={setContacts} 
                onBulkUpdateKnowledge={setKnowledge}
                onRefreshAll={syncAllFromCloud}
                onLogout={handleLogout}
              />
            ) : (
              <AdminAuthWrapper onLoginSuccess={handleLoginSuccess} contacts={contacts} />
            )} 
          />
        </Routes>
        
        {/* New Parish Chatbot */}
        <Chatbot knowledge={knowledge} events={events} />
      </Layout>
    </Router>
  );
};

export default App;
