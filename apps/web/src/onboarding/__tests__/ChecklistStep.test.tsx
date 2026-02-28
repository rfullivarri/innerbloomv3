import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChecklistStep } from '../steps/ChecklistStep';

const baseProps = {
  title: 'Test title',
  subtitle: 'Test subtitle',
  xpAmount: 13,
  items: ['A', 'B'],
  selected: ['A'],
  onToggle: () => {},
  onConfirm: () => {},
  onOpenChange: () => {},
};

describe('ChecklistStep optional open bonus chip', () => {
  it('shows +8 XP when optional textarea is empty or whitespace', () => {
    const { rerender } = render(<ChecklistStep {...baseProps} openValue="" />);

    expect(screen.getByText('+8 XP')).toBeInTheDocument();

    rerender(<ChecklistStep {...baseProps} openValue="   " />);

    expect(screen.getByText('+8 XP')).toBeInTheDocument();
  });

  it('shows +8 XP ✓ when optional textarea has content', () => {
    render(<ChecklistStep {...baseProps} openValue="algo escrito" />);

    expect(screen.getByText('+8 XP ✓')).toBeInTheDocument();
  });
});
