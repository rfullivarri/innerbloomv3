import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GpExplainerOverlay } from '../GpExplainerOverlay';

describe('GpExplainerOverlay', () => {
  it('renders updated visual structure with chip, progress bar and bullet copy', () => {
    const onClose = vi.fn();

    render(<GpExplainerOverlay language="es" onClose={onClose} />);

    expect(screen.getByRole('heading', { name: 'Cómo funcionan los Growth Points' })).toBeInTheDocument();
    expect(screen.getByText('+ GP')).toBeInTheDocument();
    expect(screen.getByText('0 GP')).toBeInTheDocument();

    expect(screen.getByText('Cada respuesta y acción suma Growth Points.')).toBeInTheDocument();
    expect(screen.getByText('Los Growth Points reflejan tu constancia.')).toBeInTheDocument();
    expect(screen.getByText('Más Growth Points → mayor nivel.')).toBeInTheDocument();
  });

  it('closes on CTA click', () => {
    const onClose = vi.fn();

    render(<GpExplainerOverlay language="es" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
