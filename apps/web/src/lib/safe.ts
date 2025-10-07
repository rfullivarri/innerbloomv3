const toArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  if (typeof value === 'object') {
    if (typeof (value as Iterable<T>)[Symbol.iterator] === 'function') {
      return Array.from(value as Iterable<T>);
    }

    return Object.values(value as Record<string, T>);
  }

  return [];
};

export const asArray = <T = any>(value: any, key?: string): T[] => {
  if (key && value != null) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return toArray<T>((value as Record<string, unknown>)[key]);
    }

    if (Array.isArray(value)) {
      return toArray<T>(value);
    }

    return [];
  }

  return toArray<T>(value);
};

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

export const safeMap = <T, R>(value: unknown, mapper: (item: T, index: number) => R): R[] => {
  return Array.isArray(value) ? (value as T[]).map(mapper) : [];
};
