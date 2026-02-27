import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { CurrentUserSubscriptionResponse } from '../../lib/api';

function diffDays(targetIso: string | null): number | null {
  if (!targetIso) return null;
  const target = new Date(targetIso);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const ms = startTarget.getTime() - startToday.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function diffMonthsLabel(targetIso: string | null): string {
  if (!targetIso) return 'FREE';
  const target = new Date(targetIso);
  const now = new Date();
  const months = Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
  return `FREE · ${months}M`;
}

export function PlanChip({ subscription }: { subscription: CurrentUserSubscriptionResponse | null }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const display = useMemo(() => {
    const status = subscription?.status ?? 'inactive';
    const plan = (subscription?.plan ?? 'FREE').toUpperCase();
    const endDate = subscription?.nextRenewalAt ?? subscription?.trialEndsAt ?? null;
    const days = diffDays(endDate);
    const isExpiring = days != null && days >= 0 && days <= 10;

    if (status === 'inactive' || plan === 'FREE' || status === 'trialing') {
      return {
        desktop: diffMonthsLabel(subscription?.trialEndsAt ?? endDate),
        mobile: 'FREE',
        planName: 'Free',
        endDate,
      };
    }

    if (isExpiring) {
      return { desktop: 'EXPIRA PRONTO', mobile: 'EXPIRA', planName: 'Pro', endDate };
    }

    if (status === 'active') {
      return { desktop: 'PRO', mobile: 'PRO', planName: 'Pro', endDate };
    }

    return { desktop: 'EN PAUSA', mobile: 'PAUSA', planName: 'Pro', endDate };
  }, [subscription]);

  const dateLabel = display.endDate ? new Date(display.endDate).toLocaleDateString('es-ES') : '—';

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = 288;
      const viewportPadding = 16;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - panelWidth),
        window.innerWidth - panelWidth - viewportPadding,
      );

      setPosition({
        top: rect.bottom + 8,
        left,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const planModal = open ? (
    <div className="fixed inset-0 z-[110]" onClick={() => setOpen(false)}>
      <div
        className="absolute w-72 rounded-2xl border border-white/20 bg-surface p-4"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs text-text-muted">Plan actual: {display.planName}</p>
        <p className="mt-1 text-sm text-white">Vence el: {dateLabel}</p>
        <Link to="/pricing" onClick={() => setOpen(false)} className="mt-3 inline-flex rounded-full border border-white/30 px-3 py-1 text-xs text-white">
          Ver planes
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100"
      >
        <span className="hidden md:inline">{display.desktop}</span>
        <span className="md:hidden">{display.mobile}</span>
      </button>

      {typeof document !== 'undefined' ? createPortal(planModal, document.body) : null}
    </>
  );
}
