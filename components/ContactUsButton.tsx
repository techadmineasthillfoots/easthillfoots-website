
import React, { useState } from 'react';
import { Mail, X, Send, User, Phone, Info, Loader2, CheckCircle2, MessageCircle } from 'lucide-react';
import { ContactRequest } from '../types';

interface ContactUsButtonProps {
  googleSheetsUrl: string;
  onSaveRequest?: (request: ContactRequest) => void;
}

const ContactUsButton: React.FC<ContactUsButtonProps> = ({ googleSheetsUrl, onSaveRequest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const request: ContactRequest = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      submittedAt: new Date().toISOString()
    };

    // Use centralized handler which manages both cloud and local state
    if (onSaveRequest) {
      await onSaveRequest(request);
    }

    // Artificial delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setLoading(false);
    setSubmitted(true);
    
    setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
      }, 500);
    }, 3000);
  };

  const subjects = ['General Inquiry', 'Prayer Request', 'Event Question', 'Membership', 'Other'];

  return (
    <div className="fixed bottom-24 left-6 z-[60]">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 p-4 rounded-full shadow-2xl transition-all active:scale-95
          ${isOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}
        `}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
        {!isOpen && <span className="text-sm font-bold pr-2 hidden sm:inline">Contact Us</span>}
      </button>

      {/* Popover Form */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 w-[90vw] max-w-[450px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
          <div className="p-8 bg-indigo-900 text-white">
            <h3 className="text-2xl font-bold font-serif mb-1 text-white">Get in Touch</h3>
            <p className="text-indigo-200 text-sm">Send a message to our parish office and we'll get back to you.</p>
          </div>

          <div className="p-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 font-serif">Message Sent!</h4>
                <p className="text-slate-500 text-sm">Your inquiry has been logged in our parish requests. God bless!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                        placeholder="Optional"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                  <div className="relative">
                    <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 appearance-none"
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                    >
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Message</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                    placeholder="How can we help you today?"
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactUsButton;
