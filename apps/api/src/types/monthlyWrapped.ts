export type MonthlyWrappedKpis = {
  tasksCompleted: number;
  xpGained: number;
  dominantPillar: string | null;
  dominantPillarTasksCompleted: number;
};

export type MonthlyWrappedSlide2 = {
  title: 'upgrade_available' | 'you_were_close';
  message: string;
  missingTasksToUpgrade: number;
};

export type MonthlyWrappedPayload = {
  period_key: string;
  current_mode: string | null;
  mode_weekly_target: number;
  tasks_total_evaluated: number;
  tasks_meeting_goal: number;
  task_pass_rate: number;
  eligible_for_upgrade: boolean;
  suggested_next_mode: string | null;
  monthly_kpis: MonthlyWrappedKpis;
  slide_2: MonthlyWrappedSlide2;
};

export type MonthlyWrappedEntry = {
  id: string;
  userId: string;
  periodKey: string;
  payload: MonthlyWrappedPayload;
  summary: {
    period_key: string;
    current_mode: string | null;
    suggested_next_mode: string | null;
    eligible_for_upgrade: boolean;
    missing_tasks_to_upgrade: number;
    tasks_completed: number;
    xp_gained: number;
    dominant_pillar: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};
