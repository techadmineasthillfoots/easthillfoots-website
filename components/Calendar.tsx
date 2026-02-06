
import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, LayoutList, Calendar as CalendarIcon, Clock, Check, CalendarRange, Plus, Edit3, Trash2 } from 'lucide-react';
import { ChurchEvent, ChurchLocation } from '../types';
import { expandEvents, EventInstance } from '../utils/eventUtils';

interface CalendarProps {
  events: ChurchEvent[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: ChurchEvent) => void;
  onEdit?: (event: ChurchEvent) => void;
  onDelete?: (id: string) => void;
}

type ViewType = 'month' | 'week' | 'list';

const Calendar: React.FC<CalendarProps> = ({ events, onDateClick, onEventClick, onEdit, onDelete }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [activeLocations, setActiveLocations] = useState<Set<'Dollar' | 'Muckhart'>>(new Set(['Dollar', 'Muckhart']));

  const range = useMemo(() => {
    let start, end;
    if (view === 'month') {
      start = startOfWeek(startOfMonth(currentDate));
      end = endOfWeek(endOfMonth(currentDate));
    } else {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    }
    return { start, end };
  }, [currentDate, view]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: range.start, end: range.end });
  }, [range]);

  const eventInstances = useMemo(() => {
    const expanded = expandEvents(events, range.start, range.end);
    return expanded.filter(e => {
      // If tag is missing or set to All/Both, always show if any location is active
      if (!e.tag || e.tag === 'All' || e.tag === 'Both') return activeLocations.size > 0;
      // Otherwise strictly match the active toggles
      return activeLocations.has(e.tag as any);
    });
  }, [events, range, activeLocations]);

  const headerLabel = useMemo(() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy');
    return `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d, yyyy')}`;
  }, [currentDate, view, range]);

  const toggleLocation = (loc: 'Dollar' | 'Muckhart') => {
    const next = new Set(activeLocations);
    if (next.has(loc)) {
      if (next.size > 1) next.delete(loc);
    } else {
      next.add(loc);
    }
    setActiveLocations(next);
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  const renderMonthView = () => (
    <div className="grid grid-cols-7 border-t border-l">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-2 border-r border-b bg-slate-100 text-center font-bold text-xs text-slate-500 uppercase">
          {day}
        </div>
      ))}
      {days.map(day => (
        <div 
          key={day.toString()} 
          onClick={() => onDateClick?.(day)}
          className={`min-h-[120px] p-2 border-r border-b relative group/day ${!isSameMonth(day, currentDate) ? 'bg-slate-50 text-slate-300' : 'bg-white'} ${onDateClick ? 'cursor-pointer hover:bg-indigo-50/30 transition-colors' : ''}`}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : ''}`}>
              {format(day, 'd')}
            </span>
            {onDateClick && (
              <Plus className="w-3 h-3 text-indigo-300 opacity-0 group-hover/day:opacity-100 transition-opacity" />
            )}
          </div>
          <div className="space-y-1">
            {eventInstances.filter(e => isSameDay(e.instanceStart, day)).map((e, idx) => (
              <div 
                key={`${e.id}-${idx}`} 
                title={e.title} 
                onClick={(ev) => {
                  if (onEventClick) {
                    ev.stopPropagation();
                    onEventClick(e);
                  }
                }}
                className={`text-[10px] p-1 rounded leading-tight border truncate transition-all ${e.tag === 'Dollar' ? 'bg-blue-100 border-blue-200 text-blue-800' : e.tag === 'Muckhart' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-indigo-100 border-indigo-200 text-indigo-800'} ${onEventClick ? 'cursor-pointer hover:brightness-95 hover:shadow-sm' : ''}`}
              >
                <span className="font-bold">{format(e.instanceStart, 'HH:mm')}</span> {e.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderWeekView = () => (
    <div className="grid grid-cols-7 border-t border-l">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-2 border-r border-b bg-slate-100 text-center font-bold text-xs text-slate-500 uppercase">
          {day}
        </div>
      ))}
      {days.map(day => (
        <div 
          key={day.toString()} 
          onClick={() => onDateClick?.(day)}
          className={`min-h-[250px] p-3 border-r border-b bg-white group/day ${onDateClick ? 'cursor-pointer hover:bg-indigo-50/20 transition-colors' : ''}`}
        >
          <div className="flex flex-col items-center mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{format(day, 'EEE')}</span>
            <span className={`text-xl font-bold mt-1 ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white w-10 h-10 flex items-center justify-center rounded-full shadow-md' : 'text-slate-700'}`}>
              {format(day, 'd')}
            </span>
          </div>
          <div className="space-y-2">
            {eventInstances.filter(e => isSameDay(e.instanceStart, day)).map((e, idx) => (
              <div 
                key={`${e.id}-${idx}`} 
                onClick={(ev) => {
                  if (onEventClick) {
                    ev.stopPropagation();
                    onEventClick(e);
                  }
                }}
                className={`p-2 rounded-lg border-l-4 shadow-sm text-[10px] leading-tight group relative transition-all ${e.tag === 'Dollar' ? 'bg-blue-50 border-blue-500 text-blue-900' : e.tag === 'Muckhart' ? 'bg-green-50 border-green-500 text-green-900' : 'bg-indigo-50 border-indigo-500 text-indigo-900'} ${onEventClick ? 'cursor-pointer hover:translate-x-1 hover:shadow-md' : ''}`}
              >
                <div className="font-bold flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 opacity-50" />
                  {format(e.instanceStart, 'HH:mm')}
                </div>
                <div className="font-bold mt-0.5 truncate">{e.title}</div>
                <div className="text-[9px] opacity-60 truncate">{e.location}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => {
    const upcoming = [...eventInstances].sort((a, b) => a.instanceStart.getTime() - b.instanceStart.getTime());
    return (
      <div className="space-y-4 p-4 md:p-6">
        {upcoming.map((e, idx) => (
          <div 
            key={`${e.id}-${idx}`} 
            onClick={() => onEventClick?.(e)}
            className={`flex items-center bg-white p-4 rounded-xl border transition-all ${onEventClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-200' : 'hover:shadow-md'}`}
          >
            <div className="flex flex-col items-center justify-center px-4 border-r mr-4 min-w-[80px]">
              <span className="text-xs uppercase font-bold text-slate-400">{format(e.instanceStart, 'MMM')}</span>
              <span className="text-2xl font-bold">{format(e.instanceStart, 'dd')}</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-lg">{e.title}</h4>
                <div className="flex gap-2">
                   {e.isRecurring && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase border">Recurring</span>
                   )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${e.tag === 'Dollar' ? 'bg-blue-100 text-blue-800' : e.tag === 'Muckhart' ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'}`}>
                    {e.tag}
                  </span>
                </div>
              </div>
              <div className="flex items-center text-slate-500 text-sm mt-1">
                <Clock className="w-4 h-4 mr-1" />
                {format(e.instanceStart, 'h:mm a')}
                {e.instanceEnd && ` - ${format(e.instanceEnd, 'h:mm a')}`} @ {e.location}
              </div>
              <p className="text-slate-600 mt-2 text-sm line-clamp-2">{e.description}</p>
            </div>
            
            {(onEdit || onDelete) && (
              <div className="flex items-center gap-2 pl-4 border-l ml-4">
                {onEdit && (
                  <button 
                    onClick={(ev) => { ev.stopPropagation(); onEdit(e); }}
                    className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-100"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                )}
                {onDelete && (
                  <button 
                    onClick={(ev) => { ev.stopPropagation(); onDelete(e.id); }}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {upcoming.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed text-slate-400">
            No events found for the selected period.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center justify-between md:justify-start space-x-4">
          <h2 className="text-xl font-bold font-serif whitespace-nowrap min-w-[150px]">{headerLabel}</h2>
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button onClick={() => navigate('prev')} className="p-1 hover:bg-white rounded transition-colors"><ChevronLeft className="w-5 h-5"/></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2 text-xs font-medium hover:bg-white rounded py-1 transition-colors">Today</button>
            <button onClick={() => navigate('next')} className="p-1 hover:bg-white rounded transition-colors"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => toggleLocation('Dollar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeLocations.has('Dollar') ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {activeLocations.has('Dollar') && <Check className="w-4 h-4" />}
              <span>Dollar</span>
            </button>
            <button
              onClick={() => toggleLocation('Muckhart')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeLocations.has('Muckhart') ? 'bg-green-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {activeLocations.has('Muckhart') && <Check className="w-4 h-4" />}
              <span>Muckhart</span>
            </button>
          </div>

          <div className="flex bg-slate-100 rounded-xl p-1 ml-auto shadow-inner">
            <button 
              onClick={() => setView('month')} 
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'month' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-400'}`}
            >
              <CalendarIcon className="w-3.5 h-3.5"/>
              <span className="hidden sm:inline">Month</span>
            </button>
            <button 
              onClick={() => setView('week')} 
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'week' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-400'}`}
            >
              <CalendarRange className="w-3.5 h-3.5"/>
              <span className="hidden sm:inline">Week</span>
            </button>
            <button 
              onClick={() => setView('list')} 
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-indigo-400'}`}
            >
              <LayoutList className="w-3.5 h-3.5"/>
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'list' && renderListView()}
      </div>
    </div>
  );
};

export default Calendar;
