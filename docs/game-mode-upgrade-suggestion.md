# Game Mode Upgrade Suggestion API

Backend endpoints for frontend consumption:

- `GET /api/game-mode/upgrade-suggestion`
- `POST /api/game-mode/upgrade-suggestion/accept`
- `POST /api/game-mode/upgrade-suggestion/dismiss`

## GET payload

```json
{
  "current_mode": "LOW",
  "suggested_mode": "CHILL",
  "period_key": "2026-02",
  "eligible_for_upgrade": true,
  "tasks_total_evaluated": 10,
  "tasks_meeting_goal": 8,
  "task_pass_rate": 0.8,
  "accepted_at": null,
  "dismissed_at": null
}
```

## Frontend behavior notes

- The API **suggests** upgrades and never auto-upgrades in monthly cron.
- When `dismissed_at` is not null, suppress prompting for that period.
- `accept` requires active subscription validation through existing billing middleware.
- `accept` changes `users.game_mode_id`; `user_game_mode_history` is captured by existing DB trigger.

## Monthly Wrap-Up integration (backend)

- Monthly aggregation now persists a `monthly_wrapped` payload per user and period (`YYYY-MM`) using the upgrade aggregate + suggestion context.
- Stored payload fields include:
  - `period_key`
  - `current_mode`
  - `mode_weekly_target`
  - `tasks_total_evaluated`
  - `tasks_meeting_goal`
  - `task_pass_rate`
  - `eligible_for_upgrade`
  - `suggested_next_mode`
  - `monthly_kpis` (tasks completed, XP gained, dominant pillar)
  - `slide_2` copy support (`upgrade_available` or `you_were_close` + missing task count)
- Retention is capped at the latest 2 monthly records per user.

### Rewards/history endpoint

- `GET /api/users/:id/rewards/history`
- Response:

```json
{
  "monthly_wrapups": [
    {
      "id": "...",
      "periodKey": "2026-02",
      "payload": {
        "period_key": "2026-02",
        "eligible_for_upgrade": true,
        "suggested_next_mode": "EVOLVE"
      }
    }
  ]
}
```
