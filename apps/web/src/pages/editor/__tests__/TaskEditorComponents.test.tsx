import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pillar, Trait, Stat, Difficulty } from '../../../lib/api/catalogs';
import type { UserTask } from '../../../lib/api';
import { CreateTaskModal, DeleteTaskModal, EditTaskModal, TaskList } from '../index';

const createTaskMock = vi.fn();
const updateTaskMock = vi.fn();
const deleteTaskActionMock = vi.fn();

vi.mock('../../../hooks/useUserTasks', () => ({
  useCreateTask: () => ({ createTask: createTaskMock, status: 'idle' as const }),
  useUpdateTask: () => ({ updateTask: updateTaskMock, status: 'idle' as const }),
  useDeleteTask: () => ({ deleteTask: deleteTaskActionMock, status: 'idle' as const }),
}));

const traitsData: Trait[] = [
  { id: 'trait-1', pillarId: 'pillar-1', code: 'focus', name: 'Enfoque', description: null },
  { id: 'trait-2', pillarId: 'pillar-2', code: 'energy', name: 'Energía', description: null },
];

const statsData: Stat[] = [
  {
    id: 'stat-1',
    traitId: 'trait-1',
    pillarId: 'pillar-1',
    code: 'precision',
    name: 'Precisión',
    description: null,
    unit: null,
  },
];

const difficultiesData: Difficulty[] = [
  { id: 'easy', code: 'easy', name: 'Fácil', description: null, xpBase: 5 },
  { id: 'hard', code: 'hard', name: 'Difícil', description: null, xpBase: 15 },
];

vi.mock('../../../hooks/useCatalogs', () => ({
  useTraits: (pillarId?: string | null) => ({
    data: pillarId ? traitsData.filter((trait) => trait.pillarId === pillarId) : traitsData,
    status: pillarId ? 'success' : 'idle',
    error: null,
    isLoading: false,
    reload: vi.fn(),
  }),
  useStats: (traitId?: string | null) => ({
    data: traitId ? statsData.filter((stat) => stat.traitId === traitId) : statsData,
    status: traitId ? 'success' : 'idle',
    error: null,
    isLoading: false,
    reload: vi.fn(),
  }),
  useDifficulties: () => ({
    data: difficultiesData,
    status: 'success' as const,
    error: null,
    isLoading: false,
    reload: vi.fn(),
  }),
  usePillars: () => ({
    data: [],
    status: 'success' as const,
    error: null,
    isLoading: false,
    reload: vi.fn(),
  }),
}));

describe('Task editor components', () => {
  beforeEach(() => {
    createTaskMock.mockReset();
    updateTaskMock.mockReset();
    deleteTaskActionMock.mockReset();
  });

  it('renders the task list and triggers edit/delete actions', async () => {
    const user = userEvent.setup();
    const tasks: UserTask[] = [
      {
        id: 'task-1',
        title: 'Registrar hábitos',
        pillarId: 'pillar-1',
        traitId: 'trait-1',
        statId: null,
        difficultyId: 'easy',
        isActive: true,
        xp: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        completedAt: null,
        archivedAt: null,
      },
    ];

    const pillarNames = new Map<string, string>([['pillar-1', 'Cuerpo']]);
    const traitNames = new Map<string, string>([['trait-1', 'Enfoque']]);
    const statNames = new Map<string, string>();
    const difficultyNames = new Map<string, string>([['easy', 'Fácil']]);
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TaskList
        tasks={tasks}
        pillarNamesById={pillarNames}
        traitNamesById={traitNames}
        statNamesById={statNames}
        difficultyNamesById={difficultyNames}
        onEditTask={handleEdit}
        onDeleteTask={handleDelete}
      />,
    );

    expect(screen.getAllByText('Registrar hábitos')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Cuerpo')[0]).toBeInTheDocument();

    const [desktopCard] = screen.getAllByRole('article');

    await user.click(within(desktopCard).getByRole('button', { name: 'Editar' }));
    expect(handleEdit).toHaveBeenCalledWith(tasks[0]);

    await user.click(within(desktopCard).getByRole('button', { name: 'Eliminar' }));
    expect(handleDelete).toHaveBeenCalledWith(tasks[0]);
  });

  it('renders the delete modal and confirms the action', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    const task: UserTask = {
      id: 'task-2',
      title: 'Eliminar tarea',
      pillarId: 'pillar-1',
      traitId: null,
      statId: null,
      difficultyId: null,
      isActive: true,
      xp: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: null,
      archivedAt: null,
    };

    render(
      <DeleteTaskModal
        open
        onClose={onClose}
        task={task}
        isDeleting={false}
        errorMessage={null}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Eliminar tarea')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows validation errors when creating a task without required fields', () => {
    const pillars: Pillar[] = [
      { id: 'pillar-1', code: 'body', name: 'Cuerpo', description: null },
    ];

    render(
      <CreateTaskModal
        open
        onClose={vi.fn()}
        userId="user-123"
        pillars={pillars}
        isLoadingPillars={false}
        pillarsError={null}
        onRetryPillars={vi.fn()}
      />,
    );

    const form = screen.getByText('Crear tarea personalizada').closest('form');
    if (!form) {
      throw new Error('Form element not found');
    }

    fireEvent.submit(form);

    expect(screen.getByText('Selecciona un pilar para continuar.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona un rasgo para continuar.')).toBeInTheDocument();
    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
  });

  it('submits the create task modal successfully', async () => {
    const user = userEvent.setup();
    const pillars: Pillar[] = [
      { id: 'pillar-1', code: 'body', name: 'Cuerpo', description: null },
      { id: 'pillar-2', code: 'mind', name: 'Mente', description: null },
    ];

    createTaskMock.mockResolvedValueOnce({
      id: 'task-created',
      title: 'Nueva tarea',
      pillarId: 'pillar-1',
      traitId: 'trait-1',
      statId: null,
      difficultyId: 'easy',
      isActive: true,
      xp: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: null,
      archivedAt: null,
    } as UserTask);

    render(
      <CreateTaskModal
        open
        onClose={vi.fn()}
        userId="user-123"
        pillars={pillars}
        isLoadingPillars={false}
        pillarsError={null}
        onRetryPillars={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Selecciona un pilar'), 'pillar-1');
    await user.selectOptions(screen.getByLabelText('Selecciona un rasgo'), 'trait-1');
    await user.type(screen.getByPlaceholderText('Ej. Entrenar 30 minutos'), 'Nueva tarea');
    await user.selectOptions(screen.getByLabelText('Dificultad'), 'easy');

    await user.click(screen.getByRole('button', { name: 'Crear tarea' }));

    await waitFor(() => {
      expect(createTaskMock).toHaveBeenCalledWith('user-123', {
        title: 'Nueva tarea',
        pillarId: 'pillar-1',
        traitId: 'trait-1',
        statId: null,
        difficultyId: 'easy',
      });
    });

    expect(await screen.findByText('Tarea creada correctamente.')).toBeInTheDocument();
  });


  it('calls parent success handler and closes after saving an edited task', async () => {
    const user = userEvent.setup();
    const pillars: Pillar[] = [{ id: 'pillar-1', code: 'body', name: 'Cuerpo', description: null }];

    const task: UserTask = {
      id: 'task-4',
      title: 'Tarea original',
      pillarId: 'pillar-1',
      traitId: 'trait-1',
      statId: 'stat-1',
      difficultyId: 'easy',
      isActive: true,
      xp: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: null,
      archivedAt: null,
    };

    const onClose = vi.fn();
    const onTaskUpdated = vi.fn();
    updateTaskMock.mockResolvedValueOnce({ ...task, title: 'Tarea guardada' });

    render(
      <EditTaskModal
        open
        onClose={onClose}
        onTaskUpdated={onTaskUpdated}
        userId="user-123"
        task={task}
        pillars={pillars}
      />,
    );

    await user.clear(screen.getByLabelText('Título de la tarea'));
    await user.type(screen.getByLabelText('Título de la tarea'), 'Tarea guardada');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(onTaskUpdated).toHaveBeenCalledWith('Tarea actualizada correctamente.');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText('Tarea actualizada correctamente.')).not.toBeInTheDocument();
  });

  it('validates and submits the edit task modal', async () => {
    const user = userEvent.setup();
    const pillars: Pillar[] = [
      { id: 'pillar-1', code: 'body', name: 'Cuerpo', description: null },
    ];

    const task: UserTask = {
      id: 'task-3',
      title: 'Título original',
      pillarId: 'pillar-1',
      traitId: 'trait-1',
      statId: 'stat-1',
      difficultyId: 'easy',
      isActive: true,
      xp: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: null,
      archivedAt: null,
    };

    render(
      <EditTaskModal
        open
        onClose={vi.fn()}
        userId="user-123"
        task={task}
        pillars={pillars}
      />,
    );

    const heading = screen.getByRole('heading', { name: 'Actualiza los detalles de tu tarea' });
    const form = heading.closest('form');
    if (!form) {
      throw new Error('Edit form not found');
    }

    await user.clear(screen.getByLabelText('Título de la tarea'));
    fireEvent.submit(form);
    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Título de la tarea'), 'Título actualizado');
    await user.selectOptions(screen.getByLabelText('Dificultad'), 'hard');
    await user.click(screen.getByLabelText('Activa'));

    updateTaskMock.mockResolvedValueOnce({ ...task, title: 'Título actualizado', isActive: false });

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(updateTaskMock).toHaveBeenCalledWith('user-123', 'task-3', {
        title: 'Título actualizado',
        difficultyId: 'hard',
        isActive: false,
      });
    });

    expect(await screen.findByText('Tarea actualizada correctamente.')).toBeInTheDocument();
  });
});
