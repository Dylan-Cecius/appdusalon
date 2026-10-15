type QueryResult<T> = { data: T[] | null; error: unknown };

/** Keep readable appointments, but don't certify availability without both queries. */
export function confirmedAppointmentSnapshot<T, S>(appointments: QueryResult<T>, segments: QueryResult<S>) {
  if (appointments.error) throw appointments.error;
  if (!Array.isArray(appointments.data)) throw new Error('appointment_snapshot_unavailable');
  const availabilityVerified = !segments.error && Array.isArray(segments.data);
  return { appointments: appointments.data, segments: availabilityVerified ? segments.data! : [], availabilityVerified };
}
