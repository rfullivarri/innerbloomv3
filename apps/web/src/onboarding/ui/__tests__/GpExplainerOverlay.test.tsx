import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GpExplainerOverlay } from '../GpExplainerOverlay';

describe('GpExplainerOverlay', () => {
  it('renders updated visual structure with chip, progress bar and bullet copy', () => {
    const onClose = vi.fn();

    render(<GpExplainerOverlay language="es" onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Cómo funcionan los GP' })).toBeInTheDocument();
    expect(screen.getByText('+ GP')).toBeInTheDocument();
    expect(screen.getByText('0 GP')).toBeInTheDocument();

    expect(screen.getByText(/Cada respuesta y acción suma/i)).toBeInTheDocument();
    const bulletTexts = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(bulletTexts).toContain('Los GP reflejan tu constancia diaria.');
    expect(bulletTexts).toContain('Más GP = mayor nivel.');

    expect(screen.getByText('constancia diaria')).toHaveClass('font-semibold');
    expect(screen.getAllByText('GP').length).toBeGreaterThanOrEqual(3);
  });

  it('closes on CTA click', () => {
    const onClose = vi.fn();

    render(<GpExplainerOverlay language="es" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
