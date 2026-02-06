
import React, { useState } from 'react';
import { MessageSquare, X, Send, CheckCircle2, Loader2, ThumbsUp, ThumbsDown, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { syncEntryToSheet } from '../services/googleSheetsService';
import { Feedback } from '../types';

interface FeedbackButtonProps {
  googleSheetsUrl: string;
  onFeedbackSubmitted?: (feedback: Feedback) => void;
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ googleSheetsUrl, onFeedbackSubmitted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const location = useLocation();

  const [formData, setFormData] = useState({
    foundLooking: 'Yes' as 'Yes' | 'No' | "I'm still looking",
    improveWebsite: '',
    addRemove: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const feedback: Feedback = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      submittedAt: new Date().toISOString(),
      pagePath: location.pathname
    };

    if (googleSheetsUrl) {
      await syncEntryToSheet(googleSheetsUrl, 'feedback', feedback);
    }

    // Call the local updater if present
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted(feedback);
    }

    // Simulate delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setLoading(false);
    setSubmitted(true);
    
    setTimeout(() => {
      setIsOpen(false);
      // Reset after closing
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ foundLooking: 'Yes', improveWebsite: '', addRemove: '' });
      }, 500);
    }, 3000);
  };

  return (
    <div className="fixed bottom-6 left-6 z-[60]">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 p-4 rounded-full shadow-2xl transition-all active:scale-95
          ${isOpen ? 'bg-slate-900 text-white rotate-90' : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'}
        `}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && <span className="text-sm font-bold pr-2 hidden sm:inline">Feedback</span>}
      </button>

      {/* Popover Form */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 w-[90vw] max-w-[400px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
          <div className="p-8 bg-indigo-900 text-white">
            <h3 className="text-2xl font-bold font-serif mb-1">We Value Your Voice</h3>
            <p className="text-indigo-200 text-sm">Help us improve the East Hillfoots digital experience.</p>
          </div>

          <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {submitted ? (
              <div className="py-12 text-center space-y-4 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">Thank You!</h4>
                <p className="text-slate-500 text-sm">Your feedback helps us better serve our parish community.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Did you find what you were looking for?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['Yes', 'No', "I'm still looking"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData({ ...formData, foundLooking: option as any })}
                        className={`
                          flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all
                          ${formData.foundLooking === option 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-100' 
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}
                        `}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.foundLooking === option ? 'border-indigo-600' : 'border-slate-300'}`}>
                          {formData.foundLooking === option && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                        </div>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">What is one thing we could do to improve? (Optional)</label>
                  <textarea
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px] resize-none"
                    placeholder="Tell us one specific change..."
                    value={formData.improveWebsite}
                    onChange={(e) => setFormData({ ...formData, improveWebsite: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Is there anything you'd add or remove? (Optional)</label>
                  <textarea
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px] resize-none"
                    placeholder="Additions or subtractions..."
                    value={formData.addRemove}
                    onChange={(e) => setFormData({ ...formData, addRemove: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Send Feedback
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackButton;
