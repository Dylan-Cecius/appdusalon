import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock } from 'lucide-react';
import { useOpeningHours, type DaySchedule } from '@/hooks/useOpeningHours';

const OpeningHoursSettings = () => {
  const { schedule, saving, saveSchedule, DAY_LABELS, loading } = useOpeningHours();
  const [localSchedule, setLocalSchedule] = useState<DaySchedule[]>(schedule);
  const [hasBreak, setHasBreak] = useState<boolean[]>(
    schedule.map(s => !!(s.break_start && s.break_end))
  );

  // Sync local state when hook data loads
  const [initialized, setInitialized] = useState(false);
  if (!initialized && !loading && schedule.length > 0) {
    setLocalSchedule(schedule);
    setHasBreak(schedule.map(s => !!(s.break_start && s.break_end)));
    setInitialized(true);
  }

  const updateDay = (dayIndex: number, field: keyof DaySchedule, value: any) => {
    setLocalSchedule(prev =>
      prev.map(d => d.day_of_week === dayIndex ? { ...d, [field]: value } : d)
    );
  };

  const toggleBreak = (dayIndex: number, enabled: boolean) => {
    setHasBreak(prev => {
      const next = [...prev];
      next[dayIndex] = enabled;
      return next;
    });
    if (!enabled) {
      setLocalSchedule(prev =>
        prev.map(d => d.day_of_week === dayIndex ? { ...d, break_start: null, break_end: null } : d)
      );
    } else {
      setLocalSchedule(prev =>
        prev.map(d => d.day_of_week === dayIndex ? { ...d, break_start: d.break_start || '12:00', break_end: d.break_end || '14:00' } : d)
      );
    }
  };

  const handleSave = () => {
    saveSchedule(localSchedule);
  };

  if (loading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-primary">Heures d'ouverture</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">Configurez les horaires d'ouverture de votre salon</p>
        </div>
      </div>

      <div className="space-y-4">
        {localSchedule.map((day) => (
          <div
            key={day.day_of_week}
            className={`p-3 sm:p-4 border rounded-lg transition-colors ${
              day.is_open ? 'bg-background' : 'bg-muted/40 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={day.is_open}
                  onCheckedChange={(checked) => updateDay(day.day_of_week, 'is_open', checked)}
                />
                <Label className="font-medium text-sm sm:text-base">
                  {DAY_LABELS[day.day_of_week]}
                </Label>
              </div>
              {!day.is_open && (
                <span className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded-full">
                  Fermé
                </span>
              )}
            </div>

            {day.is_open && (
              <div className="space-y-3 ml-0 sm:ml-12">
                {/* Opening hours */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <Label className="text-xs text-muted-foreground w-16">Ouverture</Label>
                  <Input
                    type="time"
                    value={day.open_time}
                    onChange={(e) => updateDay(day.day_of_week, 'open_time', e.target.value)}
                    className="w-28"
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="time"
                    value={day.close_time}
                    onChange={(e) => updateDay(day.day_of_week, 'close_time', e.target.value)}
                    className="w-28"
                  />
                </div>

                {/* Break toggle */}
                <div className="flex items-center gap-3">
                  <Switch
                    checked={hasBreak[day.day_of_week]}
                    onCheckedChange={(checked) => toggleBreak(day.day_of_week, checked)}
                  />
                  <Label className="text-xs sm:text-sm text-muted-foreground">Pause méridienne</Label>
                </div>

                {/* Break hours */}
                {hasBreak[day.day_of_week] && (
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <Label className="text-xs text-muted-foreground w-16">Pause</Label>
                    <Input
                      type="time"
                      value={day.break_start || '12:00'}
                      onChange={(e) => updateDay(day.day_of_week, 'break_start', e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="time"
                      value={day.break_end || '14:00'}
                      onChange={(e) => updateDay(day.day_of_week, 'break_end', e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder les horaires'}
        </Button>
      </div>
    </Card>
  );
};

export default OpeningHoursSettings;
