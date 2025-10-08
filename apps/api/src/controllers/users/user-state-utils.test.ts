import { describe, expect, it } from 'vitest';
import { formatDateInTimezone } from './user-state-utils.js';

describe('formatDateInTimezone', () => {
  it('formats the date using a valid timezone', () => {
    const date = new Date('2024-02-29T12:00:00Z');

    expect(formatDateInTimezone(date, 'America/Bogota')).toBe('2024-02-29');
  });

  it('falls back to UTC when timezone is invalid', () => {
    const date = new Date('2024-02-29T12:00:00Z');

    expect(formatDateInTimezone(date, 'Invalid/Timezone')).toBe('2024-02-29');
  });

  it('trims whitespace and still formats the date', () => {
    const date = new Date('2024-02-29T12:00:00Z');

    expect(formatDateInTimezone(date, '  America/Bogota  ')).toBe('2024-02-29');
  });

  it('defaults to UTC when timezone is blank', () => {
    const date = new Date('2024-02-29T12:00:00Z');

    expect(formatDateInTimezone(date, '   ')).toBe('2024-02-29');
  });
});
