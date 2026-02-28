import { describe, expect, it } from 'vitest';
import { getDashboardSectionConfig } from './dashboardSections';

describe('dashboard editor navigation', () => {
  it('keeps editor navigation on an internal SPA route', () => {
    const editorSection = getDashboardSectionConfig('editor', '/dashboard-v3');

    expect(editorSection.to).toBe('/editor');
    expect(editorSection.to.startsWith('http://')).toBe(false);
    expect(editorSection.to.startsWith('https://')).toBe(false);
  });
});
