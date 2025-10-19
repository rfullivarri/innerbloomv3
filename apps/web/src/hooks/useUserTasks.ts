import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createUserTask,
  deleteUserTask,
  getUserTasks,
  updateUserTask,
  type CreateUserTaskInput,
  type UpdateUserTaskInput,
  type UserTask,
} from '../lib/api';
import type { AsyncStatus } from './useRequest';

export type UserTaskListState = {
  tasks: UserTask[];
  status: AsyncStatus;
  error: Error | null;
};

const DEFAULT_STATE: UserTaskListState = {
  tasks: [],
  status: 'idle',
  error: null,
};

type StoreEntry = {
  state: UserTaskListState;
  listeners: Set<() => void>;
  inflight?: Promise<unknown>;
};

const userTaskStore = new Map<string, StoreEntry>();

function ensureEntry(userId: string): StoreEntry {
  let entry = userTaskStore.get(userId);
  if (!entry) {
    entry = {
      state: { ...DEFAULT_STATE },
      listeners: new Set(),
    };
    userTaskStore.set(userId, entry);
  }
  return entry;
}

function notify(userId: string) {
  const entry = userTaskStore.get(userId);
  if (!entry) {
    return;
  }

  for (const listener of entry.listeners) {
    try {
      listener();
    } catch (error) {
      console.error('[useUserTasks] listener failed', error);
    }
  }
}

type StateUpdater = (state: UserTaskListState) => UserTaskListState;

function mutateState(userId: string, updater: StateUpdater): UserTaskListState {
  const entry = ensureEntry(userId);
  const nextState = updater(entry.state);
  entry.state = nextState;
  notify(userId);
  return nextState;
}

function normalizeString(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function cloneState(state: UserTaskListState): UserTaskListState {
  return {
    status: state.status,
    error: state.error,
    tasks: state.tasks.map((task) => ({ ...task })),
  };
}

function subscribeToUserTasks(userId: string, listener: () => void): () => void {
  const entry = ensureEntry(userId);
  entry.listeners.add(listener);
  return () => {
    const current = userTaskStore.get(userId);
    if (!current) {
      return;
    }
    current.listeners.delete(listener);
  };
}

function getSnapshot(userId: string | null): UserTaskListState {
  if (!userId) {
    return DEFAULT_STATE;
  }
  return ensureEntry(userId).state;
}

async function loadUserTasks(userId: string, options: { force?: boolean } = {}) {
  const entry = ensureEntry(userId);
  if (entry.inflight && !options.force) {
    return entry.inflight;
  }

  mutateState(userId, (state) => ({
    ...state,
    status: 'loading',
    error: null,
  }));

  const request = getUserTasks(userId)
    .then((tasks) => {
      mutateState(userId, () => ({
        tasks,
        status: 'success',
        error: null,
      }));
    })
    .catch((error) => {
      const normalized = error instanceof Error ? error : new Error('Failed to load tasks');
      mutateState(userId, (state) => ({
        ...state,
        status: 'error',
        error: normalized,
      }));
    })
    .finally(() => {
      if (entry.inflight === request) {
        entry.inflight = undefined;
      }
    });

  entry.inflight = request;
  return request;
}

function buildOptimisticTask(payload: CreateUserTaskInput): UserTask {
  const now = new Date().toISOString();
  const title = normalizeString(payload.title) ?? 'Nueva tarea';

  return {
    id: `optimistic-${now}-${Math.random().toString(36).slice(2, 10)}`,
    title,
    pillarId: payload.pillarId ?? null,
    traitId: payload.traitId ?? null,
    statId: payload.statId ?? null,
    difficultyId: payload.difficultyId ?? null,
    notes: normalizeString(payload.notes) ?? null,
    isActive: payload.isActive ?? true,
    xp: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
  } satisfies UserTask;
}

function applyTaskChanges(task: UserTask, payload: UpdateUserTaskInput): UserTask {
  const next: UserTask = { ...task };

  if (payload.title !== undefined) {
    const title = normalizeString(payload.title);
    if (title != null) {
      next.title = title;
    }
  }

  if (payload.pillarId !== undefined) {
    next.pillarId = payload.pillarId ?? null;
  }

  if (payload.traitId !== undefined) {
    next.traitId = payload.traitId ?? null;
  }

  if (payload.statId !== undefined) {
    next.statId = payload.statId ?? null;
  }

  if (payload.difficultyId !== undefined) {
    next.difficultyId = payload.difficultyId ?? null;
  }

  if (payload.notes !== undefined) {
    next.notes = normalizeString(payload.notes) ?? null;
  }

  if (payload.isActive !== undefined) {
    next.isActive = Boolean(payload.isActive);
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

async function createTaskOptimistic(userId: string, payload: CreateUserTaskInput): Promise<UserTask> {
  const entry = ensureEntry(userId);
  const rollbackState = cloneState(entry.state);
  const optimisticTask = buildOptimisticTask(payload);

  mutateState(userId, (state) => ({
    ...state,
    status: state.status === 'idle' ? 'success' : state.status,
    error: null,
    tasks: [...state.tasks, optimisticTask],
  }));

  try {
    const created = await createUserTask(userId, payload);
    mutateState(userId, (state) => {
      let replaced = false;
      const nextTasks = state.tasks.map((task) => {
        if (task.id === optimisticTask.id || task.id === created.id) {
          replaced = true;
          return created;
        }
        return task;
      });

      if (!replaced) {
        nextTasks.push(created);
      }

      return {
        ...state,
        status: 'success',
        error: null,
        tasks: nextTasks,
      };
    });
    return created;
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Failed to create task');
    mutateState(userId, () => ({
      ...rollbackState,
      status: 'error',
      error: normalized,
    }));
    throw normalized;
  }
}

async function updateTaskOptimistic(
  userId: string,
  taskId: string,
  payload: UpdateUserTaskInput,
): Promise<UserTask> {
  const entry = ensureEntry(userId);
  const rollbackState = cloneState(entry.state);

  mutateState(userId, (state) => ({
    ...state,
    tasks: state.tasks.map((task) => (task.id === taskId ? applyTaskChanges(task, payload) : task)),
    error: null,
  }));

  try {
    const updated = await updateUserTask(userId, taskId, payload);
    mutateState(userId, (state) => {
      let replaced = false;
      const nextTasks = state.tasks.map((task) => {
        if (task.id === taskId || task.id === updated.id) {
          replaced = true;
          return updated;
        }
        return task;
      });

      if (!replaced) {
        nextTasks.push(updated);
      }

      return {
        ...state,
        status: state.status === 'idle' ? 'success' : state.status,
        error: null,
        tasks: nextTasks,
      };
    });
    return updated;
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Failed to update task');
    mutateState(userId, () => ({
      ...rollbackState,
      status: 'error',
      error: normalized,
    }));
    throw normalized;
  }
}

async function deleteTaskOptimistic(userId: string, taskId: string): Promise<void> {
  const entry = ensureEntry(userId);
  const rollbackState = cloneState(entry.state);

  mutateState(userId, (state) => ({
    ...state,
    error: null,
    tasks: state.tasks.filter((task) => task.id !== taskId),
    status: state.status === 'idle' ? 'success' : state.status,
  }));

  try {
    await deleteUserTask(userId, taskId);
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Failed to delete task');
    mutateState(userId, () => ({
      ...rollbackState,
      status: 'error',
      error: normalized,
    }));
    throw normalized;
  }
}

export type UseUserTasksResult = UserTaskListState & {
  reload: () => Promise<void>;
};

export function useUserTasks(userId?: string | null): UseUserTasksResult {
  const normalizedUserId = typeof userId === 'string' && userId.trim().length > 0 ? userId : null;

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!normalizedUserId) {
        return () => {};
      }
      return subscribeToUserTasks(normalizedUserId, listener);
    },
    [normalizedUserId],
  );

  const getClientSnapshot = useCallback(() => getSnapshot(normalizedUserId), [normalizedUserId]);
  const snapshot = useSyncExternalStore(subscribe, getClientSnapshot, getClientSnapshot);

  useEffect(() => {
    if (!normalizedUserId) {
      return;
    }
    if (snapshot.status === 'idle') {
      void loadUserTasks(normalizedUserId);
    }
  }, [normalizedUserId, snapshot.status]);

  const reload = useCallback(() => {
    if (!normalizedUserId) {
      return Promise.resolve();
    }
    return loadUserTasks(normalizedUserId, { force: true }).then(() => undefined);
  }, [normalizedUserId]);

  return useMemo(
    () => ({
      tasks: snapshot.tasks,
      status: snapshot.status,
      error: snapshot.error,
      reload,
    }),
    [snapshot.error, snapshot.status, snapshot.tasks, reload],
  );
}

export type CreateTaskMutation = {
  createTask: (userId: string, payload: CreateUserTaskInput) => Promise<UserTask>;
  status: AsyncStatus;
  error: Error | null;
};

export function useCreateTask(): CreateTaskMutation {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const createTask = useCallback(async (userId: string, payload: CreateUserTaskInput) => {
    if (!userId || !userId.trim()) {
      const missing = new Error('userId is required to create a task.');
      setStatus('error');
      setError(missing);
      throw missing;
    }

    setStatus('loading');
    setError(null);

    try {
      const created = await createTaskOptimistic(userId, payload);
      setStatus('success');
      return created;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Failed to create task');
      setStatus('error');
      setError(normalized);
      throw normalized;
    }
  }, []);

  return useMemo(
    () => ({
      createTask,
      status,
      error,
    }),
    [createTask, status, error],
  );
}

export type UpdateTaskMutation = {
  updateTask: (userId: string, taskId: string, payload: UpdateUserTaskInput) => Promise<UserTask>;
  status: AsyncStatus;
  error: Error | null;
};

export function useUpdateTask(): UpdateTaskMutation {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const updateTask = useCallback(async (userId: string, taskId: string, payload: UpdateUserTaskInput) => {
    if (!userId || !userId.trim()) {
      const missing = new Error('userId is required to update a task.');
      setStatus('error');
      setError(missing);
      throw missing;
    }

    if (!taskId || !taskId.trim()) {
      const missing = new Error('taskId is required to update a task.');
      setStatus('error');
      setError(missing);
      throw missing;
    }

    setStatus('loading');
    setError(null);

    try {
      const updated = await updateTaskOptimistic(userId, taskId, payload);
      setStatus('success');
      return updated;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Failed to update task');
      setStatus('error');
      setError(normalized);
      throw normalized;
    }
  }, []);

  return useMemo(
    () => ({
      updateTask,
      status,
      error,
    }),
    [updateTask, status, error],
  );
}

export type DeleteTaskMutation = {
  deleteTask: (userId: string, taskId: string) => Promise<void>;
  status: AsyncStatus;
  error: Error | null;
};

export function useDeleteTask(): DeleteTaskMutation {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const deleteTask = useCallback(async (userId: string, taskId: string) => {
    if (!userId || !userId.trim()) {
      const missing = new Error('userId is required to delete a task.');
      setStatus('error');
      setError(missing);
      throw missing;
    }

    if (!taskId || !taskId.trim()) {
      const missing = new Error('taskId is required to delete a task.');
      setStatus('error');
      setError(missing);
      throw missing;
    }

    setStatus('loading');
    setError(null);

    try {
      await deleteTaskOptimistic(userId, taskId);
      setStatus('success');
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Failed to delete task');
      setStatus('error');
      setError(normalized);
      throw normalized;
    }
  }, []);

  return useMemo(
    () => ({
      deleteTask,
      status,
      error,
    }),
    [deleteTask, status, error],
  );
}

export function __resetUserTasksStore() {
  for (const entry of userTaskStore.values()) {
    entry.listeners.clear();
    entry.inflight = undefined;
  }
  userTaskStore.clear();
}
