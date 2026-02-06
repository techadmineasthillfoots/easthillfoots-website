
import React from 'react';
import { Mail, Phone, Contact, Edit3, Trash2 } from 'lucide-react';
import { ChurchContact, UserRole } from '../types';
import Newsletter from '../components/Newsletter';

interface ContactsPageProps {
  contacts: ChurchContact[];
  userRole: UserRole;
  onSaveContact: (contact: ChurchContact) => void;
  onDeleteContact: (id: string) => void;
  onSubscribe: (name: string, email: string) => void;
  onUnsubscribe: (email: string) => void;
}

const ContactsPage: React.FC<ContactsPageProps> = ({ contacts, userRole, onDeleteContact, onSubscribe, onUnsubscribe }) => {
  const isAdmin = userRole === UserRole.ADMIN;
  const visibleContacts = contacts.filter(c => c.displayPublicly);

  const getInitials = (name: string = '') => {
    const parts = name.trim().split(/\s+/);
    if (!parts[0] || parts[0] === '') return '?';
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-16 animate-in fade-in duration-500">
      <header className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
            <Contact className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl font-bold font-serif text-slate-900">Contact Our Parish</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Reach out to our ministry team and parish leaders. We are here to support you in your spiritual journey.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleContacts.map((contact) => (
          <div key={contact.id} className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden hover:shadow-xl transition-all group relative border-b-4 border-b-indigo-500">
            {isAdmin && (
              <div className="absolute top-4 right-4 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => window.location.hash = '/admin'} 
                  title="Manage in Admin Dashboard"
                  className="p-2.5 bg-white shadow-lg text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDeleteContact(contact.id)} 
                  className="p-2.5 bg-white shadow-lg text-red-600 rounded-full hover:bg-red-600 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Reduced Profile Image - Now 25% of card width and centered */}
            <div className="flex justify-center pt-10">
              <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-full overflow-hidden border-4 border-white shadow-md ring-1 ring-slate-100">
                {contact.imageUrl ? (
                  <img src={contact.imageUrl} alt={contact.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-serif font-bold text-indigo-200">{getInitials(contact.name)}</span>
                )}
              </div>
            </div>

            <div className="p-8 text-center">
              <h3 className="text-2xl font-bold">{contact.name}</h3>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {contact.title && (
                    <span className="text-indigo-600 font-bold text-[10px] uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{contact.title}</span>
                )}
                {contact.role && (
                    <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{contact.role}</span>
                )}
              </div>
              <div className="mt-6 pt-6 border-t space-y-4">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center justify-center text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                    <Mail className="w-4 h-4 mr-3" /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center justify-center text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                    <Phone className="w-4 h-4 mr-3" /> {contact.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {visibleContacts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed text-slate-400">
            <Contact className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p className="italic">No public contact records found.</p>
          </div>
        )}
      </div>
      <Newsletter onSubscribe={onSubscribe} onUnsubscribe={onUnsubscribe} />
    </div>
  );
};

export default ContactsPage;
