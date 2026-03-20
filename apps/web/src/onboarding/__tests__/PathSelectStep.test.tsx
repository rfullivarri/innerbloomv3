import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PathSelectStep } from '../steps/PathSelectStep';

describe('PathSelectStep', () => {
  it('renders the path selection screen with no default selection and a disabled CTA', () => {
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={() => {}} onSelectQuickStart={() => {}} />);

    expect(screen.getByText('¿Cómo querés arrancar hoy?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guía personal' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Inicio rápido' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('enables the CTA and continues through the personal guide flow after selecting that card', () => {
    const onSelectTraditional = vi.fn();
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={onSelectTraditional} onSelectQuickStart={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guía personal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('button', { name: /Guía personal seleccionado/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Inicio rápido' })).toHaveAttribute('aria-pressed', 'false');
    expect(onSelectTraditional).toHaveBeenCalledTimes(1);
  });

  it('enables the CTA and continues through quick start after selecting that card', () => {
    const onSelectQuickStart = vi.fn();
    render(<PathSelectStep onBack={() => {}} onSelectTraditional={() => {}} onSelectQuickStart={onSelectQuickStart} />);

    fireEvent.click(screen.getByRole('button', { name: 'Inicio rápido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(screen.getByRole('button', { name: /Inicio rápido seleccionado/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Guía personal' })).toHaveAttribute('aria-pressed', 'false');
    expect(onSelectQuickStart).toHaveBeenCalledTimes(1);
  });
});
