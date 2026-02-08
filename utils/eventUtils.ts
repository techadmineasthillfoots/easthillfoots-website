
import { 
  addWeeks, 
  addMonths, 
  startOfMonth, 
  endOfMonth, 
  isBefore, 
  isAfter, 
  isSameDay, 
  getDay, 
  getDate, 
  startOfDay,
  format as dateFnsFormat
} from 'date-fns';
import { ChurchEvent } from '../types';

export interface EventInstance extends ChurchEvent {
  instanceStart: Date;
  instanceEnd: Date;
}

const coerceBoolean = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.toLowerCase().trim();
    return s === 'true' || s === 'yes' || s === '1' || s === 'on';
  }
  return !!val;
};

const coerceNumber = (val: any, fallback: number): number => {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

/**
 * Parses a date or time string into a 'local' Date object for a specific base date.
 */
const getLocalTimeOnDate = (dateStr: string, timeStr?: string): Date => {
  let y = new Date().getFullYear(), m = new Date().getMonth(), d = new Date().getDate();
  
  if (dateStr) {
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-').map(Number);
    if (parts.length === 3) {
      [y, m, d] = parts;
      m -= 1; // Month is 0-indexed
    }
  }

  const result = new Date(y, m, d, 0, 0, 0, 0);

  if (timeStr) {
    let hours = 0, mins = 0;
    const cleanTime = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr;
    if (cleanTime && cleanTime.includes(':')) {
      const tParts = cleanTime.split(':').map(Number);
      hours = tParts[0] || 0;
      mins = tParts[1] || 0;
    }
    result.setHours(hours, mins, 0, 0);
  }

  return result;
};

/**
 * Expands recurring events into a list of instances within the given range.
 */
export const expandEvents = (events: ChurchEvent[], rangeStart: Date, rangeEnd: Date): EventInstance[] => {
  const instances: EventInstance[] = [];
  const startLimit = startOfDay(rangeStart);
  const endLimit = endOfMonth(rangeEnd);

  events.forEach(event => {
    if (!event.eventDate) return;

    const isRecurring = coerceBoolean(event.isRecurring);
    const recurrenceType = event.recurrence || 'None';

    const eventStart = getLocalTimeOnDate(event.eventDate, event.startTime);
    let eventEnd: Date;
    
    if (event.endTime) {
      eventEnd = getLocalTimeOnDate(event.eventDate, event.endTime);
      if (isBefore(eventEnd, eventStart)) {
        eventEnd.setDate(eventEnd.getDate() + 1);
      }
    } else {
      eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000);
    }

    const durationMs = eventEnd.getTime() - eventStart.getTime();

    if (!isRecurring || recurrenceType === 'None') {
      if (isWithinRange(eventStart, startLimit, endLimit)) {
        instances.push({
          ...event,
          isRecurring: false,
          instanceStart: eventStart,
          instanceEnd: eventEnd
        });
      }
      return;
    }

    let currentPointer = startOfDay(eventStart);
    let seriesEnd: Date;
    if (event.recurrenceEndDate) {
      seriesEnd = getLocalTimeOnDate(event.recurrenceEndDate);
      seriesEnd.setHours(23, 59, 59, 999);
    } else {
      seriesEnd = endLimit;
    }

    const searchLimit = isBefore(seriesEnd, endLimit) ? seriesEnd : endLimit;
    let safety = 0;
    while ((isBefore(currentPointer, searchLimit) || isSameDay(currentPointer, searchLimit)) && safety < 500) {
      safety++;
      let shouldAdd = false;
      const checkDay = startOfDay(currentPointer);

      if (recurrenceType === 'Weekly') {
        shouldAdd = true;
      } else if (recurrenceType === 'BiWeekly') {
        const weeksDiff = Math.floor((checkDay.getTime() - startOfDay(eventStart).getTime()) / (7 * 24 * 60 * 60 * 1000));
        shouldAdd = weeksDiff % 2 === 0;
      } else if (recurrenceType === 'MonthlyRelative') {
        const dayOfWeek = coerceNumber(event.dayOfWeek, getDay(eventStart));
        const weekOfMonth = coerceNumber(event.weekOfMonth, Math.ceil(getDate(eventStart) / 7));
        const targetDate = getRelativeDateOfMonth(checkDay, dayOfWeek, weekOfMonth);
        shouldAdd = isSameDay(checkDay, targetDate);
      }

      if (shouldAdd) {
        const occurrenceStart = new Date(checkDay);
        occurrenceStart.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
        
        if (!isBefore(occurrenceStart, startOfDay(eventStart)) && isWithinRange(occurrenceStart, startLimit, endLimit)) {
          instances.push({
            ...event,
            isRecurring: true,
            instanceStart: occurrenceStart,
            instanceEnd: new Date(occurrenceStart.getTime() + durationMs)
          });
        }
      }

      if (recurrenceType === 'MonthlyRelative') {
        currentPointer = addMonths(currentPointer, 1);
        currentPointer.setDate(1);
      } else {
        currentPointer = addWeeks(currentPointer, 1);
      }
    }
  });

  return instances;
};

const isWithinRange = (date: Date, start: Date, end: Date) => {
  const dTime = date.getTime();
  return dTime >= start.getTime() && dTime <= end.getTime();
};

const getRelativeDateOfMonth = (monthDate: Date, dayOfWeek: number, weekOfMonth: number): Date => {
  const firstOfMonth = startOfMonth(monthDate);
  const lastOfMonth = endOfMonth(monthDate);

  if (weekOfMonth <= 4) {
    let count = 0;
    let current = new Date(firstOfMonth);
    while (isBefore(current, lastOfMonth) || isSameDay(current, lastOfMonth)) {
      if (getDay(current) === dayOfWeek) {
        count++;
        if (count === weekOfMonth) return current;
      }
      current = new Date(current.getTime() + 86400000);
    }
  } else {
    let current = new Date(lastOfMonth);
    while (isAfter(current, firstOfMonth) || isSameDay(current, firstOfMonth)) {
      if (getDay(current) === dayOfWeek) return current;
      current = new Date(current.getTime() - 86400000);
    }
  }
  return firstOfMonth;
};

/** 
 * CALENDAR EXPORT HELPERS 
 */

const formatToICSDate = (date: Date) => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const generateICSLink = (event: EventInstance) => {
  const start = formatToICSDate(event.instanceStart);
  const end = formatToICSDate(event.instanceEnd);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//East Hillfoots Church//NONSGML Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  return URL.createObjectURL(blob);
};

export const generateGoogleCalendarLink = (event: EventInstance) => {
  const start = formatToICSDate(event.instanceStart);
  const end = formatToICSDate(event.instanceEnd);
  const details = encodeURIComponent(event.description);
  const location = encodeURIComponent(event.location);
  const text = encodeURIComponent(event.title);

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
};

export const generateOutlookLink = (event: EventInstance) => {
  const start = event.instanceStart.toISOString();
  const end = event.instanceEnd.toISOString();
  const subject = encodeURIComponent(event.title);
  const location = encodeURIComponent(event.location);
  const body = encodeURIComponent(event.description);

  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&startdt=${start}&enddt=${end}&subject=${subject}&location=${location}&body=${body}`;
};
