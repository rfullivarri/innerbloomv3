export const dateStr = (v: any): string =>
  typeof v === 'string'
    ? v.slice(0, 10)
    : v instanceof Date
      ? v.toISOString().slice(0, 10)
      : typeof v === 'number'
        ? new Date(v).toISOString().slice(0, 10)
        : '';

export const asArray = <T = any>(v: any, k?: string): T[] =>
  Array.isArray(v) ? v : k && Array.isArray(v?.[k]) ? v[k] : [];
