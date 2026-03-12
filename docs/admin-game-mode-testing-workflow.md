# Admin Game Mode Testing Workflow

This workflow is for internal product/debug testing from Admin user detail.

## Manual Game Mode Override

- Endpoint: `POST /api/admin/user/:userId/game-mode`
- Body:
  - `targetModeKey`: `LOW | CHILL | FLOW | EVOLVE` (or `targetModeId`)
  - `reason`: free-text reason for the admin override
- The endpoint uses the shared mode-change service (`changeUserGameMode`) used by onboarding and Accept Upgrade, so it:
  - writes through `users.game_mode_id`
  - keeps `image_url` and `avatar_url` in sync
  - preserves history through the existing DB trigger on `users.game_mode_id`

## Analysis Tools (Admin)

- `Run Monthly Analysis` keeps the existing monthly testing flow (task calibration + monthly upgrade aggregation).
- `Recompute Rolling 30d Analysis` recomputes the rolling upgrade analysis for the currently selected user.
- Admin UI now surfaces key upgrade signals for debugging:
  - `current_mode`
  - `next_mode`
  - `eligible_for_upgrade`
  - `tasks_meeting_goal / tasks_total_evaluated`
  - `task_pass_rate`
  - window (`analysis_start` → `analysis_end`)
  - `reason_if_empty`

## Safe Testing Notes

- Manual admin mode changes intentionally bypass eligibility checks.
- No XP/GP/level/difficulty logic is changed by this flow.
- Use manual mode override + rolling/monthly analysis buttons to simulate upgrade paths without CTA/UI dependence.
