
import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle, BellOff, Loader2, Sparkles, User } from 'lucide-react';

interface NewsletterProps {
  onSubscribe: (name: string, email: string) => void;
  onUnsubscribe: (email: string) => void;
}

const Newsletter: React.FC<NewsletterProps> = ({ onSubscribe, onUnsubscribe }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('church_newsletter_subscribed');
    if (saved === 'true') {
      setIsSubscribed(true);
    }
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    
    setLoading(true);
    // Simulate API network latency
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onSubscribe(name, email);
    localStorage.setItem('church_newsletter_subscribed', 'true');
    localStorage.setItem('church_newsletter_email', email); // Keep track of email to unsubscribe later
    
    setIsSubscribed(true);
    setEmail('');
    setName('');
    setMessage({ type: 'success', text: 'Thank you for subscribing! You have been added to our newsletter table.' });
    setLoading(false);
    
    setTimeout(() => setMessage(null), 5000);
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const savedEmail = localStorage.getItem('church_newsletter_email');
    if (savedEmail) {
      onUnsubscribe(savedEmail);
    }
    
    localStorage.removeItem('church_newsletter_subscribed');
    localStorage.removeItem('church_newsletter_email');
    setIsSubscribed(false);
    setMessage({ type: 'success', text: 'You have been successfully removed from our mailing list.' });
    setLoading(false);
    
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="bg-indigo-900 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none">
        <Mail className="w-64 h-64" />
      </div>
      <div className="absolute -bottom-12 -left-12 p-12 opacity-[0.03] pointer-events-none">
        <Sparkles className="w-48 h-48" />
      </div>
      
      <div className="relative z-10 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4 leading-tight">Stay in the Loop</h2>
        <p className="text-indigo-100 mb-8 text-lg leading-relaxed font-light">
          Join our weekly parish newsletter to receive news, event updates, and words of encouragement from Dollar and Muckhart, delivered every Monday morning.
        </p>

        {isSubscribed ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center space-x-4 bg-white/10 border border-white/20 p-5 rounded-2xl backdrop-blur-sm">
              <div className="bg-emerald-500 p-2 rounded-full">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">Subscription Active</p>
                <p className="text-indigo-200 text-sm">You are on our newsletter table.</p>
              </div>
            </div>
            <button 
              onClick={handleUnsubscribe}
              disabled={loading}
              className="text-indigo-300 text-xs font-bold uppercase tracking-widest hover:text-white flex items-center space-x-2 transition-colors py-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              <span>Unsubscribe from the newsletter</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-indigo-300" />
                </div>
                <input 
                  type="text" 
                  required
                  placeholder="Your Name"
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-300/60 outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all text-base"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-indigo-300" />
                </div>
                <input 
                  type="email" 
                  required
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-300/60 outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-white text-indigo-900 px-10 py-4 rounded-2xl font-bold hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>Subscribe</span>
              </button>
            </div>
            <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold ml-1 flex items-center">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2"></span>
              No spam. Your name and email are kept in our secure parish newsletter table.
            </p>
          </form>
        )}

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-bold animate-in zoom-in-95 duration-300 flex items-center space-x-3 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30' : 'bg-red-500/20 text-red-100 border border-red-500/30'}`}>
             <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
             <span>{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Newsletter;
