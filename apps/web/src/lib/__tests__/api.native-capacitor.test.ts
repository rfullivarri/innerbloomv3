import { afterEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();

vi.mock('../../mobile/capacitor', () => ({
  getCapacitorHttpPlugin: () => ({
    request: requestMock,
  }),
  isNativeCapacitorPlatform: () => true,
}));

describe('apiAuthorizedFetch native capacitor bridge', () => {
  afterEach(async () => {
    requestMock.mockReset();
    const { setApiAuthTokenProvider } = await import('../api');
    setApiAuthTokenProvider(null);
  });

  it('returns a valid empty response for 204 requests', async () => {
    requestMock.mockResolvedValueOnce({
      status: 204,
      headers: {
        'content-type': 'application/json',
      },
      data: '',
    });

    const { apiAuthorizedFetch, setApiAuthTokenProvider } = await import('../api');
    setApiAuthTokenProvider(async () => 'token-123');

    const response = await apiAuthorizedFetch('/users/user-1/tasks/task-1', {
      method: 'DELETE',
    });

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe('');
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'DELETE',
        responseType: 'text',
      }),
    );
  });
});
