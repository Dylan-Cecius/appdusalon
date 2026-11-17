import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface CurrentTimeIndicatorProps {
  startHour: number;
  slotHeight: number;
}

const CurrentTimeIndicator = ({ startHour, slotHeight }: CurrentTimeIndicatorProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const totalMinutes = (currentHour - startHour) * 60 + currentMinutes;
  const topPx = (totalMinutes / 15) * slotHeight;

  if (totalMinutes < 0) return null;

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${topPx}px` }}
    >
      <div className="flex items-center">
        <div className="-ml-1.5 w-3 h-3 rounded-full bg-destructive" />
        <div className="flex-1 h-[2px] bg-destructive" />
      </div>
    </div>
  );
};

export default CurrentTimeIndicator;
