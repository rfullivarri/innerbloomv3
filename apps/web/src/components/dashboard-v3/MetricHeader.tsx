import { useMemo } from "react";
import { Card } from "../ui/Card";
import { InfoDotTarget } from "../InfoDot/InfoDotTarget";
import { useRequest } from "../../hooks/useRequest";
import { getUserLevel, getUserTotalXp } from "../../lib/api";
import { formatGp } from "../../lib/points";
import { GameModeChip, buildGameModeChip } from "../common/GameModeChip";
import { DashboardMeta } from "./DashboardTypography";
import { usePostLoginLanguage } from "../../i18n/postLoginLanguage";
import type { AvatarProfile } from "../../lib/avatarProfile";

interface MetricHeaderProps {
  userId: string;
  gameMode?: string | null;
  avatarProfile?: AvatarProfile | null;
}

type XpProgressData = {
  xpTotal: number;
  currentLevel: number;
  xpToNext: number | null;
  progressPercent: number;
};

const NUMBER_FORMATTER = new Intl.NumberFormat("es-AR");

function formatInteger(value: number) {
  return NUMBER_FORMATTER.format(Math.max(0, Math.round(value)));
}

export function MetricHeader({
  userId,
  gameMode,
  avatarProfile,
}: MetricHeaderProps) {
  const { t } = usePostLoginLanguage();

  const { data, status } = useRequest<XpProgressData>(async () => {
    const [total, level] = await Promise.all([
      getUserTotalXp(userId),
      getUserLevel(userId),
    ]);

    const xpTotal = Math.max(0, Math.round(total.total_xp ?? 0));
    const currentLevel = Number.isFinite(level.current_level)
      ? Math.max(0, Math.round(level.current_level))
      : 0;
    const rawXpToNext = level.xp_to_next ?? null;
    const xpToNext =
      rawXpToNext === null ? null : Math.max(0, Math.round(rawXpToNext));
    const progressPercentRaw = Number(level.progress_percent ?? 0);
    const progressPercent = Number.isFinite(progressPercentRaw)
      ? Math.min(100, Math.max(0, progressPercentRaw))
      : 0;

    return {
      xpTotal,
      currentLevel,
      xpToNext,
      progressPercent,
    } satisfies XpProgressData;
  }, [userId]);

  const showSkeleton = status === "loading";
  const showError = status === "error";
  const showContent = status === "success" && data;

  const progressPercent = showContent ? data.progressPercent : 0;
  const progressLabel = `${progressPercent.toFixed(0)}%`;
  const xpToNextMessage = showContent
    ? data.xpToNext === null
      ? t("dashboard.metricHeader.maxLevel")
      : t("dashboard.metricHeader.toNextLevel", {
          gp: formatGp(formatInteger(data.xpToNext)),
        })
    : "";
  const levelLabel = showContent ? formatInteger(data.currentLevel) : "—";
  const totalXpLabel = showContent ? formatInteger(data.xpTotal) : "—";
  const chipStyle = useMemo(
    () => buildGameModeChip(gameMode, { avatarProfile }),
    [avatarProfile, gameMode],
  );

  const subtitle = useMemo(() => {
    if (showError) {
      return t("dashboard.metricHeader.loadError");
    }
    if (showSkeleton) {
      return t("dashboard.metricHeader.loading");
    }
    return undefined;
  }, [showError, showSkeleton, t]);

  return (
    <Card
      className="ib-metric-header-card"
      title={t("dashboard.metricHeader.title")}
      rightSlot={
        <div className="metric-header-right-slot flex items-center justify-end gap-1.5 sm:gap-2.5 -mt-0.5">
          <InfoDotTarget
            id="xpLevel"
            placement="left"
            className="metric-header-info-dot inline-flex items-center"
          >
            <span className="sr-only">
              {t("dashboard.metricHeader.infoAria")}
            </span>
          </InfoDotTarget>
          {chipStyle ? <GameModeChip {...chipStyle} /> : null}
        </div>
      }
      subtitle={subtitle}
    >
      {showSkeleton && (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-ib-md bg-white/5"
              />
            ))}
          </div>
        </div>
      )}

      {showError && (
        <div className="flex flex-col gap-3 text-sm text-rose-200">
          <p>{t("dashboard.metricHeader.serviceError")}</p>
          <p className="text-xs text-rose-200/70">
            {t("dashboard.metricHeader.serviceErrorHint")}
          </p>
        </div>
      )}

      {showContent && (
        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-6 text-[color:var(--color-text-muted)]">
              <div className="flex items-center gap-3">
                <span className="text-[2.5em] leading-none">🏆</span>
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-semibold text-[color:var(--color-text)] sm:text-5xl">
                    {totalXpLabel}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-subtle)]">
                    Total GP
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[2.5em] leading-none">🎯</span>
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-semibold text-[color:var(--color-text)] sm:text-5xl">
                    {levelLabel}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-subtle)]">
                    {t("dashboard.metricHeader.level")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <DashboardMeta className="text-left tracking-[0.02em] text-[color:var(--color-text)]">
              {t("dashboard.metricHeader.progress")}
            </DashboardMeta>
            <div
              className="relative h-6 w-full overflow-hidden rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)] shadow-[inset_0_2px_8px_rgba(15,23,42,0.12)] sm:h-[30px]"
              role="progressbar"
              aria-label={t("dashboard.metricHeader.progressAria")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(progressPercent.toFixed(1))}
              aria-valuetext={t("dashboard.metricHeader.progressCompleted", {
                percent: progressLabel,
              })}
            >
              <div className="absolute inset-0" aria-hidden>
                <div className="h-full bg-gradient-to-r from-indigo-400/20 via-fuchsia-400/25 to-amber-300/20" />
              </div>
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 transition-[width] duration-500 ease-out progress-fill--typing"
                style={{ width: `${progressPercent.toFixed(1)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text)] drop-shadow-[0_1px_2px_rgba(255,255,255,0.45)]">
                {progressLabel}
              </span>
            </div>
            {xpToNextMessage && (
              <DashboardMeta className="text-[color:var(--color-text)]">
                {xpToNextMessage}
              </DashboardMeta>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
