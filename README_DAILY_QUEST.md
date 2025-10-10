# Daily Quest v1 Implementation Plan

This repository contains the groundwork for implementing the Daily Quest v1 experience described in the specification. The changes that still need to be completed are substantial and include database migrations, API endpoints, frontend components, animations, tests, and assets. This README documents the outstanding work and the approach intended to deliver the feature end-to-end.

## Pending Work Overview

1. **Database Layer**
   - Add or update migrations to enforce the `users.tasks_group_id -> tasks_group(id)` foreign key and to ensure every task belongs to a group (either directly via `tasks_group_id` or through a pivot table).
   - Ensure unique indexes for `emotions_logs (user_id, date)` and `daily_log (user_id, task_id, date)` exist.
   - Confirm idempotency of migrations so that deployments to existing environments are safe.

2. **API (apps/api)**
   - Introduce new routes under `/daily-quest`: `GET /status`, `GET /definition`, and `POST /submit`.
   - Implement controller logic that:
     - Resolves the authenticated `user_id` via Clerk and determines the date in the user's timezone.
     - Fetches the user's task group definition and assembles the response payload grouped by `cat_pillar`.
     - Validates request payloads (emotion selection, task membership) with the repo's validation utilities.
     - Persists submissions idempotently to `emotions_logs` and `daily_log`, and recalculates XP/streaks using existing services.
   - Add tests that cover authentication requirements, idempotency, task ownership validation, and defaulting dates to the user's local timezone.

3. **Frontend (apps/web)**
   - Build a `DailyQuestModal` component that:
     - Checks submission status on dashboard load and automatically opens when the daily quest is pending.
     - Fetches the definition payload, renders emotion chips and pillar-based task checklists, and reproduces the specified animations with Framer Motion.
     - Submits selections optimistically, handles errors with toasts, and ensures accessibility (ARIA roles, keyboard support, dark mode compatibility).
     - Includes sticky footer call-to-action and XP counter interactions.
   - Ensure tests cover conditional rendering, single-selection behavior for emotions, XP counter reactions, and modal closing on successful submit.

4. **Assets and Documentation**
   - Record and include a short mobile GIF of the experience.
   - Keep README files and developer notes up to date with setup instructions for the new feature.

## Suggested Implementation Steps

1. **Schema Verification**
   - Inspect existing migrations to determine whether foreign keys and unique indexes already exist and backfill missing constraints with new idempotent migrations.
   - Provide seed data updates if necessary for testing the new flows.

2. **Service Layer Updates**
   - Reuse or extend the existing XP/streak calculation helpers so both the dashboard and the new daily quest endpoint rely on a single source of truth.

3. **API Routes and Validation**
   - Add new controllers and route definitions mirroring existing conventions (e.g., `routes/dailyQuest.ts`).
   - Reuse validation utilities like Zod schemas to keep request parsing consistent across endpoints.

4. **Frontend Integration**
   - Use existing layout components to ensure the modal integrates seamlessly with the dashboard.
   - Follow the design tokens and animation libraries already used in the codebase.

5. **Testing Strategy**
   - Extend API integration tests and frontend component tests to capture the new behavior.
   - Verify XP/streak computations against fixtures used in the dashboard tests.

## Current Status

No code changes have been implemented yet; this document only outlines the plan required to deliver the Daily Quest v1 feature. Future commits should incrementally introduce the database migrations, API endpoints, frontend components, and automated tests described above.

