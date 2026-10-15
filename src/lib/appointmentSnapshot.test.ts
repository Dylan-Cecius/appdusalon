import { describe, expect, it } from 'vitest';
import { confirmedAppointmentSnapshot } from './appointmentSnapshot';
const empty = { data: [], error: null };
describe('appointment snapshot availability', () => {
  it('confirms an empty agenda only when both queries succeeded', () => {
    expect(confirmedAppointmentSnapshot(empty, empty)).toEqual({ appointments: [], segments: [], availabilityVerified: true });
  });
  it('rejects missing appointment data and query errors rather than inventing an empty day', () => {
    expect(() => confirmedAppointmentSnapshot({ data: null, error: null }, empty)).toThrow('unavailable');
    const error = new Error('synthetic access denied');
    expect(() => confirmedAppointmentSnapshot({ data: [], error }, empty)).toThrow(error);
  });
  it.each([{ data: null, error: null }, { data: [], error: new Error('synthetic segments denied') }])('keeps readable rows but invalidates incomplete availability: %j', segments => {
    const appointments = [{ id: 'synthetic' }];
    expect(confirmedAppointmentSnapshot({ data: appointments, error: null }, segments)).toEqual({ appointments, segments: [], availabilityVerified: false });
  });
  it('discards partial segment data returned with an error', () => {
    expect(confirmedAppointmentSnapshot(empty, { data: [{ id: 'partial' }], error: 'interrupted' }).segments).toEqual([]);
  });
  it('restores verified availability after a complete successful refresh', () => {
    expect(confirmedAppointmentSnapshot({ data: [{ id: 'synthetic' }], error: null }, { data: [{ id: 'segment' }], error: null }).availabilityVerified).toBe(true);
  });
});
