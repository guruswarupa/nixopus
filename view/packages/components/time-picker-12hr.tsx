'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePicker12hrProps {
  value: string; // Format: "HH:MM" (24-hour) or empty
  onChange: (value: string) => void; // Returns "HH:MM" format (24-hour)
  className?: string;
  disabled?: boolean;
}

// Convert 24-hour format to 12-hour format with AM/PM
function to12Hour(time24: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  if (!time24) {
    return { hour: 12, minute: 0, period: 'AM' };
  }
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour: hour12, minute: minutes || 0, period };
}

// Convert 12-hour format to 24-hour format
function to24Hour(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let hour24 = hour;
  if (period === 'AM' && hour === 12) {
    hour24 = 0;
  } else if (period === 'PM' && hour !== 12) {
    hour24 = hour + 12;
  }
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function TimePicker12hr({ value, onChange, className, disabled }: TimePicker12hrProps) {
  const { hour, minute, period } = to12Hour(value);
  const [localHour, setLocalHour] = useState(hour);
  const [localMinute, setLocalMinute] = useState(minute);
  const [localPeriod, setLocalPeriod] = useState<'AM' | 'PM'>(period);

  useEffect(() => {
    const { hour: h, minute: m, period: p } = to12Hour(value);
    setLocalHour(h);
    setLocalMinute(m);
    setLocalPeriod(p);
  }, [value]);

  const updateTime = (newHour: number, newMinute: number, newPeriod: 'AM' | 'PM') => {
    setLocalHour(newHour);
    setLocalMinute(newMinute);
    setLocalPeriod(newPeriod);
    const time24 = to24Hour(newHour, newMinute, newPeriod);
    onChange(time24);
  };

  const incrementHour = () => {
    let newHour = localHour + 1;
    if (newHour > 12) newHour = 1;
    updateTime(newHour, localMinute, localPeriod);
  };

  const decrementHour = () => {
    let newHour = localHour - 1;
    if (newHour < 1) newHour = 12;
    updateTime(newHour, localMinute, localPeriod);
  };

  const incrementMinute = () => {
    let newMinute = localMinute + 1;
    if (newMinute > 59) newMinute = 0;
    updateTime(localHour, newMinute, localPeriod);
  };

  const decrementMinute = () => {
    let newMinute = localMinute - 1;
    if (newMinute < 0) newMinute = 59;
    updateTime(localHour, newMinute, localPeriod);
  };

  const togglePeriod = () => {
    const newPeriod = localPeriod === 'AM' ? 'PM' : 'AM';
    updateTime(localHour, localMinute, newPeriod);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 1;
    const clamped = Math.max(1, Math.min(12, val));
    updateTime(clamped, localMinute, localPeriod);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    const clamped = Math.max(0, Math.min(59, val));
    updateTime(localHour, clamped, localPeriod);
  };

  return (
    <div className={cn('flex items-center gap-1.5 border rounded-md p-1 bg-background', className)}>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-3 w-6 p-0 hover:bg-muted"
          onClick={incrementHour}
          disabled={disabled}
        >
          <ChevronUp className="h-2.5 w-2.5" />
        </Button>
        <Input
          type="number"
          min="1"
          max="12"
          value={localHour}
          onChange={handleHourChange}
          className="h-7 w-10 text-center p-0 text-sm border-0 focus-visible:ring-0"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-3 w-6 p-0 hover:bg-muted"
          onClick={decrementHour}
          disabled={disabled}
        >
          <ChevronDown className="h-2.5 w-2.5" />
        </Button>
      </div>
      <span className="text-base font-semibold text-muted-foreground">:</span>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-3 w-6 p-0 hover:bg-muted"
          onClick={incrementMinute}
          disabled={disabled}
        >
          <ChevronUp className="h-2.5 w-2.5" />
        </Button>
        <Input
          type="number"
          min="0"
          max="59"
          value={String(localMinute).padStart(2, '0')}
          onChange={handleMinuteChange}
          className="h-7 w-10 text-center p-0 text-sm border-0 focus-visible:ring-0"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-3 w-6 p-0 hover:bg-muted"
          onClick={decrementMinute}
          disabled={disabled}
        >
          <ChevronDown className="h-2.5 w-2.5" />
        </Button>
      </div>
      <div className="flex flex-col items-center ml-0.5 gap-0.5">
        <Button
          type="button"
          variant={localPeriod === 'AM' ? 'default' : 'outline'}
          size="sm"
          className="h-6 w-9 text-[10px] font-semibold px-0 py-0"
          onClick={() => updateTime(localHour, localMinute, 'AM')}
          disabled={disabled}
        >
          AM
        </Button>
        <Button
          type="button"
          variant={localPeriod === 'PM' ? 'default' : 'outline'}
          size="sm"
          className="h-6 w-9 text-[10px] font-semibold px-0 py-0"
          onClick={() => updateTime(localHour, localMinute, 'PM')}
          disabled={disabled}
        >
          PM
        </Button>
      </div>
    </div>
  );
}
