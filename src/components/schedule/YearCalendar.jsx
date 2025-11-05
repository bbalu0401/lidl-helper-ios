import React from 'react';
import { format, getDaysInMonth, startOfMonth, getDay, isSameDay } from 'date-fns';
import { hu } from 'date-fns/locale';

const MONTHS = [
  'Jan.', 'Febr.', 'Márc.', 'Ápr.', 'Máj.', 'Jún.',
  'Júl.', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dec.'
];

const DAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

export default function YearCalendar({ selectedDate, onDateSelect, year = 2025 }) {
  const renderMonth = (monthIndex) => {
    const firstDay = startOfMonth(new Date(year, monthIndex, 1));
    const daysInMonth = getDaysInMonth(firstDay);
    const startDay = (getDay(firstDay) + 6) % 7; // Hétfőtől kezdjük (0 = hétfő)
    
    const days = [];
    
    // Üres cellák a hónap elején
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-7 w-7" />);
    }
    
    // A hónap napjai
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const isSelected = isSameDay(date, selectedDate);
      const isToday = isSameDay(date, new Date());
      
      days.push(
        <button
          key={day}
          onClick={() => onDateSelect(date)}
          className={`h-7 w-7 text-xs rounded-md transition-colors ${
            isSelected
              ? 'bg-primary text-primary-foreground font-bold'
              : isToday
              ? 'bg-primary/20 text-primary font-semibold'
              : 'hover:bg-muted text-foreground'
          }`}
        >
          {day}
        </button>
      );
    }
    
    return (
      <div className="space-y-1">
        <h3 className={`text-sm font-bold mb-2 ${
          monthIndex === new Date().getMonth() && year === new Date().getFullYear()
            ? 'text-primary'
            : 'text-foreground'
        }`}>
          {MONTHS[monthIndex]}
        </h3>
        <div className="grid grid-cols-7 gap-0.5 text-[10px] text-muted-foreground mb-1">
          {DAYS.map(day => (
            <div key={day} className="h-5 w-7 flex items-center justify-center font-medium">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-primary">{year}.</h2>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            {renderMonth(i)}
          </div>
        ))}
      </div>
    </div>
  );
}