export function confirmedTimeOffId(data: unknown, expectedId?: string): string {
  const result = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  if (typeof result.id !== 'string' || !result.id.trim() || (expectedId !== undefined && result.id !== expectedId)) {
    throw new Error('Modification non confirmée. Vérifiez les indisponibilités avant de réessayer.');
  }
  return result.id;
}
