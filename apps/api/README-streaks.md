# Streak panel API

The streak panel endpoints power the Dashboard V3 "Panel de Rachas" widget. They expose weekly, monthly, and quarterly completion
metrics for a user's active tasks grouped by pillar.

## Feature flag & debugging

| Variable | Default | Description |
| --- | --- | --- |
| `SHOW_STREAKS_PANEL` | `true` | Set to `false` to return `404` for the streak endpoints without touching the router. |
| `DEBUG_STREAKS_PANEL` | `false` | When `true` the handler logs the request context and aggregate counts to stdout. |

## `GET /users/:id/streaks/panel`

Returns the panel payload for the selected pillar. The response always includes metrics for the three scopes (week, month, quarter)
so the UI can switch ranges without refetching.

### Query parameters

| Name | Required | Accepted values | Default | Notes |
| --- | --- | --- | --- | --- |
| `pillar` | ✅ | `Body`, `Mind`, `Soul` | — | Filters tasks by `cat_pillar.code`. |
| `range` | ✅ | `week`, `month`, `qtr` | — | Present for parity with the MVP adapter. The response always bundles all scopes. |
| `mode` | ➖ | `Low`, `Chill`, `Flow`, `Evolve` | `Flow` | Controls the weekly goal (`tier`) used for streaks and green bars. Case-insensitive. |
| `query` | ➖ | string | — | Case/diacritic-insensitive match against task name or trait. |

### Response schema

```ts
interface StreakPanelResponse {
  topStreaks: Array<{
    id: string;
    name: string;
    stat: string;
    weekDone: number;
    streakWeeks: number;
  }>;
  tasks: Array<{
    id: string;
    name: string;
    stat: string;
    weekDone: number;
    streakWeeks: number;
    metrics: {
      week: { count: number; xp: number };
      month: { count: number; xp: number; weeks: number[] };
      qtr: { count: number; xp: number; weeks: number[] };
    };
  }>;
}
```

### Computation details

* **Weekly goal (tier)** — Determined by `mode`: `Low=1`, `Chill=2`, `Flow=3`, `Evolve=4` completions per week.
* **Current week** — Monday→Sunday window containing `timezone(now())` for the user. `week.count` sums `daily_log.quantity`
  within that range; XP multiplies by `tasks.xp_base`.
* **Month** — Uses the current calendar month split into 4–5 Monday→Sunday buckets. Each entry in `weeks[]` is the weekly total of
  completions in that slice. `month.count`/`month.xp` aggregate the whole month.
* **Quarter (3M)** — Considers the current month and the previous two. For each month we count how many of its weekly buckets hit the
tier, then scale to the goal: `value = (weeksHit / totalWeeks) * tier`. `qtr.count` and `qtr.xp` sum all completions inside the
three-month window.
* **Streaks** — `streakWeeks` is the number of consecutive weeks meeting the tier, anchored on the current week (which only counts if
  it already meets the target). History looks back up to 52 weeks per task.
* **Top streaks** — Tasks with `streakWeeks >= 2`, ordered by `streakWeeks` descending, returning the first three entries.

### Example requests

```bash
curl -s "https://api.example.com/users/00000000-0000-0000-0000-000000000000/streaks/panel?pillar=Body&range=month&mode=Flow" | jq .

curl -s "https://api.example.com/users/00000000-0000-0000-0000-000000000000/streaks/panel?pillar=Mind&range=qtr&mode=Evolve&query=agua" | jq .
```

### Sample response

```json
{
  "topStreaks": [
    { "id": "a1", "name": "Ayuno", "stat": "Hábitos", "weekDone": 3, "streakWeeks": 12 },
    { "id": "b2", "name": "2L de agua", "stat": "Salud", "weekDone": 4, "streakWeeks": 8 },
    { "id": "c3", "name": "Leer 20m", "stat": "Crecimiento", "weekDone": 2, "streakWeeks": 6 }
  ],
  "tasks": [
    {
      "id": "t1",
      "name": "Ayuno 16:8",
      "stat": "Pilar:1",
      "weekDone": 3,
      "streakWeeks": 12,
      "metrics": {
        "week":  { "count": 3, "xp": 60 },
        "month": { "count": 12, "xp": 240, "weeks": [3, 2, 4, 3] },
        "qtr":   { "count": 32, "xp": 640, "weeks": [2.5, 3, 2.75] }
      }
    }
  ]
}
```

### Manual QA checklist

1. **API smoke test** — run the `curl` samples above (replace with a valid user id and host) and ensure HTTP 200 with `topStreaks`
   and `tasks` arrays.
2. **Dashboard drill-down** — load `Dashboard V3`, open the Panel de Rachas, and switch through:
   * Pillars: Body → Mind → Soul.
   * Ranges: Sem → Mes → 3M.
   * Confirm chips (`✓×N`, `+XP`, 🔥) and bars update without layout jumps.
3. **Search filter** — use the filter input to match a trait name (e.g. "agua") and verify the list and Top 3 refresh.

Disable the panel temporarily by exporting `SHOW_STREAKS_PANEL=false` on both the API and the web app when troubleshooting.
