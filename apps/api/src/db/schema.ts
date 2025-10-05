import { relations, sql } from 'drizzle-orm';
import {
  customType,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const citext = customType<{ data: string }>(
  {
    dataType() {
      return 'citext';
    },
  },
);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
};

export const pillars = pgTable(
  'pillars',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description'),
    ...timestamps,
  },
  (table) => ({
    nameIdx: index('pillars_name_idx').on(table.name),
  }),
);

export const traits = pgTable(
  'traits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pillarId: uuid('pillar_id')
      .notNull()
      .references(() => pillars.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => ({
    pillarIdx: index('traits_pillar_id_idx').on(table.pillarId),
  }),
);

export const stats = pgTable(
  'stats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    traitId: uuid('trait_id')
      .notNull()
      .references(() => traits.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    unit: text('unit'),
    ...timestamps,
  },
  (table) => ({
    traitIdx: index('stats_trait_id_idx').on(table.traitId),
  }),
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: citext('email').notNull().unique(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    ...timestamps,
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  }),
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    pillarId: uuid('pillar_id')
      .notNull()
      .references(() => pillars.id, { onDelete: 'cascade' }),
    traitId: uuid('trait_id')
      .references(() => traits.id, { onDelete: 'set null' }),
    statId: uuid('stat_id')
      .references(() => stats.id, { onDelete: 'set null' }),
    title: text('title'),
    description: text('description'),
    weeklyTarget: integer('weekly_target').notNull().default(1),
    xp: smallint('xp').notNull().default(10),
    ...timestamps,
  },
  (table) => ({
    userIdx: index('tasks_user_id_idx').on(table.userId),
    pillarIdx: index('tasks_pillar_id_idx').on(table.pillarId),
    traitIdx: index('tasks_trait_id_idx').on(table.traitId),
    userWeeklyIdx: index('tasks_user_id_weekly_target_idx').on(
      table.userId,
      table.weeklyTarget,
    ),
  }),
);

export const taskLogs = pgTable(
  'task_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    doneAt: timestamp('done_at', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
    ...timestamps,
  },
  (table) => ({
    taskIdx: index('task_logs_task_id_idx').on(table.taskId),
    userIdx: index('task_logs_user_id_idx').on(table.userId),
  }),
);

export const userRewards = pgTable(
  'user_rewards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rewardName: text('reward_name').notNull(),
    points: integer('points').notNull().default(0),
    ...timestamps,
  },
  (table) => ({
    userIdx: index('user_rewards_user_id_idx').on(table.userId),
  }),
);

export const levelRules = pgTable('level_rules', {
  level: integer('level').primaryKey(),
  xpRequired: integer('xp_required').notNull().unique(),
});

export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    points: integer('points').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeIdx: index('achievements_code_idx').on(table.code),
  }),
);

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementCode: text('achievement_code')
      .notNull()
      .references(() => achievements.code),
    earnedAt: timestamp('earned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniq: uniqueIndex('user_achievements_user_id_achievement_code_idx').on(
      table.userId,
      table.achievementCode,
    ),
  }),
);

export const dailyStreaks = pgTable('daily_streaks', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastCheckDate: date('last_check_date'),
});

export const pillarsRelations = relations(pillars, ({ many }) => ({
  traits: many(traits),
  tasks: many(tasks),
}));

export const traitsRelations = relations(traits, ({ many, one }) => ({
  pillar: one(pillars, {
    fields: [traits.pillarId],
    references: [pillars.id],
  }),
  stats: many(stats),
  tasks: many(tasks),
}));

export const statsRelations = relations(stats, ({ many, one }) => ({
  trait: one(traits, {
    fields: [stats.traitId],
    references: [traits.id],
  }),
  tasks: many(tasks),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  tasks: many(tasks),
  taskLogs: many(taskLogs),
  rewards: many(userRewards),
  achievements: many(userAchievements),
  dailyStreak: one(dailyStreaks),
}));

export const tasksRelations = relations(tasks, ({ many, one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  pillar: one(pillars, {
    fields: [tasks.pillarId],
    references: [pillars.id],
  }),
  trait: one(traits, {
    fields: [tasks.traitId],
    references: [traits.id],
  }),
  stat: one(stats, {
    fields: [tasks.statId],
    references: [stats.id],
  }),
  logs: many(taskLogs),
}));

export const taskLogsRelations = relations(taskLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [taskLogs.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskLogs.userId],
    references: [users.id],
  }),
}));

export const userRewardsRelations = relations(userRewards, ({ one }) => ({
  user: one(users, {
    fields: [userRewards.userId],
    references: [users.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  holders: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementCode],
    references: [achievements.code],
  }),
}));

export const dailyStreaksRelations = relations(dailyStreaks, ({ one }) => ({
  user: one(users, {
    fields: [dailyStreaks.userId],
    references: [users.id],
  }),
}));
