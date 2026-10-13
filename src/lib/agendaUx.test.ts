import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('agenda UX contract', () => {
  it('keeps day/week navigation and density controls', () => {
    const header = read('src/components/agenda/AgendaHeader.tsx');

    expect(header).toContain("export type AgendaViewMode = 'day' | 'week'");
    expect(header).toContain('AgendaSlotInterval = 15 | 30');
    expect(header).toContain("mode === 'day' ? 'Jour' : 'Semaine'");
    expect(header).toContain('{minutes} min');
  });

  it('keeps a visual mini calendar and collaborator filtering', () => {
    const agenda = read('src/components/agenda/AgendaWorkspace.tsx');

    expect(agenda).toContain('MiniCalendar');
    expect(agenda).toContain('visibleMemberIds');
    expect(agenda).toContain('toggleMemberVisibility');
    expect(agenda).toContain('Collaborateurs');
  });

  it('keeps fast creation from empty slots and drag and drop', () => {
    const agenda = read('src/components/agenda/AgendaWorkspace.tsx');

    expect(agenda).toContain('DroppableSlot');
    expect(agenda).toContain('handleSlotClick');
    expect(agenda).toContain('handleDragEnd');
    expect(agenda).toContain('selectedTimeSlot');
  });

  it('keeps a weekly overview with direct return to day view', () => {
    const agenda = read('src/components/agenda/AgendaWorkspace.tsx');

    expect(agenda).toContain('weekDays');
    expect(agenda).toContain('visibleWeekAppointments');
    expect(agenda).toContain("setViewMode('day')");
  });
});
