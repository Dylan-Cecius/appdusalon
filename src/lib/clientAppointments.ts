export interface ClientAppointment {
  id: string;
  clientName: string;
  clientPhone: string;
  startTime: Date;
  endTime: Date;
  services: { name: string }[];
  status: 'pending_payment' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  totalPrice: number;
  isPaid: boolean;
}

/** Read-only client history projection, independent of agenda segments and mutations. */
export function normalizeClientAppointment(input: unknown): ClientAppointment {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_client_appointment');
  const row = input as Record<string, unknown>;
  const start = typeof row.start_time === 'string' ? Date.parse(row.start_time) : NaN;
  const end = typeof row.end_time === 'string' ? Date.parse(row.end_time) : NaN;
  const amount = typeof row.total_price === 'number' || (typeof row.total_price === 'string' && row.total_price.trim()) ? Number(row.total_price) : NaN;
  if (typeof row.id !== 'string' || !row.id || typeof row.client_phone !== 'string' || typeof row.client_name !== 'string' || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(amount) || amount < 0 || typeof row.is_paid !== 'boolean' || !['pending_payment','scheduled','completed','cancelled','no_show'].includes(String(row.status)) || !Array.isArray(row.services)) throw new Error('invalid_client_appointment');
  const services = row.services.map(service => {
    if (!service || typeof service !== 'object' || typeof service.name !== 'string') throw new Error('invalid_client_services');
    return { name: service.name as string };
  });
  return { id: row.id, clientName: row.client_name, clientPhone: row.client_phone, startTime: new Date(start), endTime: new Date(end), services, status: row.status as ClientAppointment['status'], totalPrice: amount, isPaid: row.is_paid };
}
