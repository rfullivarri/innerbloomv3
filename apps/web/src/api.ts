const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const API_BASE = rawBaseUrl.replace(/\/+$/, '');
const useMock = API_BASE === '';

let mockPlayer = {
  id: 'mock-player',
  nickname: 'Chill Player',
  totalXp: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function ensureBase(): string {
  if (useMock) {
    throw new Error('API base URL is not configured. Running in offline mode.');
  }
  return API_BASE;
}

function buildUrl(path: string) {
  const base = ensureBase();
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${normalizedPath}`;
}

export type Player = {
  id: string;
  nickname: string;
  totalXp: number;
  createdAt: string;
  updatedAt: string;
};

export async function fetchPlayer(): Promise<Player> {
  if (useMock) {
    return Promise.resolve(mockPlayer);
  }

  const response = await fetch(buildUrl('/player'));

  if (!response.ok) {
    throw new Error(`Failed to load player (${response.status})`);
  }

  const data = (await response.json()) as { player: Player };
  return data.player;
}

export async function awardXp(amount: number): Promise<Player> {
  if (useMock) {
    mockPlayer = {
      ...mockPlayer,
      totalXp: mockPlayer.totalXp + amount,
      updatedAt: new Date().toISOString(),
    };
    return Promise.resolve(mockPlayer);
  }

  const response = await fetch(buildUrl('/player/xp'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Failed to update XP (${response.status})`);
  }

  const data = (await response.json()) as { player: Player };
  return data.player;
}
