// Le nom du client est facultatif sur un rendez-vous.
// Quand il est vide, on affiche l'intitulé du service à la place.

type AppointmentLike = {
  clientName?: string | null;
  services?: Array<{ name?: string | null }> | null;
} | null | undefined;

export const hasClientName = (appointment: AppointmentLike): boolean =>
  !!appointment?.clientName?.trim();

export const appointmentLabel = (appointment: AppointmentLike): string =>
  appointment?.clientName?.trim() || appointment?.services?.[0]?.name?.trim() || 'Rendez-vous';
