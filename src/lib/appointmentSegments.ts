import type { Appointment, AppointmentSegment } from '@/data/appointments';

// Use the saved appointment snapshot, never the current service catalogue.
// Incomplete snapshots fall back to a single occupied appointment.
export function getAppointmentSegments(appointment: Appointment): AppointmentSegment[] {
  if (!Array.isArray(appointment.segments) || !appointment.segments.length || appointment.segments.some(segment => !segment || typeof segment !== 'object')) return [];
  const start = new Date(appointment.startTime).getTime();
  const end = new Date(appointment.endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const segments = appointment.segments.map(segment => ({
    ...segment, startTime: new Date(segment.startTime), endTime: new Date(segment.endTime),
  })).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  let cursor = start;
  for (const segment of segments) {
    if (!['work', 'pause', 'cleanup', 'block'].includes(segment.type) ||
      typeof segment.label !== 'string' || typeof segment.occupiesStaff !== 'boolean' ||
      segment.startTime.getTime() !== cursor || !Number.isFinite(segment.endTime.getTime()) ||
      segment.endTime.getTime() <= cursor || segment.endTime.getTime() > end) return [];
    cursor = segment.endTime.getTime();
  }
  return cursor === end ? segments : [];
}

export function shiftAppointmentSegments(appointment: Appointment, start: Date): AppointmentSegment[] {
  const delta = start.getTime() - new Date(appointment.startTime).getTime();
  return getAppointmentSegments(appointment).map(segment => ({
    ...segment,
    startTime: new Date(segment.startTime.getTime() + delta),
    endTime: new Date(segment.endTime.getTime() + delta),
  }));
}

export function appointmentOccupancyOverlaps(first: Appointment, second: Appointment): boolean {
  const occupied = (appointment: Appointment) => {
    const segments = getAppointmentSegments(appointment);
    return segments.length ? segments.filter(segment => segment.occupiesStaff)
      : [{ startTime: new Date(appointment.startTime), endTime: new Date(appointment.endTime) }];
  };
  return occupied(first).some(a => occupied(second).some(b => a.startTime < b.endTime && a.endTime > b.startTime));
}
