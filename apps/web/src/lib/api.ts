export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

function base(): string {
  if (!API_BASE) throw new Error('API base URL is not configured.');
  return API_BASE;
}

async function j<T>(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export type Pillar = { id: string; name: string; description: string };
export async function fetchPillars() {
  return j<Pillar[]>(`${base()}/pillars`);
}

export type TaskLogDTO = { id: string; taskId: string; taskTitle: string; doneAt: string };
export async function fetchTaskLogs(userId: string) {
  return j<TaskLogDTO[]>(`${base()}/task-logs?userId=${encodeURIComponent(userId)}`);
}
