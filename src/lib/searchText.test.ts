import { describe, expect, it } from 'vitest';
import { matchesClientSearch } from './searchText';
const client = { name: 'Élodie De Smet', phone: '+32 (0) 471-12.34.56', email: 'Elodie@example.test' };
describe('client search', () => {
  it.each(['elodie',' ÉLODIE ','smet elodie','de smet','example.test','471123456','+32 (0) 471','', '   '])('matches %s without changing source data', query => { expect(matchesClientSearch(client,query)).toBe(true); });
  it.each(['elodie 999','jean 471','0479','other.test'])('does not turn %s into a partial numeric match', query => { expect(matchesClientSearch(client,query)).toBe(false); });
  it('handles missing optional email', () => { expect(matchesClientSearch({name:'Alex',phone:'04'},'alex')).toBe(true); });
});
