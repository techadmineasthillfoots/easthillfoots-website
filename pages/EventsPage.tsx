
import React, { useState, useMemo } from 'react';
import Calendar from '../components/Calendar';
import { ChurchEvent } from '../types';
import { Calendar as CalendarIcon, Search, X } from 'lucide-react';

interface EventsPageProps {
  events: ChurchEvent[];
}

const EventsPage: React.FC<EventsPageProps> = ({ events }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    
    const term = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(term) || 
      event.description.toLowerCase().includes(term)
    );
  }, [events, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-indigo-600 mb-1">
            <CalendarIcon className="w-5 h-5" />
            <h2 className="text-xs font-bold uppercase tracking-widest">Worship & Community</h2>
          </div>
          <h1 className="text-4xl font-bold font-serif">Church Calendar</h1>
          <p className="text-slate-500 max-w-md text-sm mt-2">
            Stay connected with all that's happening across the Parish. Filter by church location or search for specific activities.
          </p>
        </div>

        <div className="w-full md:w-80">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`w-5 h-5 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400'}`} />
            </div>
            <input
              type="text"
              placeholder="Search events, groups, or keywords..."
              className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-[10px] text-indigo-600 font-bold uppercase mt-2 ml-1">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          )}
        </div>
      </div>

      <Calendar events={filteredEvents} />
      
      {filteredEvents.length === 0 && searchQuery && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No events match your search</h3>
          <p className="text-slate-500 mt-1">Try adjusting your keywords or clearing the filter.</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-6 text-indigo-600 font-bold text-sm hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
