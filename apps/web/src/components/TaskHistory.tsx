import { useEffect, useState } from 'react';
import { API_BASE, fetchTaskLogs, TaskLogDTO } from '../lib/api';

const USER_ID = '00000000-0000-0000-0000-000000000001';

export default function TaskHistory() {
  const [data, setData] = useState<TaskLogDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!API_BASE) {
      setError('API base URL is not configured.');
      setLoading(false);
      return;
    }

    fetchTaskLogs(USER_ID)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: 'red' }}>Failed to fetch: {error}</p>;

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Recent activity</h3>
      <ul>
        {data.map((log) => (
          <li key={log.id}>
            {new Date(log.doneAt).toLocaleString()} — <strong>{log.taskTitle}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
