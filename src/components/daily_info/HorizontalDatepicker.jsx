
import React, { useState, useRef, useEffect } from 'react';
import { format, addDays, subDays, isSameDay, isPast } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const safeParseDate = (dateString) => {
  if (!dateString) return null;
  
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }
    return null;
  }

  const date = new Date(dateString);
  if (date instanceof Date && !isNaN(date.getTime())) return date;
  
  return null;
};

// Magyar ünnepnapok 2025-re
const HUNGARIAN_HOLIDAYS_2025 = {
  '2025-01-01': 'Újév',
  '2025-03-15': 'Nemzeti ünnep',
  '2025-04-18': 'Nagypéntek',
  '2025-04-21': 'Húsvéthétfő',
  '2025-05-01': 'Munka ünnepe',
  '2025-06-09': 'Pünkösdhétfő',
  '2025-08-20': 'Szent István',
  '2025-10-23': 'Nemzeti ünnep',
  '2025-11-01': 'Mindenszentek',
  '2025-12-25': 'Karácsony',
  '2025-12-26': 'Karácsony 2. napja'
};

export default function HorizontalDatepicker({ selectedDate, setSelectedDate, allDailyInfos }) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const containerRef = useRef(null);
  
  const days = Array.from({ length: 7 }).map((_, i) => {
    const day = addDays(subDays(selectedDate, 3), i);
    return day;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const selectedElement = container.querySelector('[data-selected="true"]');
      if (selectedElement) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = selectedElement.getBoundingClientRect();
        const scrollLeft = container.scrollLeft + elementRect.left - containerRect.left - (containerRect.width / 2) + (elementRect.width / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [selectedDate]);
  
  const incompleteTaskDays = React.useMemo(() => {
    if (!allDailyInfos) return new Set();
    const taskDays = allDailyInfos.reduce((acc, task) => {
        const rawDateString = task.deadline || task.date;
        const parsedRawDate = safeParseDate(rawDateString);

        if (parsedRawDate) {
            const formattedRawDateKey = format(parsedRawDate, 'yyyy-MM-dd');

            if (task.hasOwnProperty('completed') && !task.completed) {
                const parsedDeadlineDate = safeParseDate(task.deadline);

                if (parsedDeadlineDate) {
                    if (isPast(parsedDeadlineDate) && !isSameDay(parsedDeadlineDate, new Date())) {
                        acc.add(format(new Date(), 'yyyy-MM-dd'));
                    } else {
                        acc.add(format(parsedDeadlineDate, 'yyyy-MM-dd'));
                    }
                }
            } else {
                acc.add(formattedRawDateKey);
            }
        }
        return acc;
    }, new Set());
    return taskDays;
  }, [allDailyInfos]);

  const goToPrevDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };
  
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevDay}
        className="h-10 w-10 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div ref={containerRef} className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {days.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const dateString = format(day, 'yyyy-MM-dd');
          const hasIncomplete = incompleteTaskDays.has(dateString);
          const isToday = isSameDay(day, new Date());
          const isHoliday = HUNGARIAN_HOLIDAYS_2025[dateString];

          return (
            <Button
              key={day.toString()}
              data-selected={isSelected}
              variant="ghost"
              className={`flex flex-col items-center justify-center flex-shrink-0 w-14 h-16 rounded-xl relative transition-all ${
                isSelected 
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg scale-105' 
                  : isHoliday
                  ? 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-900/30 ring-2 ring-red-500/50'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              onClick={() => setSelectedDate(day)}
              title={isHoliday ? `Munkaszüneti nap - ${isHoliday}` : ''}
            >
              <span className={`text-xs font-medium uppercase ${
                isSelected 
                  ? 'text-white/80' 
                  : isHoliday
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}>
                {format(day, 'eee', { locale: hu })}
              </span>
              <span className={`text-xl font-bold ${
                isSelected 
                  ? 'text-white' 
                  : isHoliday
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-slate-900 dark:text-white'
              }`}>
                {format(day, 'd')}
              </span>
              {isToday && !isSelected && !isHoliday && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-500"></div>
              )}
              {hasIncomplete && !isSelected && !isHoliday && (
                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-red-500"></div>
              )}
              {isHoliday && (
                <span className="absolute -top-1 -right-1 text-xs">🎉</span>
              )}
            </Button>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextDay}
        className="h-10 w-10 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            <CalendarIcon className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md w-full p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => { if(date) { setSelectedDate(date); setIsCalendarOpen(false); } }}
            locale={hu}
            className="p-0 flex justify-center rounded-xl"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
