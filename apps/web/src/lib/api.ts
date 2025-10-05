export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

async function j<T>(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export type TaskLogDTO = { id: string; taskId: string; taskTitle: string; doneAt: string };
export async function fetchTaskLogs(userId: string) {
  return j<TaskLogDTO[]>(`${API_BASE}/api/task-logs?userId=${encodeURIComponent(userId)}`);
}

export type Pillar = { id: string; name: string; description: string | null };
export async function fetchPillars() {
  return j<Pillar[]>(`${API_BASE}/api/pillars`);
}
