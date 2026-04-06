# Preview Achievement (Backend Domain Spec)

## What this is

Preview Achievement is a backend/domain read-model in the same adaptive engine family as Habit Achievement.

- **Habit Achievement** remains the official monthly verdict (unchanged).
- **Preview Achievement** provides a live, explainable signal of progress toward that verdict.

## Source of truth alignment

- Closed-month history is sourced from `task_difficulty_recalibrations`.
- Current-month momentum is calculated on-demand from `daily_log` plus mode target (`weekly_target`) resolved from user game-mode context.

This keeps preview logic aligned with Growth Calibration / Habit Achievement data semantics.

## Scoring model

Final score (0-100):

- `0.35 * current_month_momentum_score`
- `0.25 * recent_closed_months_score`
- `0.40 * achievement_window_proximity_score`

All components are clamped to `[0,100]`.

### Shared monthly-rate normalization

For any monthly rate `x`:

- `x <= 0.50` → `(x / 0.50) * 35`
- `0.50 < x < 0.80` → `35 + ((x - 0.50) / 0.30) * 45`
- `x >= 0.80` → `80 + min((x - 0.80) / 0.20, 1) * 20`

### 1) Current month momentum (35%)

Inputs:

- `pace_rate = completions_done_so_far / expected_target_so_far`
- `projected_month_rate = projected_completions_month_end / expected_target_month_end`

Formula:

- `0.45 * normalized(pace_rate) + 0.55 * normalized(projected_month_rate)`

### 2) Recent closed months (25%)

- Uses up to latest 3 closed months.
- Recency weights: `0.50`, `0.30`, `0.20`.
- If fewer than 3, uses available months with weight renormalization.

### 3) Achievement window proximity (40%)

Candidate window:

- `M-2` closed month
- `M-1` closed month
- current month preview (projected)

Slot states:

- `valid` (`>= 0.80`) -> 1.0
- `floor_only` (`>= 0.50 and < 0.80`) -> 0.45
- `invalid` (`< 0.50`) -> 0.0
- missing history -> `empty` (0.0)

Computation:

- `window_raw = average(slot_values over 3 slots)`

Bonuses:

- `+0.15` if `valid_months >= 2`
- `+0.10` if no evaluated month is below floor
- `+0.15` if `aggregate_projected_3m_rate >= 0.80`

Score:

- `min(100, (window_raw + bonus) * 100)`

## Status semantics

- **fragile** if `preview_score < 50` OR `projectedMonthEndRate < 0.50`
- **building** if score is 50-79 and not strong
- **strong** if:
  - `preview_score >= 80`
  - `projectedMonthEndRate >= 0.80`
  - and (`at least one recent closed month >= 0.80` OR `achievement_window_proximity_score >= 85`)

## Sparse and long-history behavior

- Sparse history is supported (including only current month): empty window slots reduce proximity naturally.
- Long non-achieved history is not ignored globally, but preview prioritizes latest closed months + current trajectory to reflect recovery momentum.

## API contract extension

`GET /tasks/:taskId/insights` now includes `previewAchievement`:

```json
{
  "previewAchievement": {
    "status": "fragile | building | strong",
    "score": 0,
    "currentMonth": {
      "periodKey": "YYYY-MM",
      "completionRateSoFar": 0,
      "projectedMonthEndRate": 0,
      "expectedTargetSoFar": 0,
      "completionsDoneSoFar": 0,
      "expectedTargetMonthEnd": 0,
      "projectedCompletionsMonthEnd": 0
    },
    "recentMonths": [
      {
        "periodKey": "YYYY-MM",
        "closed": true,
        "completionRate": 0,
        "projectedCompletionRate": null,
        "state": "valid | floor_only | invalid | projected_valid | projected_floor_only | projected_invalid | no_data"
      }
    ],
    "windowProximity": {
      "slots": ["valid | floor_only | invalid | projected_valid | projected_floor_only | projected_invalid | empty"],
      "validMonths": 0,
      "monthsBelowFloor": 0,
      "aggregateProjected3mRate": 0
    },
    "components": {
      "currentMonthMomentumScore": 0,
      "recentClosedMonthsScore": 0,
      "achievementWindowProximityScore": 0
    }
  }
}
```

## Implementation notes

- Domain logic lives in `apps/api/src/services/previewAchievementService.ts`.
- Route layer only orchestrates service output in `apps/api/src/routes/tasks.ts`.
- Habit Achievement official verdict flow is untouched.
