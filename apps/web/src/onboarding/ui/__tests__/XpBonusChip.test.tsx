import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { XpBonusChip } from '../XpBonusChip';

describe('XpBonusChip', () => {
  it('shows the base bonus text when inactive', () => {
    render(<XpBonusChip bonus={8} active={false} />);

    expect(screen.getByText('+8 XP')).toBeInTheDocument();
    expect(screen.getByLabelText('Sumás 8 XP si completás este campo')).toBeInTheDocument();
  });

  it('shows checkmark when active', () => {
    render(<XpBonusChip bonus={8} active />);

    expect(screen.getByText('+8 XP ✓')).toBeInTheDocument();
  });
});
