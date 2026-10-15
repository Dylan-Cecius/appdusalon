import { describe, expect, it } from 'vitest';
import { clientCsvCell, clientCsvRow } from './clientCsv';

describe('client CSV export', () => {
  it('keeps quotes, commas and line breaks inside the original cell', () => {
    expect(clientCsvRow(['Zoé "Z", test', 'Ligne 1\r\nLigne 2', 'fin']))
      .toBe('"Zoé ""Z"", test","Ligne 1\r\nLigne 2","fin"');
  });
  it.each(['=1+1', '+33123456789', '-1+1', '@SUM(A1)', '＝1', '＋1', '－1', '＠A1', '  =1', '\t=1', '\r=1', '\n=1'])('prefixes potentially interpreted text: %j', value => {
    expect(clientCsvCell(value)).toBe(`"\t${value}"`);
  });
  it('preserves ordinary text, empty cells and finite numeric values', () => {
    expect(clientCsvRow(['Élise', '0123456789', '', null, undefined, 0, -12.5]))
      .toBe('"Élise","0123456789","","","","0","-12.5"');
  });
  it.each([NaN, Infinity, -Infinity])('rejects invalid numeric values: %s', value => {
    expect(() => clientCsvCell(value)).toThrow('invalid_csv_number');
  });
  it('contains an injected delimiter rather than creating a formula cell', () => {
    expect(clientCsvCell('text",=1+1,"')).toBe('"text"",=1+1,"""');
  });
});
