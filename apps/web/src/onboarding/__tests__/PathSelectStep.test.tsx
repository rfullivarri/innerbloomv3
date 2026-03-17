import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PathSelectStep } from '../steps/PathSelectStep';

describe('PathSelectStep', () => {
  it('renders the path selection screen', () => {
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={() => {}} onSelectQuickStart={() => {}} />);

    expect(screen.getByText('¿Cómo querés arrancar hoy?')).toBeInTheDocument();
    expect(screen.getByText('Guía personal')).toBeInTheDocument();
    expect(screen.getByText('Inicio rápido')).toBeInTheDocument();
  });

  it('calls personal path callback from the CTA button', () => {
    const onSelectTraditional = vi.fn();
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={onSelectTraditional} onSelectQuickStart={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Guía personal' }));

    expect(onSelectTraditional).toHaveBeenCalledTimes(1);
  });

  it('calls quick start callback from quick start card', () => {
    const onSelectQuickStart = vi.fn();
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={() => {}} onSelectQuickStart={onSelectQuickStart} />);

    fireEvent.click(screen.getByRole('button', { name: /Inicio rápido/i }));

    expect(onSelectQuickStart).toHaveBeenCalledTimes(1);
  });
});
