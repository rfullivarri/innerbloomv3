import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { ModerationTrackerIcon, moderationTrackerMeta } from '../../../../components/moderation/trackerMeta';
import { classifyUserTask, createUserTask, getDailyReminderSettings, updateDailyReminderSettings, type GameModeUpgradeSuggestion, type ModerationTracker, type ModerationTrackerType, type SubmitDailyQuestFeedbackEvent, type SubmitDailyQuestResponse, type UserTaskClassification } from '../../../../lib/api';
import { useDifficulties } from '../../../../hooks/useCatalogs';
import { TimezoneCombobox } from '../../../../components/common/TimezoneCombobox';
import { getTimezoneCatalog, resolveDefaultTimezone } from '../../../../lib/timezones';
import { TraitIcon } from '../MobilePremiumPrimitives';
import type { MobilePremiumTheme } from '../mobilePremiumTokens';
import {
  formatPremiumRhythmLabel,
  hasActivePremiumRhythmSuggestion,
  PremiumRhythmRecommendationSheet,
} from './PremiumRhythmRecommendation';

export type PremiumOverlayKind =
  | 'menu'
  | 'daily-complete'
  | 'dquest-completed'
  | 'streak-feedback'
  | 'reminders'
  | 'ai-task'
  | 'profile'
  | 'delete-account'
  | 'rhythm'
  | 'widgets'
  | 'moderation-edit'
  | 'level-feedback'
  | 'moderation'
  | null;

type OverlayAction = (overlay: Exclude<PremiumOverlayKind, null>) => void;

export function PremiumInteractionOverlays({
  activeOverlay,
  activeFeedbackEvent,
  backendUserId,
  dailyCompleteSummary,
  onClose,
  onOpen,
  onOpenUserProfile,
  onReminderSaved,
  onReviewProgress,
  onGoDashboard,
  onShowFeedbackEvent,
  onThemeToggle,
  theme,
  userEmail,
  userImageUrl,
  userName,
  gameMode,
  moderationTracker,
  moderationTrackers = [],
  moderationPendingType,
  onModerationDetail,
  onModerationToleranceChange,
  onToggleModerationEnabled,
  onToggleModerationPause,
  onManualRhythmChange,
  onUpgradeRhythmConfirm,
  rhythmSuggestion,
  rhythmSuggestionSubmitting = false,
}: {
  activeOverlay: PremiumOverlayKind;
  activeFeedbackEvent?: SubmitDailyQuestFeedbackEvent | null;
  backendUserId?: string | null;
  dailyCompleteSummary?: {
    emotionColor: string;
    emotionName: string;
    gpTotal: number;
    response: SubmitDailyQuestResponse;
    selectedTasks: number;
    totalTasks: number;
  };
  onClose: () => void;
  onOpen: OverlayAction;
  onOpenUserProfile?: () => void;
  onReminderSaved?: () => void | Promise<void>;
  onReviewProgress?: () => void;
  onGoDashboard?: () => void;
  onShowFeedbackEvent?: (event: SubmitDailyQuestFeedbackEvent) => void;
  onThemeToggle: () => void;
  theme: MobilePremiumTheme;
  userEmail: string | null;
  userImageUrl?: string | null;
  userName: string;
  gameMode: string | null;
  moderationTracker?: ModerationTracker | null;
  moderationTrackers?: ModerationTracker[];
  moderationPendingType?: ModerationTrackerType | null;
  onModerationDetail?: (tracker: ModerationTracker) => void;
  onModerationToleranceChange?: (tracker: ModerationTracker, days: number) => void;
  onToggleModerationEnabled?: (type: ModerationTrackerType, enabled: boolean) => void;
  onToggleModerationPause?: (tracker: ModerationTracker, shouldPause: boolean) => void;
  onManualRhythmChange?: (mode: string) => void;
  onUpgradeRhythmConfirm?: () => Promise<void>;
  rhythmSuggestion?: GameModeUpgradeSuggestion | null;
  rhythmSuggestionSubmitting?: boolean;
}) {
  if (!activeOverlay) return null;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end justify-center bg-black/42 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-xl">
      {activeOverlay === 'menu' ? (
        <PremiumMenuSheet
          gameMode={gameMode}
          onClose={onClose}
          onOpen={onOpen}
          onThemeToggle={onThemeToggle}
          rhythmSuggestion={rhythmSuggestion}
          theme={theme}
          userEmail={userEmail}
          userName={userName}
        />
      ) : null}
      {activeOverlay === 'daily-complete' ? (
        <DailyCompleteSheet onClose={onClose} onReviewProgress={onReviewProgress} onShowFeedbackEvent={onShowFeedbackEvent} summary={dailyCompleteSummary} />
      ) : null}
      {activeOverlay === 'dquest-completed' ? <DQuestCompletedSheet onClose={onClose} onGoDashboard={onGoDashboard ?? onClose} summary={dailyCompleteSummary} /> : null}
      {activeOverlay === 'streak-feedback' ? <PremiumStreakFeedbackSheet event={activeFeedbackEvent} onClose={onClose} /> : null}
      {activeOverlay === 'level-feedback' ? <PremiumLevelFeedbackSheet event={activeFeedbackEvent} onClose={onClose} /> : null}
      {activeOverlay === 'reminders' ? <ReminderSheet backendUserId={backendUserId ?? null} onClose={onClose} onSaved={onReminderSaved} /> : null}
      {activeOverlay === 'ai-task' ? <AiTaskSheet backendUserId={backendUserId ?? null} onClose={onClose} /> : null}
      {activeOverlay === 'profile' ? (
        <ProfileSheet imageUrl={userImageUrl ?? null} onClose={onClose} onDelete={() => onOpen('delete-account')} onOpenUserProfile={onOpenUserProfile} userEmail={userEmail} userName={userName} />
      ) : null}
      {activeOverlay === 'delete-account' ? <DeleteAccountSheet onCancel={() => onOpen('profile')} onClose={onClose} /> : null}
      {activeOverlay === 'rhythm' && hasActivePremiumRhythmSuggestion(rhythmSuggestion ?? null) && rhythmSuggestion ? (
        <PremiumRhythmRecommendationSheet
          isSubmitting={rhythmSuggestionSubmitting}
          onClose={onClose}
          onConfirm={onUpgradeRhythmConfirm ?? (async () => undefined)}
          suggestion={rhythmSuggestion}
        />
      ) : null}
      {activeOverlay === 'rhythm' && !hasActivePremiumRhythmSuggestion(rhythmSuggestion ?? null) ? (
        <RhythmSheet currentMode={gameMode} onClose={onClose} onConfirmRhythm={onManualRhythmChange} />
      ) : null}
      {activeOverlay === 'widgets' ? (
        <WidgetsSheet
          onClose={onClose}
          onEdit={() => onOpen('moderation-edit')}
          onOpenDetail={onModerationDetail}
          onToggleEnabled={onToggleModerationEnabled}
          pendingType={moderationPendingType}
          trackers={moderationTrackers}
        />
      ) : null}
      {activeOverlay === 'moderation-edit' ? (
        <ModerationEditSheet
          onClose={onClose}
          onToleranceChange={onModerationToleranceChange}
          onTogglePause={onToggleModerationPause}
          pendingType={moderationPendingType}
          trackers={moderationTrackers}
        />
      ) : null}
      {activeOverlay === 'moderation' ? (
        <ModerationSheet onClose={onClose} onTogglePause={onToggleModerationPause} tracker={moderationTracker ?? null} />
      ) : null}
    </div>
  );
}

function PremiumSheet({
  eyebrow,
  title,
  children,
  onClose,
  className = '',
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <section
      className={`max-h-[88vh] w-full overflow-y-auto rounded-[1.8rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-bg-elevated)] p-5 text-[color:var(--mp-text)] shadow-[0_24px_72px_rgba(0,0,0,0.42)] ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-text-muted)]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight text-[color:var(--mp-text)]">{title}</h2>
        </div>
        <button
          aria-label="Cerrar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-2xl text-[color:var(--mp-text-secondary)]"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PremiumMenuSheet({
  gameMode,
  onClose,
  onOpen,
  onThemeToggle,
  rhythmSuggestion,
  theme,
  userEmail,
  userName,
}: {
  onClose: () => void;
  onOpen: OverlayAction;
  onThemeToggle: () => void;
  theme: MobilePremiumTheme;
  userEmail: string | null;
  userName: string;
  gameMode: string | null;
  rhythmSuggestion?: GameModeUpgradeSuggestion | null;
}) {
  const mode = (gameMode ?? 'Flow').trim() || 'Flow';
  const hasUpgrade = hasActivePremiumRhythmSuggestion(rhythmSuggestion ?? null);
  const suggestedMode = formatPremiumRhythmLabel(rhythmSuggestion?.suggested_mode ?? null);
  return (
    <PremiumSheet eyebrow="Menú" onClose={onClose} title="Tu espacio personal">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-grid grid-cols-2 rounded-full bg-[color:var(--mp-surface)] p-1 text-sm font-semibold text-[color:var(--mp-text-secondary)]">
          <span className="rounded-full bg-[color:var(--mp-toggle-active-bg)] px-5 py-2 text-[color:var(--mp-violet)]">ES</span>
          <span className="px-5 py-2">EN</span>
        </div>
        <button
          className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-violet)]"
          onClick={onThemeToggle}
          type="button"
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </div>

      <button
        aria-label="Abrir perfil"
        className="mt-6 flex w-full items-center gap-4 rounded-[1.25rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4 text-left transition hover:border-[color:var(--mp-violet)]/60"
        onClick={() => onOpen('profile')}
        type="button"
      >
        <ProfileAvatar name={userName} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{userName}</span>
          <span className="block truncate text-sm text-[color:var(--mp-text-secondary)]">{userEmail ?? 'Sandbox Labs'}</span>
        </span>
        <span className="text-2xl text-[color:var(--mp-text-muted)]">›</span>
      </button>

      <div className="mt-5 divide-y divide-[color:var(--mp-border)] rounded-[1.25rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)]">
        <MenuAction
          accent={hasUpgrade ? 'recommendation' : 'default'}
          icon={<TraitIcon size={21} trait="focus" />}
          label={hasUpgrade ? 'Ritmo recomendado' : 'Cambiar ritmo'}
          meta={hasUpgrade ? suggestedMode : mode.toUpperCase()}
          onClick={() => onOpen('rhythm')}
        />
        <MenuAction icon={<BellIcon />} label="Recordatorio" onClick={() => onOpen('reminders')} />
        <MenuAction icon={<WidgetsIcon />} label="Widgets" onClick={() => onOpen('widgets')} />
      </div>

      <button className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full border border-[color:var(--mp-border)] text-sm font-semibold text-[color:var(--mp-text-secondary)]" type="button">
        Cerrar sesión
      </button>
    </PremiumSheet>
  );
}

function ProfileSheet({
  imageUrl,
  onClose,
  onDelete,
  onOpenUserProfile,
  userEmail,
  userName,
}: {
  imageUrl: string | null;
  onClose: () => void;
  onDelete: () => void;
  onOpenUserProfile?: () => void;
  userEmail: string | null;
  userName: string;
}) {
  return (
    <PremiumSheet eyebrow="Perfil" onClose={onClose} title="Tu espacio personal">
      <div className="flex flex-col items-center text-center">
        <button className="group relative cursor-pointer" onClick={onOpenUserProfile} type="button">
          <ProfileAvatar imageUrl={imageUrl} name={userName} size="lg" />
          <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-bg-elevated)] text-sm text-[color:var(--mp-violet)] shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition group-hover:scale-105">
            +
          </span>
        </button>
        <p className="mt-4 max-w-full truncate text-xl font-semibold text-[color:var(--mp-text)]">{userName}</p>
        <p className="mt-1 max-w-full truncate text-sm text-[color:var(--mp-text-secondary)]">{userEmail ?? 'Sandbox Labs'}</p>
        <button className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-violet)]" onClick={onOpenUserProfile} type="button">Cambiar foto de perfil</button>
      </div>

      <div className="mt-7 divide-y divide-[color:var(--mp-border)] rounded-[1.25rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)]">
        <button className="flex min-h-14 w-full items-center gap-4 px-4 text-left" onClick={onOpenUserProfile} type="button">
          <span className="grid h-8 w-8 shrink-0 place-items-center text-[color:var(--mp-violet)]">
            <ProfileIcon />
          </span>
          <span className="min-w-0 flex-1 text-base font-semibold text-[color:var(--mp-text)]">Clerk Settings</span>
          <span className="text-2xl text-[color:var(--mp-text-muted)]">›</span>
        </button>
      </div>

      <button
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-rose-300/35 bg-rose-500/8 px-5 text-sm font-semibold text-rose-200"
        onClick={onDelete}
        type="button"
      >
        <TrashIcon />
        Eliminar cuenta
      </button>
    </PremiumSheet>
  );
}

function DeleteAccountSheet({
  onCancel,
  onClose,
}: {
  onCancel: () => void;
  onClose: () => void;
}) {
  const [confirmation, setConfirmation] = useState('');
  const normalizedConfirmation = confirmation.trim().toUpperCase();
  const canDelete = normalizedConfirmation === 'ELIMINAR' || normalizedConfirmation === 'DELETE';

  return (
    <section className="max-h-[88vh] w-full overflow-y-auto rounded-[1.45rem] border border-rose-300/40 bg-[color:var(--mp-bg-elevated)] p-5 text-[color:var(--mp-text)] shadow-[0_24px_72px_rgba(0,0,0,0.48)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-rose-200">Acción irreversible</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[color:var(--mp-text)]">Eliminar cuenta</h2>
        </div>
        <button
          aria-label="Cerrar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-2xl text-[color:var(--mp-text-secondary)]"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      <p className="mt-6 text-sm leading-6 text-[color:var(--mp-text-secondary)]">
        Esto elimina tu cuenta de forma permanente. No vas a poder recuperar tu perfil ni tu progreso después de confirmar.
      </p>

      <label className="mt-7 block">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Escribí ELIMINAR para confirmar</span>
        <input
          className="mt-3 h-14 w-full rounded-[1rem] border border-rose-300/38 bg-rose-950/20 px-4 text-base font-semibold uppercase tracking-[0.12em] text-[color:var(--mp-text)] outline-none placeholder:text-rose-100/24 focus:border-rose-200"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="ELIMINAR"
          value={confirmation}
        />
      </label>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="min-h-12 rounded-full border border-[color:var(--mp-border)] text-sm font-semibold text-[color:var(--mp-text-secondary)]" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button
          className={`min-h-12 rounded-full border px-4 text-sm font-semibold transition ${
            canDelete
              ? 'border-rose-300/45 bg-rose-500/18 text-rose-100'
              : 'border-rose-300/20 bg-rose-500/8 text-rose-200/40'
          }`}
          disabled={!canDelete}
          onClick={onClose}
          type="button"
        >
          Eliminar definitivamente
        </button>
      </div>
    </section>
  );
}

function ProfileAvatar({
  imageUrl,
  name,
  size,
}: {
  imageUrl?: string | null;
  name: string;
  size: 'sm' | 'lg';
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'IB';
  const sizeClass = size === 'lg' ? 'h-24 w-24 text-2xl' : 'h-12 w-12 text-sm';

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-emerald-300/24 bg-[radial-gradient(circle_at_35%_25%,rgba(134,239,172,0.85),rgba(34,197,94,0.24)_42%,rgba(167,139,250,0.22)_74%,rgba(255,255,255,0.04))] font-semibold text-emerald-50 shadow-[0_0_34px_rgba(34,197,94,0.18)] ${sizeClass}`}
    >
      {imageUrl ? <img alt="" className="h-full w-full object-cover" src={imageUrl} /> : initials}
    </span>
  );
}

function MenuAction({
  accent = 'default',
  icon,
  label,
  meta,
  onClick,
}: {
  accent?: 'default' | 'recommendation';
  icon: ReactNode;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-14 w-full items-center gap-4 px-4 text-left ${
        accent === 'recommendation'
          ? 'bg-[linear-gradient(90deg,rgba(167,139,250,0.13),rgba(104,211,145,0.08))]'
          : ''
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center ${accent === 'recommendation' ? 'text-[color:var(--mp-green)]' : 'text-[color:var(--mp-violet)]'}`}>{icon}</span>
      <span className="min-w-0 flex-1 text-base font-semibold text-[color:var(--mp-text)]">{label}</span>
      {meta ? (
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            accent === 'recommendation'
              ? 'border-emerald-300/26 bg-emerald-300/10 text-[color:var(--mp-green)]'
              : 'border-emerald-300/30 text-[color:var(--mp-green)]'
          }`}
        >
          {meta}
        </span>
      ) : null}
      <span className="text-2xl text-[color:var(--mp-text-muted)]">›</span>
    </button>
  );
}

function WidgetsSheet({
  onClose,
  onEdit,
  onOpenDetail,
  onToggleEnabled,
  pendingType,
  trackers,
}: {
  onClose: () => void;
  onEdit: () => void;
  onOpenDetail?: (tracker: ModerationTracker) => void;
  onToggleEnabled?: (type: ModerationTrackerType, enabled: boolean) => void;
  pendingType?: ModerationTrackerType | null;
  trackers: ModerationTracker[];
}) {
  const enabledTrackers = trackers.filter((tracker) => tracker.is_enabled);

  return (
    <PremiumSheet eyebrow="Widgets" onClose={onClose} title="Tu dashboard">
      <p className="text-sm leading-6 text-[color:var(--mp-text-secondary)]">Elegí las funciones que querés seguir de cerca.</p>

      <div className="mt-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Activos</p>
        {enabledTrackers.length ? (
          <div className="mt-3 border-y border-[color:var(--mp-border)] py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">Moderación</h3>
              <button className="text-xs font-semibold text-[color:var(--mp-violet)]" onClick={onEdit} type="button">
                Editar
              </button>
            </div>
            <div className={`mt-4 grid divide-x divide-[color:var(--mp-border)] ${enabledTrackers.length === 1 ? 'grid-cols-1' : enabledTrackers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {enabledTrackers.map((tracker) => (
                <button
                  className="min-h-[4.8rem] px-3 text-left"
                  key={tracker.type}
                  onClick={() => onOpenDetail?.(tracker)}
                  type="button"
                >
                  <span className="flex items-start justify-between gap-2">
                    <ModerationTrackerIcon className="h-5 w-5 text-[color:var(--mp-violet)]" type={tracker.type} />
                    <span className="text-xl font-light">{tracker.current_streak_days}<small className="ml-1 text-xs text-[color:var(--mp-text-secondary)]">d</small></span>
                  </span>
                  <span className="mt-2 block truncate text-xs text-[color:var(--mp-text-secondary)]">
                    {moderationTrackerMeta[tracker.type].label}
                  </span>
                  {tracker.is_paused ? <span className="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[color:var(--mp-violet)]">Vacaciones</span> : null}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 border-y border-[color:var(--mp-border)] py-5 text-sm text-[color:var(--mp-text-secondary)]">No hay widgets activos.</p>
        )}
      </div>

      <div className="mt-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Disponibles</p>
        <div className="mt-3 border-y border-[color:var(--mp-border)] py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-medium">Moderación</h3>
              <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">Alcohol, tabaco y azúcar</p>
            </div>
            <button className="rounded-full border border-[color:var(--mp-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mp-text-secondary)]" onClick={onEdit} type="button">
              Editar
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {trackers.map((tracker) => {
              const active = tracker.is_enabled;
              return (
                <button
                  aria-pressed={active}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm transition ${
                    active
                      ? 'border-[color:var(--mp-violet)] bg-violet-400/10 text-[color:var(--mp-text)]'
                      : 'border-[color:var(--mp-border)] text-[color:var(--mp-text-secondary)]'
                  } ${pendingType === tracker.type ? 'opacity-55' : ''}`}
                  disabled={pendingType === tracker.type}
                  key={tracker.type}
                  onClick={() => onToggleEnabled?.(tracker.type, !active)}
                  type="button"
                >
                  <ModerationTrackerIcon className="h-4 w-4 text-[color:var(--mp-violet)]" type={tracker.type} />
                  {active ? '✓' : '+'} {moderationTrackerMeta[tracker.type].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </PremiumSheet>
  );
}

function DailyCompleteSheet({
  onClose,
  onReviewProgress,
  onShowFeedbackEvent,
  summary = {
    emotionColor: '#64E86E',
    emotionName: 'Calma',
    gpTotal: 10,
    response: {
      ok: true,
      saved: { emotion: { emotion_id: 1, date: '', notes: null }, tasks: { date: '', completed: [] } },
      xp_delta: 10,
      xp_total_today: 134,
      streaks: { daily: 11, weekly: 3 },
      missions_v2: { bonus_ready: false, redirect_url: '', tasks: [] },
      feedback_events: [],
    },
    selectedTasks: 2,
    totalTasks: 3,
  },
}: {
  onClose: () => void;
  onReviewProgress?: () => void;
  onShowFeedbackEvent?: (event: SubmitDailyQuestFeedbackEvent) => void;
  summary?: {
    emotionColor: string;
    emotionName: string;
    gpTotal: number;
    response: SubmitDailyQuestResponse;
    selectedTasks: number;
    totalTasks: number;
  };
}) {
  const completionPercent = summary.totalTasks > 0 ? Math.round((summary.selectedTasks / summary.totalTasks) * 100) : 0;
  const feedbackEvents = summary.response.feedback_events ?? [];
  return (
    <PremiumSheet eyebrow="DQuest" onClose={onClose} title="Hoy hiciste crecer tu base">
      <div className="mp-feedback-enter grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[color:var(--mp-border)] pb-5">
        <div>
          <p className="text-sm text-[color:var(--mp-text-secondary)]">Cierre de ayer</p>
          <p className="mt-1 text-[2rem] font-semibold leading-none text-[color:var(--mp-violet)]">{summary.gpTotal} GP</p>
          <p className="mt-2 text-xs text-[color:var(--mp-text-muted)]">{summary.response.streaks.daily} días con energía registrada</p>
        </div>
        <div className="mp-feedback-orb grid h-20 w-20 place-items-center rounded-full border border-[color:var(--mp-violet)] bg-violet-400/12 text-3xl text-[color:var(--mp-violet)]">
          <svg className="mp-feedback-check h-10 w-10" fill="none" viewBox="0 0 44 44">
            <path d="m12 23 7 7 14-17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.4" />
          </svg>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[color:var(--mp-border)] pb-5">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]">Tareas</p>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">
            Completaste {summary.selectedTasks} de {summary.totalTasks}. Cada registro sostiene tu ritmo.
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--mp-surface-strong)]">
            <span className="mp-feedback-bar block h-full rounded-full bg-[color:var(--mp-violet)]" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
        <span className="text-xl font-medium">{summary.selectedTasks}/{summary.totalTasks}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <FeedbackMetric
          label="Emoción"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: summary.emotionColor }} />
              {summary.emotionName}
            </span>
          }
        />
        <FeedbackMetric label="Semana" value={`${summary.response.streaks.weekly} sem`} />
      </div>
      {feedbackEvents.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {feedbackEvents.map((event, index) => (
            <button
              className="rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--mp-text-secondary)]"
              key={`${event.type}-${index}`}
              onClick={() => onShowFeedbackEvent?.(event)}
              type="button"
            >
              {event.type === 'level_up' ? `Nivel ${event.payload.level}` : `${event.payload.tasks.length} racha${event.payload.tasks.length === 1 ? '' : 's'}`}
            </button>
          ))}
        </div>
      ) : null}
      <button
        className="mt-5 min-h-11 w-full rounded-full bg-violet-500 px-5 text-sm font-semibold text-white"
        onClick={onReviewProgress ?? onClose}
        type="button"
      >
        {feedbackEvents.length ? 'Ver feedback' : 'Ver mi progreso'}
      </button>
      <PremiumFeedbackMotionStyles />
    </PremiumSheet>
  );
}

function PremiumLevelFeedbackSheet({
  event,
  onClose,
}: {
  event?: SubmitDailyQuestFeedbackEvent | null;
  onClose: () => void;
}) {
  const payload = event?.type === 'level_up' ? event.payload : { level: 24, previousLevel: 23 };
  return (
    <PremiumSheet eyebrow="Feedback" onClose={onClose} title="Subiste de nivel">
      <div className="mp-feedback-enter space-y-5">
        <div className="grid grid-cols-[82px_1fr] items-center gap-5 border-b border-[color:var(--mp-border)] pb-5">
          <span className="mp-feedback-trophy grid h-20 w-20 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 text-4xl">🏆</span>
          <div>
            <p className="text-sm text-[color:var(--mp-text-secondary)]">Nivel actual</p>
            <p className="mt-1 text-5xl font-semibold leading-none text-[color:var(--mp-amber)]">{payload.level}</p>
            <p className="mt-2 text-xs text-[color:var(--mp-text-muted)]">Antes estabas en nivel {payload.previousLevel}</p>
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4">
          <p className="text-sm font-medium">Tu GP de ayer ya impactó en tu progreso.</p>
          <p className="mt-1 text-xs text-[color:var(--mp-text-secondary)]">Revisá el dashboard para ver el nuevo estado de nivel y energía.</p>
        </div>
        <button className="min-h-11 w-full rounded-full bg-violet-500 px-5 text-sm font-semibold text-white" onClick={onClose} type="button">
          Volver al dashboard
        </button>
      </div>
      <PremiumFeedbackMotionStyles />
    </PremiumSheet>
  );
}

function PremiumStreakFeedbackSheet({
  event,
  onClose,
}: {
  event?: SubmitDailyQuestFeedbackEvent | null;
  onClose: () => void;
}) {
  const payload = event?.type === 'streak_milestone'
    ? event.payload
    : { threshold: 7, tasks: [{ id: 'fallback-streak', name: 'Dormir 8hs', streakDays: 12 }] };
  const title = payload.tasks.length === 1 ? 'Racha activa' : `${payload.tasks.length} rachas activas`;

  return (
    <PremiumSheet eyebrow="Feedback" onClose={onClose} title={title}>
      <div className="mp-feedback-enter space-y-5">
        <div className="grid grid-cols-[64px_1fr_auto] items-center gap-4 border-b border-[color:var(--mp-border)] pb-5">
          <span className="mp-feedback-flame grid h-14 w-14 place-items-center rounded-full border border-orange-300/30 bg-orange-300/10 text-2xl">🔥</span>
          <span>
            <span className="block text-sm text-[color:var(--mp-text-secondary)]">Umbral alcanzado</span>
            <span className="mt-1 block text-lg font-medium">{payload.threshold} días</span>
          </span>
          <span className="text-3xl font-semibold text-[color:var(--mp-amber)]">{payload.tasks.length}</span>
        </div>
        <ul className="divide-y divide-[color:var(--mp-border)] border-y border-[color:var(--mp-border)]">
          {payload.tasks.map((task) => (
            <li className="flex items-center gap-3 py-4" key={task.id}>
              <span className="h-2 w-2 rounded-full bg-[color:var(--mp-amber)] shadow-[0_0_16px_rgba(251,191,36,0.55)]" />
              <span className="min-w-0 flex-1 truncate text-base font-medium">{task.name}</span>
              <span className="text-xl font-semibold">{task.streakDays}d</span>
            </li>
          ))}
        </ul>
        <button className="min-h-11 w-full rounded-full bg-violet-500 px-5 text-sm font-semibold text-white" onClick={onClose} type="button">
          Listo
        </button>
      </div>
      <PremiumFeedbackMotionStyles />
    </PremiumSheet>
  );
}

function PremiumFeedbackMotionStyles() {
  return (
    <style>{`
      @keyframes mpFeedbackEnter { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes mpFeedbackOrb { 0% { transform: scale(.78); box-shadow: 0 0 0 0 rgba(167,139,250,.34); } 55% { transform: scale(1.08); box-shadow: 0 0 0 14px rgba(167,139,250,0); } 100% { transform: scale(1); } }
      @keyframes mpFeedbackCheck { from { stroke-dasharray: 44; stroke-dashoffset: 44; } to { stroke-dasharray: 44; stroke-dashoffset: 0; } }
      @keyframes mpFeedbackBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes mpFeedbackPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
      .mp-feedback-enter { animation: mpFeedbackEnter .34s cubic-bezier(.2,.85,.25,1) both; }
      .mp-feedback-orb { animation: mpFeedbackOrb .72s cubic-bezier(.2,.85,.25,1) both; }
      .mp-feedback-check path { animation: mpFeedbackCheck .58s .18s ease-out both; }
      .mp-feedback-bar { transform-origin: left; animation: mpFeedbackBar .7s .12s cubic-bezier(.2,.85,.25,1) both; }
      .mp-feedback-trophy, .mp-feedback-flame { animation: mpFeedbackPulse 1.7s ease-in-out infinite; }
    `}</style>
  );
}

function DQuestCompletedSheet({
  onClose,
  onGoDashboard,
  summary,
}: {
  onClose: () => void;
  onGoDashboard: () => void;
  summary?: {
    gpTotal: number;
    selectedTasks: number;
    totalTasks: number;
  };
}) {
  return (
    <PremiumSheet eyebrow="DQuest" onClose={onClose} title="Ya completaste la retrospectiva">
      <div className="space-y-5">
        <div className="grid grid-cols-[64px_1fr] items-center gap-4 border-b border-[color:var(--mp-border)] pb-5">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-emerald-300/28 bg-emerald-400/10 text-2xl text-[color:var(--mp-green)]">✓</span>
          <p className="text-sm leading-6 text-[color:var(--mp-text-secondary)]">
            {summary
              ? `Hoy sumaste ${summary.gpTotal} GP y completaste ${summary.selectedTasks} de ${summary.totalTasks} tareas.`
              : 'El registro de hoy ya quedó guardado. Tu constancia sigue construyendo tu base.'}
          </p>
        </div>
        <button className="min-h-11 w-full rounded-full bg-violet-500 px-5 text-sm font-semibold text-white" onClick={onGoDashboard} type="button">
          Volver al dashboard
        </button>
      </div>
    </PremiumSheet>
  );
}

function ReminderSheet({
  backendUserId,
  onClose,
  onSaved,
}: {
  backendUserId: string | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}) {
  const [time, setTime] = useState('18:00');
  const [channels, setChannels] = useState({ email: true, notification: true });
  const detectedTimezone = useMemo(() => resolveDefaultTimezone(), []);
  const [automaticTimezone, setAutomaticTimezone] = useState(true);
  const [manualTimezone, setManualTimezone] = useState(detectedTimezone);
  const timezoneFieldId = useId();
  const timezoneCatalog = useMemo(() => getTimezoneCatalog(), []);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!backendUserId) return;
    let cancelled = false;
    void getDailyReminderSettings()
      .then((settings) => {
        if (cancelled) return;
        const savedTime = settings.local_time ?? settings.localTime;
        const savedTimezone = settings.timezone ?? settings.timeZone ?? settings.time_zone;
        if (savedTime) setTime(savedTime.slice(0, 5));
        if (savedTimezone) setManualTimezone(savedTimezone);
      })
      .catch((error) => console.warn('[mobile-premium] failed to load reminder settings', error));
    return () => {
      cancelled = true;
    };
  }, [backendUserId]);

  function toggleChannel(channel: 'email' | 'notification') {
    setChannels((current) => ({ ...current, [channel]: !current[channel] }));
  }

  async function handleSave() {
    if (savePending || (!channels.email && !channels.notification)) return;
    setSavePending(true);
    setSaveError(null);
    try {
      if (backendUserId) {
        const timezone = automaticTimezone ? detectedTimezone : manualTimezone;
        const activeChannels = (Object.keys(channels) as Array<keyof typeof channels>).filter((channel) => channels[channel]);
        await Promise.all(activeChannels.map((channel) => updateDailyReminderSettings({
          local_time: time,
          status: 'active',
          timezone,
        }, channel)));
      }
      await onSaved?.();
      onClose();
    } catch (error) {
      console.error('[mobile-premium] failed to save reminder settings', error);
      setSaveError('No se pudo guardar el recordatorio. Probá de nuevo.');
    } finally {
      setSavePending(false);
    }
  }

  return (
    <PremiumSheet eyebrow="Recordatorio" onClose={onClose} title="Elegí cuándo volver">
      <div className="space-y-6">
        <label className="block">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Hora local</span>
          <input
            aria-label="Hora del recordatorio"
            className="mp-time-input mt-3 h-12 w-full rounded-full border border-[color:var(--mp-violet)] bg-[color:var(--mp-surface-strong)] px-5 text-center text-base font-semibold text-[color:var(--mp-violet-strong)] outline-none"
            onChange={(event) => setTime(event.target.value)}
            type="time"
            value={time}
          />
        </label>
        <div className="flex items-center gap-3 rounded-[1rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-400/12 text-[color:var(--mp-violet)]">
            <BellIcon />
          </span>
          <div>
            <p className="text-sm font-semibold text-[color:var(--mp-text)]">Todos los días</p>
            <p className="text-xs text-[color:var(--mp-text-secondary)]">Daily Quest llega diariamente a la hora elegida.</p>
          </div>
        </div>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Canal</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { key: 'email' as const, label: 'Email', icon: <MailIcon /> },
              { key: 'notification' as const, label: 'Notificación', icon: <BellIcon /> },
            ].map((channel) => (
            <button
              aria-pressed={channels[channel.key]}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold ${
                channels[channel.key]
                  ? 'border-[color:var(--mp-violet)] bg-violet-400/12 text-[color:var(--mp-violet)]'
                  : 'border-[color:var(--mp-border)] text-[color:var(--mp-text-secondary)]'
              }`}
              key={channel.key}
              onClick={() => toggleChannel(channel.key)}
              type="button"
            >
              {channel.icon}
              {channel.label}
            </button>
          ))}
          </div>
        </div>
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Zona horaria</p>
          <div className="mt-3 grid grid-cols-2 rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-1 text-sm font-semibold">
            <button
              className={`min-h-10 rounded-full ${automaticTimezone ? 'bg-violet-400/16 text-[color:var(--mp-violet)]' : 'text-[color:var(--mp-text-secondary)]'}`}
              onClick={() => setAutomaticTimezone(true)}
              type="button"
            >
              Automática
            </button>
            <button
              className={`min-h-10 rounded-full ${!automaticTimezone ? 'bg-violet-400/16 text-[color:var(--mp-violet)]' : 'text-[color:var(--mp-text-secondary)]'}`}
              onClick={() => setAutomaticTimezone(false)}
              type="button"
            >
              Manual
            </button>
          </div>
          {automaticTimezone ? (
            <p className="mt-3 min-h-12 rounded-full border border-[color:var(--mp-border)] px-5 py-3 text-sm text-[color:var(--mp-text-secondary)]">
              {detectedTimezone} · Automática
            </p>
          ) : (
            <div className="mt-3 [&_input]:rounded-full [&_input]:border-[color:var(--mp-border)] [&_input]:bg-[color:var(--mp-surface)] [&_input]:text-[color:var(--mp-text)]">
              <TimezoneCombobox
                id={timezoneFieldId}
                onChange={setManualTimezone}
                options={timezoneCatalog}
                placeholder="Buscar ciudad o zona horaria"
                value={manualTimezone}
              />
            </div>
          )}
        </div>
        {saveError ? <p className="text-sm text-[color:var(--mp-red)]">{saveError}</p> : null}
        <button
          className="min-h-12 w-full rounded-full bg-violet-500 px-5 text-sm font-semibold text-white shadow-[0_16px_38px_rgba(139,92,246,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={savePending || (!channels.email && !channels.notification)}
          onClick={() => void handleSave()}
          type="button"
        >
          {savePending ? 'Guardando…' : 'Guardar recordatorio'}
        </button>
      </div>
    </PremiumSheet>
  );
}

function AiTaskSheet({ backendUserId, onClose }: { backendUserId: string | null; onClose: () => void }) {
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Media' | 'Difícil'>('Media');
  const [intention, setIntention] = useState('');
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'generated' | 'error'>('idle');
  const [suggestion, setSuggestion] = useState(resolveAiTaskSuggestion(intention));
  const [classification, setClassification] = useState<UserTaskClassification | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);
  const difficultyCatalog = useDifficulties({ enabled: Boolean(backendUserId) });
  const canGenerate = intention.trim().length > 2 && phase !== 'analyzing';

  async function handleGenerate() {
    if (!canGenerate) return;
    setPhase('analyzing');
    setAiError(null);
    try {
      if (backendUserId) {
        const classification = await classifyUserTask(backendUserId, { title: intention.trim() });
        setClassification(classification);
        setSuggestion({
          pillar: classification.pillarName ?? classification.pillarCode ?? 'Sin pilar',
          trait: classification.traitName ?? classification.traitCode ?? 'Sin rasgo',
          reason: classification.rationale ?? 'Clasificación generada por el servicio real.',
          weeklyGoal: 'Según tu ritmo actual',
        });
      } else {
        setClassification(null);
        setSuggestion(resolveAiTaskSuggestion(intention));
      }
      setPhase('generated');
    } catch (error) {
      console.error('[mobile-premium] task classification failed', error);
      setAiError('No se pudo generar la categoría con el servicio real.');
      setPhase('error');
    }
  }

  async function handleCreate() {
    if (!backendUserId || !classification || createPending) return;
    setCreatePending(true);
    setAiError(null);
    try {
      const difficultyId = difficultyCatalog.data.find((item) => normalizeDifficultyLabel(item.name) === difficulty || normalizeDifficultyLabel(item.code) === difficulty)?.id ?? null;
      await createUserTask(backendUserId, {
        title: intention.trim(),
        pillarId: classification.pillarId == null ? null : String(classification.pillarId),
        traitId: classification.traitId == null ? null : String(classification.traitId),
        difficultyId,
        isActive: true,
      });
      onClose();
    } catch (error) {
      console.error('[mobile-premium] create task failed', error);
      setAiError('No se pudo crear la tarea con el flujo real.');
      setPhase('error');
    } finally {
      setCreatePending(false);
    }
  }

  return (
    <PremiumSheet eyebrow="Nueva tarea" onClose={onClose} title="Nueva tarea guiada">
      <div className="space-y-5">
        <p className="text-base leading-6 text-[color:var(--mp-text-secondary)]">
          Escribí tu intención y dejá que la IA sugiera la mejor categoría.
        </p>
        <label className="block">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-text-muted)]">¿Qué tarea querés sumar?</span>
          <textarea
            className="mt-3 min-h-24 w-full resize-none rounded-[1.25rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4 text-base outline-none"
            onChange={(event) => {
              setIntention(event.target.value);
              setSuggestion(resolveAiTaskSuggestion(event.target.value));
              setClassification(null);
              if (phase !== 'idle') setPhase('idle');
            }}
            placeholder="Ej. Caminar 30 minutos"
            value={intention}
          />
        </label>
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-text-muted)]">Dificultad</p>
          <div className="mt-3 flex justify-center gap-2">
            {(['Fácil', 'Media', 'Difícil'] as const).map((label) => (
              <button
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${
                  difficulty === label
                    ? 'border-[color:var(--mp-amber)] bg-amber-300/10 text-[color:var(--mp-amber)]'
                    : 'border-[color:var(--mp-border)] text-[color:var(--mp-text-secondary)]'
                }`}
                key={label}
                onClick={() => {
                  setDifficulty(label);
                  if (phase !== 'idle') setPhase('idle');
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          className="min-h-11 w-full rounded-full border border-[color:var(--mp-violet)] bg-violet-400/10 px-5 text-sm font-semibold text-[color:var(--mp-violet)]"
          disabled={!canGenerate}
          onClick={handleGenerate}
          type="button"
        >
          {phase === 'analyzing' ? '✦ Analizando tarea...' : '✦ Generar categoría'}
        </button>
        {phase === 'analyzing' ? (
          <div className="border-y border-[color:var(--mp-border)] py-4">
            <div className="h-1 w-28 overflow-hidden rounded-full bg-[color:var(--mp-surface-strong)]">
              <span className="block h-full w-2/3 rounded-full bg-gradient-to-r from-violet-400 to-amber-200" />
            </div>
            <p className="mt-3 text-base font-semibold">Analizando tarea...</p>
            <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">Revisando intención, contexto y patrón de hábito.</p>
          </div>
        ) : null}
        {phase === 'error' ? (
          <p className="rounded-[1rem] border border-red-300/25 bg-red-400/8 px-4 py-3 text-sm text-[color:var(--mp-red)]">{aiError}</p>
        ) : null}
        {phase === 'generated' ? (
          <div className="border-y border-[color:var(--mp-border)] py-4 text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-violet)]">Categoría generada</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="rounded-full border border-violet-300/35 bg-violet-400/10 px-4 py-2 text-base font-semibold">{suggestion.pillar}</span>
              <span className="text-[color:var(--mp-text-secondary)]">/</span>
              <span className="rounded-full border border-violet-300/35 bg-violet-400/10 px-4 py-2 text-base font-semibold">{suggestion.trait}</span>
            </div>
            <p className="mt-4 text-sm leading-5 text-[color:var(--mp-text-secondary)]">{suggestion.reason}</p>
            <p className="mt-3 text-xs font-semibold text-[color:var(--mp-text)]">Objetivo semanal: {suggestion.weeklyGoal}</p>
            <div className="mt-4 flex justify-center gap-5 text-xs font-semibold text-[color:var(--mp-text-secondary)] underline decoration-dotted underline-offset-4">
              <button onClick={handleGenerate} type="button">Reintentar sugerencia</button>
              <button type="button">Elegir manualmente</button>
            </div>
          </div>
        ) : null}
        <p className="text-xs leading-5 text-[color:var(--mp-text-muted)]">
          Para editar tareas existentes, abrí el detalle desde Tareas.
        </p>
        <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
          <button className="min-h-11 rounded-full border border-[color:var(--mp-border)] px-5 text-sm font-semibold text-[color:var(--mp-text-secondary)]" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="min-h-11 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white disabled:opacity-45"
            disabled={phase !== 'generated' || !backendUserId || !classification || createPending}
            onClick={handleCreate}
            type="button"
          >
            {createPending ? 'Creando...' : 'Confirmar tarea'}
          </button>
        </div>
      </div>
    </PremiumSheet>
  );
}

function resolveAiTaskSuggestion(intention: string) {
  const text = intention.toLowerCase();
  if (text.includes('caminar') || text.includes('correr') || text.includes('pasos')) {
    return { pillar: 'Cuerpo', trait: 'Movilidad', reason: 'Movimiento sostenido dentro del pilar Cuerpo.', weeklyGoal: '3 veces por semana' };
  }
  if (text.includes('agua') || text.includes('hidrata')) {
    return { pillar: 'Cuerpo', trait: 'Hidratación', reason: 'Hidratación se clasifica como cuidado corporal.', weeklyGoal: '3 veces por semana' };
  }
  if (text.includes('leer') || text.includes('libro') || text.includes('estudi')) {
    return { pillar: 'Mente', trait: 'Aprendizaje', reason: 'Leer fortalece aprendizaje y desarrollo mental.', weeklyGoal: '3 veces por semana' };
  }
  return { pillar: 'Mente', trait: 'Aprendizaje', reason: 'La intención se interpreta como práctica de aprendizaje.', weeklyGoal: '3 veces por semana' };
}

function normalizeDifficultyLabel(value: string | null | undefined) {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'easy':
    case 'fácil':
    case 'facil':
      return 'Fácil';
    case 'medium':
    case 'media':
      return 'Media';
    case 'hard':
    case 'difícil':
    case 'dificil':
      return 'Difícil';
    default:
      return null;
  }
}

function RhythmSheet({
  currentMode,
  onClose,
  onConfirmRhythm,
}: {
  currentMode: string | null;
  onClose: () => void;
  onConfirmRhythm?: (mode: string) => void;
}) {
  const current = formatPremiumRhythmLabel(currentMode).toLowerCase();
  const [appliedRhythm, setAppliedRhythm] = useState(current);
  const [selectedRhythm, setSelectedRhythm] = useState(current);
  const [confirmRhythm, setConfirmRhythm] = useState<null | {
    key: string;
    label: string;
    days: number;
  }>(null);
  const options = [
    { key: 'low', label: 'LOW', days: 1, text: 'Base suave' },
    { key: 'chill', label: 'CHILL', days: 2, text: 'Constancia simple' },
    { key: 'flow', label: 'FLOW', days: 3, text: 'Ritmo sostenido' },
    { key: 'evolve', label: 'EVOLVE', days: 4, text: 'Mayor intensidad' },
  ];
  const selectedOption = options.find((option) => option.key === selectedRhythm) ?? options[0];
  const hasPendingSelection = selectedRhythm !== appliedRhythm;

  return (
    <PremiumSheet eyebrow="Ritmo" onClose={onClose} title="Elegí tu ritmo">
      <div className="mb-5 rounded-[1.25rem] bg-[linear-gradient(90deg,rgba(167,139,250,0.12),rgba(104,211,145,0.08))] p-4">
        <p className="text-sm leading-6 text-[color:var(--mp-text-secondary)]">Tu ritmo define cuántos días por semana se espera sostener cada hábito.</p>
      </div>
      <div className="space-y-2.5 pb-24">
        {options.map((option) => {
          const active = appliedRhythm === option.key;
          const selected = selectedRhythm === option.key;
          const isGreen = selected;
          return (
            <button
              aria-pressed={selected}
              className={`w-full rounded-[1.2rem] p-4 text-left transition ${
                isGreen
                  ? 'bg-emerald-300/12 shadow-[inset_0_0_0_2px_rgba(104,211,145,0.34),0_14px_34px_rgba(0,0,0,0.22)]'
                  : 'bg-[color:var(--mp-surface)]'
              }`}
              key={option.key}
              onClick={() => setSelectedRhythm(option.key)}
              type="button"
            >
              <span className="grid grid-cols-[1fr_auto] items-start gap-4">
                <span className="min-w-0">
                  <span className={`block text-xl font-semibold tracking-[0.12em] ${isGreen ? 'text-[color:var(--mp-green)]' : 'text-[color:var(--mp-text)]'}`}>{option.label}</span>
                  <span className="mt-1 block text-sm text-[color:var(--mp-text-secondary)]">{option.text}</span>
                </span>
                <span className="text-right">
                  <span className={`block text-3xl font-semibold leading-none ${isGreen ? 'text-[color:var(--mp-green)]' : 'text-[color:var(--mp-text)]'}`}>{option.days}</span>
                  <span className="mt-1 block text-xs font-medium text-[color:var(--mp-text-muted)]">días/sem</span>
                </span>
              </span>
              <span className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <span
                    className={`h-1.5 rounded-full ${
                      index < option.days
                        ? isGreen
                          ? 'bg-[color:var(--mp-green)]'
                          : 'bg-[color:var(--mp-violet)]'
                        : 'bg-white/10'
                    }`}
                    key={index}
                  />
                ))}
              </span>
              <span className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--mp-text-muted)]">{option.days}x/semana</span>
                <span className="flex items-center gap-2">
                  {active ? <span className="rounded-full bg-emerald-300/12 px-3 py-1 text-xs font-semibold text-[color:var(--mp-green)]">Actual</span> : null}
                  {selected && !active ? <span className="rounded-full bg-violet-300/12 px-3 py-1 text-xs font-semibold text-[color:var(--mp-violet)]">Seleccionado</span> : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-[color:var(--mp-border)] bg-[color:var(--mp-bg-elevated)] px-5 pb-5 pt-4">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]">Seleccionado</p>
            <p className="mt-1 text-base font-semibold text-[color:var(--mp-text)]">{selectedOption.label} · {selectedOption.days} días/sem</p>
          </div>
          <button
            className={`min-h-11 rounded-full px-5 text-sm font-semibold transition ${
              hasPendingSelection
                ? 'bg-violet-500 text-white shadow-[0_12px_26px_rgba(139,92,246,0.22)]'
                : 'bg-[color:var(--mp-surface)] text-[color:var(--mp-text-muted)]'
            }`}
            disabled={!hasPendingSelection}
            onClick={() => setConfirmRhythm(selectedOption)}
            type="button"
          >
            Continuar
          </button>
        </div>
      </div>
      {confirmRhythm ? (
        <RhythmPickerConfirmDialog
          rhythm={confirmRhythm}
          onCancel={() => setConfirmRhythm(null)}
          onConfirm={() => {
            setAppliedRhythm(confirmRhythm.key);
            setSelectedRhythm(confirmRhythm.key);
            onConfirmRhythm?.(confirmRhythm.label);
            setConfirmRhythm(null);
          }}
        />
      ) : null}
    </PremiumSheet>
  );
}

function RhythmPickerConfirmDialog({
  rhythm,
  onCancel,
  onConfirm,
}: {
  rhythm: { key: string; label: string; days: number };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] mx-auto flex w-full max-w-[430px] items-end bg-black/62 px-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur-md">
      <section className="w-full rounded-[1.55rem] bg-[color:var(--mp-bg-elevated)] p-5 text-[color:var(--mp-text)] shadow-[0_24px_72px_rgba(0,0,0,0.5)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-violet)]">Confirmar ritmo</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight">Cambiar a {rhythm.label}</h3>
        <div className="mt-5 rounded-[1.25rem] bg-violet-300/10 px-5 py-5 text-center">
          <p className="text-[2.35rem] font-semibold leading-none text-[color:var(--mp-violet)]">{rhythm.days}</p>
          <p className="mt-2 text-sm font-medium text-[color:var(--mp-text)]">días por semana</p>
        </div>
        <div className="mt-5 grid grid-cols-[0.85fr_1.15fr] gap-3">
          <button
            className="min-h-12 rounded-full bg-[color:var(--mp-surface)] px-4 text-sm font-semibold text-[color:var(--mp-text-secondary)]"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="min-h-12 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white"
            onClick={onConfirm}
            type="button"
          >
            Confirmar {rhythm.label}
          </button>
        </div>
      </section>
    </div>
  );
}

function ModerationEditSheet({
  onClose,
  onToleranceChange,
  onTogglePause,
  pendingType,
  trackers,
}: {
  onClose: () => void;
  onToleranceChange?: (tracker: ModerationTracker, days: number) => void;
  onTogglePause?: (tracker: ModerationTracker, shouldPause: boolean) => void;
  pendingType?: ModerationTrackerType | null;
  trackers: ModerationTracker[];
}) {
  const selectedTrackers = trackers.filter((tracker) => tracker.is_enabled);

  return (
    <PremiumSheet eyebrow="Widget · Moderación" onClose={onClose} title="Configurar">
      {selectedTrackers.length ? (
        <div className="divide-y divide-[color:var(--mp-border)] border-y border-[color:var(--mp-border)]">
          {selectedTrackers.map((tracker) => {
            const pending = pendingType === tracker.type;
            return (
              <section className={`py-5 ${pending ? 'opacity-55' : ''}`} key={tracker.type}>
                <div className="flex items-center gap-3">
                  <ModerationTrackerIcon className="h-5 w-5 text-[color:var(--mp-violet)]" type={tracker.type} />
                  <h3 className="flex-1 text-lg font-medium">{moderationTrackerMeta[tracker.type].label}</h3>
                  {tracker.is_paused ? (
                    <span className="rounded-full border border-violet-300/30 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--mp-violet)]">Pausado</span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-sm text-[color:var(--mp-text-secondary)]">Modo vacaciones</span>
                  <button
                    aria-checked={tracker.is_paused}
                    aria-label={`Modo vacaciones para ${moderationTrackerMeta[tracker.type].label}`}
                    className={`relative h-7 w-12 rounded-full border transition ${
                      tracker.is_paused ? 'border-[color:var(--mp-violet)] bg-violet-400/28' : 'border-[color:var(--mp-border-strong)] bg-[color:var(--mp-surface)]'
                    }`}
                    disabled={pending}
                    onClick={() => onTogglePause?.(tracker, !tracker.is_paused)}
                    role="switch"
                    type="button"
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-[color:var(--mp-text)] transition ${tracker.is_paused ? 'left-[1.35rem]' : 'left-1'}`} />
                  </button>
                </div>

                <label className="mt-5 block">
                  <span className="flex items-baseline justify-between gap-3 text-sm text-[color:var(--mp-text-secondary)]">
                    <span>Tolerancia</span>
                    <strong className="text-lg font-medium text-[color:var(--mp-text)]">{tracker.not_logged_tolerance_days}d</strong>
                  </span>
                  <input
                    aria-label={`Tolerancia de ${moderationTrackerMeta[tracker.type].label}`}
                    className="mt-3 h-1.5 w-full cursor-pointer accent-[color:var(--mp-violet)]"
                    disabled={pending}
                    max={7}
                    min={0}
                    onChange={(event) => onToleranceChange?.(tracker, Number(event.target.value))}
                    step={1}
                    type="range"
                    value={tracker.not_logged_tolerance_days}
                  />
                  <span className="mt-3 block text-xs text-[color:var(--mp-text-muted)]">Días sin registrar antes de cortar la racha.</span>
                </label>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="border-y border-[color:var(--mp-border)] py-6 text-sm text-[color:var(--mp-text-secondary)]">
          Activá al menos un seguimiento desde Widgets.
        </p>
      )}
    </PremiumSheet>
  );
}

function ModerationSheet({
  onClose,
  onTogglePause,
  tracker,
}: {
  onClose: () => void;
  onTogglePause?: (tracker: ModerationTracker, shouldPause: boolean) => void;
  tracker: ModerationTracker | null;
}) {
  const selected: ModerationTracker = tracker ?? {
    type: 'sugar',
    is_enabled: true,
    is_paused: false,
    current_streak_days: 6,
    not_logged_tolerance_days: 2,
    statusToday: 'not_logged',
  };
  const label = moderationTrackerMeta[selected.type].label;
  const remainingGrace = (selected as ModerationTracker & { remaining_grace_days?: number }).remaining_grace_days ?? selected.not_logged_tolerance_days;

  return (
    <PremiumSheet eyebrow="Moderación" onClose={onClose} title={label}>
      <div className="space-y-5">
        <div className="grid grid-cols-[54px_1fr_auto] items-center gap-4 border-b border-[color:var(--mp-border)] pb-5">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-[color:var(--mp-border)] text-[color:var(--mp-violet)]">
            <ModerationTrackerIcon className="h-6 w-6" type={selected.type} />
          </span>
          <span>
            <span className="block text-lg font-semibold">Racha de moderación</span>
            <span className="text-sm text-[color:var(--mp-text-secondary)]">Detalle de seguimiento.</span>
          </span>
          <span className="text-right">
            <span className="block text-4xl font-light text-[color:var(--mp-violet)]">{selected.current_streak_days}</span>
            <span className="text-sm font-semibold text-[color:var(--mp-text-secondary)]">D</span>
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, index) => (
            <span
              className={`h-10 rounded-full ${index < Math.min(selected.current_streak_days, 7) ? 'bg-[color:var(--mp-violet)]/80' : 'bg-white/[0.06]'}`}
              key={index}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 border-y border-[color:var(--mp-border)] py-4">
          <FeedbackMetric label="Gracia disponible" value={`${remainingGrace}d`} />
          <FeedbackMetric label="Hoy" value={selected.statusToday === 'off_track' ? 'Interrumpido' : selected.statusToday === 'on_track' ? 'Cumplido' : 'Pendiente'} />
        </div>
        <button
          className="flex w-full items-center justify-between rounded-[1rem] border border-[color:var(--mp-border)] px-4 py-4 text-left"
          onClick={() => onTogglePause?.(selected, !selected.is_paused)}
          type="button"
        >
          <span>
            <span className="block text-sm font-semibold">Modo vacaciones</span>
            <span className="mt-1 block text-xs text-[color:var(--mp-text-secondary)]">
              {selected.is_paused ? 'Seguimiento pausado temporalmente' : 'Pausar este seguimiento temporalmente'}
            </span>
          </span>
          <span className="rounded-full border border-[color:var(--mp-border-strong)] px-3 py-1 text-xs text-[color:var(--mp-text-secondary)]">
            {selected.is_paused ? 'Reactivar' : 'Activar'}
          </span>
        </button>
      </div>
    </PremiumSheet>
  );
}

function FeedbackMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[1rem] border border-[color:var(--mp-border)] p-3">
      <p className="text-[0.7rem] uppercase tracking-[0.16em] text-[color:var(--mp-text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M12 12.2a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.2 20.1c.8-3.5 3.1-5.3 6.8-5.3s6 1.8 6.8 5.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M5.5 7h13" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M9.2 7V5.3c0-.7.5-1.2 1.2-1.2h3.2c.7 0 1.2.5 1.2 1.2V7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7.4 9.2 8.2 19c.1.7.6 1.2 1.3 1.2h5c.7 0 1.2-.5 1.3-1.2l.8-9.8" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M10.4 11.2v6M13.6 11.2v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M4.5 6.8h15v10.4h-15V6.8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="m5.2 7.5 6.8 5.2 6.8-5.2" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path d="M6.8 10.4c0-3.1 2.1-5.4 5.2-5.4s5.2 2.3 5.2 5.4v3.2l1.3 2.2H5.5l1.3-2.2v-3.2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M10 18.4c.4.8 1 1.2 2 1.2s1.6-.4 2-1.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function WidgetsIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.6" width="6.5" x="4" y="4" />
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.6" width="6.5" x="13.5" y="4" />
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.6" width="6.5" x="4" y="13.5" />
      <rect height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.6" width="6.5" x="13.5" y="13.5" />
    </svg>
  );
}
