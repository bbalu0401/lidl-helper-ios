import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WeekDropdownSelector({ currentWeek, onWeekChange }) {
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  return (
    <div className="mb-8">
        <Select
            value={String(currentWeek)}
            onValueChange={(value) => onWeekChange(Number(value))}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Hét kiválasztása" />
            </SelectTrigger>
            <SelectContent>
                {weeks.map(week => (
                <SelectItem key={week} value={String(week)}>
                    {week}. hét
                </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
  );
}