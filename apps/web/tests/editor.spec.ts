import { expect, test } from '@playwright/test';

type TaskRecord = {
  id: string;
  title: string;
  pillarId: string | null;
  traitId: string | null;
  statId: string | null;
  difficultyId: string | null;
  isActive: boolean;
  xp: number | null;
  createdAt: string;
  updatedAt: string;
};

test.describe('Task editor smoke test', () => {
  test('navigates to the editor and manages tasks', async ({ page }) => {
    const userId = 'mock-user-123';

    const catalogs = {
      pillars: [
        { id: 'pillar-1', code: 'body', name: 'Cuerpo', description: null },
        { id: 'pillar-2', code: 'mind', name: 'Mente', description: null },
      ],
      traits: [
        { id: 'trait-1', pillarId: 'pillar-1', code: 'focus', name: 'Enfoque', description: null },
        { id: 'trait-2', pillarId: 'pillar-2', code: 'clarity', name: 'Claridad', description: null },
      ],
      stats: [
        {
          id: 'stat-1',
          traitId: 'trait-1',
          pillarId: 'pillar-1',
          code: 'breath',
          name: 'Control de respiración',
          description: null,
          unit: null,
        },
      ],
      difficulties: [
        { id: 'easy', code: 'easy', name: 'Fácil', description: null, xpBase: 5 },
        { id: 'hard', code: 'hard', name: 'Difícil', description: null, xpBase: 20 },
      ],
    } as const;

    let tasks: TaskRecord[] = [
      {
        id: 'task-1',
        title: 'Respirar profundo',
        pillarId: 'pillar-1',
        traitId: 'trait-1',
        statId: 'stat-1',
        difficultyId: 'easy',
        isActive: true,
        xp: 15,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    const jsonHeaders = { 'Content-Type': 'application/json' };

  const toApiTask = (task: TaskRecord) => ({
    id: task.id,
    title: task.title,
    pillar_id: task.pillarId,
    trait_id: task.traitId,
    stat_id: task.statId,
    difficulty_id: task.difficultyId,
    is_active: task.isActive,
      xp: task.xp,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    });

    await page.route('**/api/users/me', (route) => {
      route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          user: {
            user_id: userId,
            clerk_user_id: 'clerk-user',
            email_primary: 'mock.user@example.com',
            full_name: 'Mock User',
            image_url: null,
            game_mode: null,
            weekly_target: null,
            timezone: 'UTC',
            locale: 'es-MX',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            deleted_at: null,
          },
        }),
      });
    });

    await page.route('**/api/catalog/pillars', (route) => {
      route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(catalogs.pillars) });
    });

    await page.route('**/api/catalog/traits**', (route) => {
      const url = new URL(route.request().url());
      const pillarId = url.searchParams.get('pillar_id');
      const traits = catalogs.traits.filter((trait) => trait.pillarId === pillarId);
      route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(traits) });
    });

    await page.route('**/api/catalog/stats**', (route) => {
      const url = new URL(route.request().url());
      const traitId = url.searchParams.get('trait_id');
      const stats = catalogs.stats.filter((stat) => stat.traitId === traitId);
      route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(stats) });
    });

    await page.route('**/api/catalog/difficulty', (route) => {
      route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(catalogs.difficulties) });
    });

    await page.route('**/api/users/*/tasks**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const match = url.pathname.match(/\/api\/users\/([^/]+)\/tasks(?:\/([^/]+))?/);
      const method = request.method();

      if (!match) {
        route.fulfill({ status: 404 });
        return;
      }

      const [, targetUserId, maybeTaskId] = match;
      if (targetUserId !== userId) {
        route.fulfill({ status: 403 });
        return;
      }

      if (method === 'GET' && !maybeTaskId) {
        route.fulfill({
          status: 200,
          headers: jsonHeaders,
          body: JSON.stringify({ tasks: tasks.map(toApiTask) }),
        });
        return;
      }

      if (method === 'POST' && !maybeTaskId) {
        const payload = (await request.postDataJSON()) as Record<string, unknown>;
        const now = new Date().toISOString();
        const newTask: TaskRecord = {
          id: `task-${Math.random().toString(36).slice(2, 10)}`,
          title:
            typeof payload.title === 'string' && payload.title.trim().length > 0
              ? payload.title.trim()
              : 'Tarea sin título',
          pillarId: (payload.pillar_id as string | null) ?? null,
          traitId: (payload.trait_id as string | null) ?? null,
          statId: (payload.stat_id as string | null) ?? null,
          difficultyId: (payload.difficulty_id as string | null) ?? null,
          isActive: true,
          xp: null,
          createdAt: now,
          updatedAt: now,
        };
        tasks = [...tasks, newTask];
        route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(toApiTask(newTask)) });
        return;
      }

      if (method === 'PATCH' && maybeTaskId) {
        const payload = (await request.postDataJSON()) as Record<string, unknown>;
        const index = tasks.findIndex((task) => task.id === maybeTaskId);
        if (index < 0) {
          route.fulfill({ status: 404, headers: jsonHeaders, body: JSON.stringify({ message: 'Not found' }) });
          return;
        }

        const current = tasks[index];
        const updated: TaskRecord = {
          ...current,
          title:
            typeof payload.title === 'string' && payload.title.trim().length > 0
              ? payload.title.trim()
              : current.title,
          difficultyId: (payload.difficulty_id as string | null) ?? null,
          isActive:
            typeof payload.is_active === 'boolean'
              ? payload.is_active
              : typeof payload.is_active === 'string'
                ? payload.is_active.toLowerCase() !== 'false'
                : current.isActive,
          updatedAt: new Date().toISOString(),
        };

        tasks = [...tasks.slice(0, index), updated, ...tasks.slice(index + 1)];
        route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(toApiTask(updated)) });
        return;
      }

      if (method === 'DELETE' && maybeTaskId) {
        tasks = tasks.filter((task) => task.id !== maybeTaskId);
        route.fulfill({ status: 204, headers: jsonHeaders, body: '' });
        return;
      }

      route.fulfill({ status: 405 });
    });

    await page.goto('/editor');

    await expect(page.getByRole('main').getByRole('heading', { name: 'Task Editor' })).toBeVisible();
    await expect(page.getByText('Respirar profundo')).toBeVisible();

    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    const createModal = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'Crear tarea personalizada' }) });
    await expect(createModal).toBeVisible();

    await createModal.getByLabel('Selecciona un pilar').selectOption('pillar-1');
    const selectElements = createModal.locator('select');
    const traitSelect = selectElements.nth(1);
    await expect(traitSelect).toBeEnabled();
    await traitSelect.selectOption('trait-1');
    await createModal.getByPlaceholder('Ej. Entrenar 30 minutos').fill('Meditación matutina');
    await createModal.getByLabel('Dificultad').selectOption('easy');
    await createModal.getByRole('button', { name: 'Crear tarea' }).click();

    await expect(page.getByText('Tarea creada correctamente.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    const newTaskCard = page.locator('article').filter({ hasText: 'Meditación matutina' });
    await expect(newTaskCard).toBeVisible();

    await newTaskCard.getByRole('button', { name: 'Editar' }).click();
    const editModal = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'Actualiza los detalles de tu tarea' }) });
    await expect(editModal).toBeVisible();
    await editModal.getByLabel('Título de la tarea').fill('Meditación avanzada');
    await editModal.getByLabel('Dificultad').selectOption('hard');
    await editModal.getByLabel('Activa').uncheck();
    await editModal.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Tarea actualizada correctamente.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    const updatedCard = page.locator('article').filter({ hasText: 'Meditación avanzada' });
    await expect(updatedCard).toContainText('Inactiva');

    await updatedCard.getByRole('button', { name: 'Eliminar' }).click();
    const deleteDialog = page
      .locator('[role="dialog"]')
      .filter({ has: page.getByRole('heading', { name: 'Eliminar tarea' }) });
    await expect(deleteDialog).toBeVisible();
    await expect(
      deleteDialog.getByText('¿Seguro que quieres eliminar “Meditación avanzada”?'),
    ).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Eliminar' }).click();

    await expect(page.locator('article').filter({ hasText: 'Meditación avanzada' })).toHaveCount(0);
  });
});
