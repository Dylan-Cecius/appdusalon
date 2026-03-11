import { useState, useEffect } from 'react';

interface CurrentTimeIndicatorProps {
  startHour: number;
  slotHeight: number;
}

const CurrentTimeIndicator = ({ startHour, slotHeight }: CurrentTimeIndicatorProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
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
        <div className="w-2.5 h-2.5 rounded-full bg-destructive shadow-md shadow-destructive/30 -ml-1" />
        <div className="flex-1 h-[2px] bg-destructive shadow-sm shadow-destructive/20" />
      </div>
    </div>
  );
};

export default CurrentTimeIndicator;
