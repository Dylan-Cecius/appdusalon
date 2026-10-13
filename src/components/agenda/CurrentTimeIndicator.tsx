import { useEffect, useState } from 'react';

interface CurrentTimeIndicatorProps {
  startHour: number;
  slotHeight: number;
  minutesPerSlot?: number;
}

const CurrentTimeIndicator = ({
  startHour,
  slotHeight,
  minutesPerSlot = 15,
}: CurrentTimeIndicatorProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const totalMinutes = (currentHour - startHour) * 60 + currentMinutes;
  const topPx = (totalMinutes / minutesPerSlot) * slotHeight;

  if (totalMinutes < 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30"
      style={{ top: `${topPx}px` }}
    >
      <div className="flex items-center">
        <div className="-ml-1.5 h-3 w-3 rounded-full bg-red-500 shadow-sm" />
        <div className="h-[2px] flex-1 bg-red-500/80" />
      </div>
    </div>
  );
};

export default CurrentTimeIndicator;
