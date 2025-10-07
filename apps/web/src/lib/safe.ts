export const asArray = <T = any>(v: any, key?: string): T[] =>
  Array.isArray(v) ? v : key && Array.isArray(v?.[key]) ? v[key] : [];

export const dateStr = (v: any): string =>
  typeof v === 'string'
    ? v.slice(0, 10)
    : v instanceof Date
    ? v.toISOString().slice(0, 10)
    : typeof v === 'number'
    ? new Date(v).toISOString().slice(0, 10)
    : v?.toString
    ? new Date(v).toISOString().slice(0, 10)
    : '';
