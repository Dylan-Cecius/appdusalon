/** Shared accent/case/outer-whitespace normalization used by agenda and client search. */
export const normalizeSearchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function matchesClientSearch(client: { name: string; phone: string; email?: string | null }, query: string): boolean {
  const normalized = normalizeSearchText(query);
  if (!normalized) return true;
  const digits = query.replace(/\D/g, '');
  if (digits && /^[\d\s+()./-]+$/.test(query.trim())) return (client.phone || '').replace(/\D/g, '').includes(digits);
  const haystack = normalizeSearchText([client.name, client.phone, client.email || ''].join(' '));
  return normalized.split(/\s+/).every(token => haystack.includes(token));
}
