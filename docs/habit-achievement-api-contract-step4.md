# Habit Achievement API contracts (Step 4)

## 1) `GET /api/users/:id/rewards/history`

Returns Rewards-screen-ready payload:

- `monthly_wrapups`: existing monthly wrapped history (unchanged).
- `habit_achievements.pending_count`: count of non-expired pending decisions for badge/dot.
- `habit_achievements.achieved_by_pillar`: shelf-ready achieved habits grouped by pillar.

Each habit item includes:

- identifiers: `id`, `task_id`
- task identity: `task_name`, `pillar`, `trait`
- achievement identity: `seal.visible`
- lifecycle: `status` (`maintained|stored`)
- dates: `achieved_at`, `decision_made_at`
- GP metrics: `gp_before_achievement`, `gp_since_maintain`
- toggle state: `maintain_enabled`

## 2) `GET /api/tasks/:taskId/habit-achievement`

Returns current task-level habit achievement state:

- `task`: core task identity + lifecycle context.
- `achievement`: latest achievement record snapshot (or `status=not_achieved`).

## 3) `POST /api/tasks/:taskId/habit-achievement/decision`

Request body:

```json
{ "decision": "maintain" }
```

or

```json
{ "decision": "store" }
```

Behavior:

- Valid only when latest record is pending decision and not expired.
- Applies lifecycle transition.
- Returns fresh state payload (same shape as `GET` endpoint).

## 4) `POST /api/tasks/:taskId/habit-achievement/toggle-maintained`

Request body:

```json
{ "maintainEnabled": true }
```

Behavior:

- Toggles achieved-habit tracking between maintained/stored for shelf behavior.
- Returns fresh state payload (same shape as `GET` endpoint).
