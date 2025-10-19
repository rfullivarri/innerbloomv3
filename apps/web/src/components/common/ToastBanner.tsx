type ToastTone = 'success' | 'error' | 'info';

const TONE_CLASSNAMES: Record<ToastTone, string> = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
};

interface ToastBannerProps {
  tone: ToastTone;
  message: string;
  className?: string;
}

export function ToastBanner({ tone, message, className = '' }: ToastBannerProps) {
  const toneClass = TONE_CLASSNAMES[tone] ?? TONE_CLASSNAMES.info;
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${toneClass} ${className}`.trim()}>
      {message}
    </div>
  );
}
