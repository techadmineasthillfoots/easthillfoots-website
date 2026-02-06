
import React, { useState, useEffect } from 'react';
import { Quote, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { getDailyInspiration } from '../services/geminiService';
import Calendar from '../components/Calendar';
import Newsletter from '../components/Newsletter';
import { ChurchEvent, MissionStatement } from '../types';

interface HomeProps {
  events: ChurchEvent[];
  mission: MissionStatement;
  onSubscribe: (name: string, email: string) => void;
  onUnsubscribe: (email: string) => void;
}

interface InspirationData {
  message: string;
  reference: string;
  verseText: string;
}

const Home: React.FC<HomeProps> = ({ events, mission, onSubscribe, onUnsubscribe }) => {
  const [inspiration, setInspiration] = useState<InspirationData | null>(null);
  const [loadingInspiration, setLoadingInspiration] = useState(true);

  const fetchInspiration = async () => {
    setLoadingInspiration(true);
    try {
      const data = await getDailyInspiration();
      setInspiration(data);
    } catch (err) {
      console.error("Failed to load home inspiration", err);
    } finally {
      setLoadingInspiration(false);
    }
  };

  useEffect(() => {
    fetchInspiration();
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Full Width Hero Banner - Now displaying Mission Statement */}
      <section className="relative w-full h-[125px] md:h-[175px] overflow-hidden bg-indigo-900 text-white flex items-center justify-center text-center px-6 shadow-xl border-b-4 border-indigo-800">
        <img 
          src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?q=80&w=2073&auto=format&fit=crop" 
          alt="Church Interior" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 scale-105"
        />
        <div className="relative max-w-5xl z-10 px-4">
          <div className="mb-2 md:mb-4 flex items-center justify-center space-x-2 text-indigo-300 opacity-80">
            <span className="h-px w-8 bg-indigo-300"></span>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Our Mission</p>
            <span className="h-px w-8 bg-indigo-300"></span>
          </div>
          <h1 className="text-xl md:text-3xl font-bold font-serif tracking-tight drop-shadow-2xl leading-tight">
            {mission.text}
          </h1>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/50 to-transparent pointer-events-none"></div>
      </section>

      {/* Standard Width Content Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 md:space-y-12">
        
        {/* Daily Inspiration - Optimized for horizontal space */}
        <div className="bg-white rounded-2xl md:rounded-3xl border shadow-sm relative overflow-hidden group">
          {/* Subtle background flair */}
          <div className="absolute -top-12 -right-12 p-8 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity pointer-events-none">
            <Sparkles className="w-64 h-64 text-indigo-600" />
          </div>
          
          <div className="p-5 md:p-8 min-h-[140px] flex flex-col justify-center">
            {loadingInspiration ? (
              <div className="space-y-4 animate-pulse py-2">
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-50 rounded w-1/4 mt-4"></div>
              </div>
            ) : inspiration ? (
              <div className="flex flex-col space-y-4 md:space-y-6">
                <div className="relative px-2">
                  {/* Decorative quote icon (smaller) */}
                  <Quote className="absolute -top-3 -left-4 w-10 h-10 text-indigo-50/70 -z-10" />
                  <p className="text-base md:text-xl font-serif text-slate-800 leading-snug md:leading-normal italic">
                    {inspiration.message}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-2 text-indigo-600 bg-indigo-50/50 px-3 py-1 rounded-lg border border-indigo-100/30 shrink-0">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">{inspiration.reference}</span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 italic max-w-full truncate md:whitespace-normal">
                    "{inspiration.verseText}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 space-y-2 py-4">
                <AlertCircle className="w-8 h-8 opacity-20" />
                <p className="text-sm italic">Spiritual nourishment is always available. Refresh to try again.</p>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Section */}
        <div className="w-full">
          <Calendar events={events} />
        </div>

        {/* Newsletter Section */}
        <div className="w-full">
          <Newsletter onSubscribe={onSubscribe} onUnsubscribe={onUnsubscribe} />
        </div>
      </div>
    </div>
  );
};

export default Home;
