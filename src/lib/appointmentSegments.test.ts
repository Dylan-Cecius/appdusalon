import { describe, expect, it } from 'vitest';
import type { Appointment, AppointmentSegment } from '@/data/appointments';
import { appointmentOccupancyOverlaps, getAppointmentSegments, shiftAppointmentSegments } from './appointmentSegments';

const time = (minutes: number) => new Date(2026, 9, 13, 9, minutes);
const segment = (from: number, to: number, type: AppointmentSegment['type']): AppointmentSegment => ({
  id: `segment-${from}`, type, label: type, startTime: time(from), endTime: time(to), occupiesStaff: type !== 'pause',
});
const appointment = (from = 0, to = 90): Appointment => ({
  id: 'rdv', clientName: 'Emma', clientPhone: '', services: [], startTime: time(from), endTime: time(to),
  status: 'scheduled', totalPrice: 75, isPaid: false,
});
const color = (): Appointment => ({ ...appointment(), segments: [segment(0, 30, 'work'), segment(30, 60, 'pause'), segment(60, 80, 'work'), segment(80, 90, 'cleanup')] });

describe('saved appointment phases', () => {
  it('restores serialized dates and sorts without mutating the snapshot', () => {
    const original = color();
    const saved = JSON.parse(JSON.stringify(original));
    saved.segments.reverse();
    expect(getAppointmentSegments(saved).map(item => item.startTime)).toEqual([time(0), time(30), time(60), time(80)]);
    expect(saved.segments[0].type).toBe('cleanup');
  });
  it('allows a booking exactly inside a free processing interval', () => {
    expect(appointmentOccupancyOverlaps(color(), appointment(30, 60))).toBe(false);
    expect(appointmentOccupancyOverlaps(appointment(30, 60), color())).toBe(false);
  });
  it('rejects crossing into work or cleanup, even by one minute', () => {
    for (const [from, to] of [[29, 45], [45, 61], [80, 85]]) {
      expect(appointmentOccupancyOverlaps(color(), appointment(from, to))).toBe(true);
    }
  });
  it('respects occupiesStaff even when a pause is not free', () => {
    const allOccupied = color(); allOccupied.segments![1].occupiesStaff = true;
    expect(appointmentOccupancyOverlaps(allOccupied, appointment(30, 60))).toBe(true);
  });
  it.each(['missing', 'gap', 'overlap', 'invalid date', 'outside', 'invalid type'])('falls back to full occupancy for %s details', reason => {
    const broken = color();
    if (reason === 'missing') broken.segments = [];
    if (reason === 'gap') broken.segments!.splice(1, 1);
    if (reason === 'overlap') broken.segments![1].startTime = time(29);
    if (reason === 'invalid date') broken.segments![1].endTime = new Date('invalid');
    if (reason === 'outside') broken.segments![3].endTime = time(91);
    if (reason === 'invalid type') broken.segments![1].type = 'unknown' as AppointmentSegment['type'];
    expect(getAppointmentSegments(broken)).toEqual([]);
    expect(appointmentOccupancyOverlaps(broken, appointment(30, 60))).toBe(true);
  });
  it('moves all phases together across a date boundary without changing durations', () => {
    const original = color();
    const newStart = new Date(2026, 9, 14, 11);
    const shifted = shiftAppointmentSegments(original, newStart);
    expect(shifted[1].startTime).toEqual(new Date(2026, 9, 14, 11, 30));
    expect(shifted[3].endTime).toEqual(new Date(2026, 9, 14, 12, 30));
    expect(original.segments![0].startTime).toEqual(time(0));
  });
});
