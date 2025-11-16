import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_ORIGIN = 'https://tests.local';

if (typeof globalThis.location === 'undefined') {
  Object.defineProperty(globalThis, 'location', {
    value: { origin: TEST_ORIGIN, href: `${TEST_ORIGIN}/` },
    configurable: true,
    writable: true,
  });
} else {
  try {
    Object.assign(globalThis.location, { origin: TEST_ORIGIN, href: `${TEST_ORIGIN}/` });
  } catch {
    Object.defineProperty(globalThis, 'location', {
      value: { origin: TEST_ORIGIN, href: `${TEST_ORIGIN}/` },
      configurable: true,
      writable: true,
    });
  }
}

const fetchMock = vi.fn<[RequestInfo, RequestInit?], Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);

const {
  useUserTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  __resetUserTasksStore,
} = await import('../useUserTasks');
const { setApiAuthTokenProvider } = await import('../../lib/api');

describe('useUserTasks hooks', () => {
  beforeEach(() => {
    __resetUserTasksStore();
    fetchMock.mockReset();
    setApiAuthTokenProvider(async () => 'token-123');
  });

  afterEach(() => {
    setApiAuthTokenProvider(null);
  });

  it('loads tasks from the API', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          tasks: [
            {
              id: 'task-1',
              title: 'Primera tarea',
              pillar_id: 'body',
              trait_id: 'focus',
              stat_id: null,
              difficulty_id: 'easy',
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const { result } = renderHook(() => useUserTasks('user-1'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toMatchObject({
      id: 'task-1',
      title: 'Primera tarea',
      pillarId: 'body',
      traitId: 'focus',
      difficultyId: 'easy',
      isActive: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall?.[0].toString()).toContain('/users/user-1/tasks');
  });

  it('supports creating tasks with optimistic updates', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ tasks: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'task-2',
            title: 'Nueva tarea',
            pillar_id: 'mind',
            trait_id: null,
            stat_id: null,
            difficulty_id: 'medium',
            is_active: true,
            created_at: '2024-02-01T00:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const tasksHook = renderHook(() => useUserTasks('user-1'));
    await waitFor(() => expect(tasksHook.result.current.status).toBe('success'));

    const createHook = renderHook(() => useCreateTask());

    await act(async () => {
      await createHook.result.current.createTask('user-1', {
        title: 'Nueva tarea',
        pillarId: 'mind',
        difficultyId: 'medium',
      });
    });

    expect(createHook.result.current.status).toBe('success');
    expect(tasksHook.result.current.tasks).toHaveLength(1);
    expect(tasksHook.result.current.tasks[0]).toMatchObject({
      id: 'task-2',
      title: 'Nueva tarea',
      pillarId: 'mind',
      difficultyId: 'medium',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall?.[1]?.method).toBe('POST');
  });

  it('supports updating tasks with optimistic updates', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tasks: [
              {
                id: 'task-3',
                title: 'Título original',
                pillar_id: 'soul',
                trait_id: null,
                difficulty_id: 'hard',
                is_active: true,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'task-3',
            title: 'Título actualizado',
            pillar_id: 'soul',
            difficulty_id: 'hard',
            is_active: false,
            updated_at: '2024-03-01T00:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const tasksHook = renderHook(() => useUserTasks('user-1'));
    await waitFor(() => expect(tasksHook.result.current.status).toBe('success'));

    const updateHook = renderHook(() => useUpdateTask());

    await act(async () => {
      await updateHook.result.current.updateTask('user-1', 'task-3', {
        title: 'Título actualizado',
        isActive: false,
      });
    });

    expect(updateHook.result.current.status).toBe('success');
    expect(tasksHook.result.current.tasks[0]).toMatchObject({
      id: 'task-3',
      title: 'Título actualizado',
      isActive: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const updateCall = fetchMock.mock.calls[1];
    expect(updateCall?.[1]?.method).toBe('PATCH');
  });

  it('supports deleting tasks with optimistic updates', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tasks: [
              { id: 'task-4', title: 'Eliminar', is_active: true },
              { id: 'task-5', title: 'Mantener', is_active: true },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const tasksHook = renderHook(() => useUserTasks('user-1'));
    await waitFor(() => expect(tasksHook.result.current.status).toBe('success'));

    const deleteHook = renderHook(() => useDeleteTask());

    await act(async () => {
      await deleteHook.result.current.deleteTask('user-1', 'task-4');
    });

    expect(deleteHook.result.current.status).toBe('success');
    expect(tasksHook.result.current.tasks.map((task) => task.id)).toEqual(['task-5']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const deleteCall = fetchMock.mock.calls[1];
    expect(deleteCall?.[1]?.method).toBe('DELETE');
  });

  it('rolls back optimistic updates when the API request fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tasks: [
              { id: 'task-6', title: 'Persistente', is_active: true },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'boom' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const tasksHook = renderHook(() => useUserTasks('user-1'));
    await waitFor(() => expect(tasksHook.result.current.status).toBe('success'));

    const createHook = renderHook(() => useCreateTask());

    let caught: unknown;
    await act(async () => {
      try {
        await createHook.result.current.createTask('user-1', { title: 'Falla' });
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(createHook.result.current.status).toBe('error');
    expect(tasksHook.result.current.tasks).toHaveLength(1);
    expect(tasksHook.result.current.tasks[0]).toMatchObject({ id: 'task-6' });
    expect(tasksHook.result.current.status).toBe('error');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
