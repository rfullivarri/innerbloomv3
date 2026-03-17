import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PathSelectStep } from '../steps/PathSelectStep';

describe('PathSelectStep', () => {
  it('renders the path selection screen', () => {
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={() => {}} />);

    expect(screen.getByText('¿Cómo querés arrancar hoy?')).toBeInTheDocument();
    expect(screen.getByText('Guía personal')).toBeInTheDocument();
    expect(screen.getByText('Inicio rápido')).toBeInTheDocument();
  });

  it('calls personal path callback from the CTA button', () => {
    const onSelectTraditional = vi.fn();
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={onSelectTraditional} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Guía personal' }));

    expect(onSelectTraditional).toHaveBeenCalledTimes(1);
  });
});

