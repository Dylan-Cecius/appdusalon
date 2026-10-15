/** A fulfilled request is not proof that the expected reservation was created. */
export function confirmedAppointmentCreation(data: unknown, salonId: string, expectedCount = 1, recurring = false) {
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (!salonId || !Number.isInteger(expectedCount) || expectedCount < 1 || rows.length !== expectedCount) {
    throw new Error('Création non confirmée. Vérifiez l’agenda avant de réessayer.');
  }
  const ids = new Set<string>();
  let group: string | undefined;
  for (const value of rows) {
    const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    if (typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id) || row.salon_id !== salonId) {
      throw new Error('Création non confirmée. Vérifiez l’agenda avant de réessayer.');
    }
    ids.add(row.id);
    if (recurring) {
      if (typeof row.recurrence_group_id !== 'string' || !row.recurrence_group_id || (group && group !== row.recurrence_group_id)) {
        throw new Error('Série non confirmée. Vérifiez l’agenda avant de réessayer.');
      }
      group = row.recurrence_group_id;
    }
  }
  return rows as Array<Record<string, any>>;
}
