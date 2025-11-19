import { createContext, useContext, type ReactNode } from 'react';
import { fetchCurrentUserProfile, type CurrentUserProfile } from '../api/client';
import { useApiQuery, type AsyncStatus } from './useApiQuery';
import { useTokenProvider } from './useTokenProvider';

type BackendUserState = {
  profile: CurrentUserProfile | null;
  backendUserId: string | null;
  clerkUserId: string | null;
  status: AsyncStatus;
  error: Error | null;
  reload: () => void;
};

const BackendUserContext = createContext<BackendUserState | null>(null);

function useBackendUserValue(): BackendUserState {
  const { tokenProvider, clerkUserId } = useTokenProvider();
  const enabled = Boolean(tokenProvider && clerkUserId);
  const { data, status, error, reload } = useApiQuery(
    () => fetchCurrentUserProfile(tokenProvider!),
    [tokenProvider],
    { enabled },
  );

  const profile = status === 'success' ? data : null;
  const backendUserId = profile?.user_id ?? null;

  return {
    profile,
    backendUserId,
    clerkUserId,
    status: enabled ? status : 'loading',
    error: enabled ? error : null,
    reload,
  };
}

export function BackendUserProvider({ children }: { children: ReactNode }) {
  const value = useBackendUserValue();
  return <BackendUserContext.Provider value={value}>{children}</BackendUserContext.Provider>;
}

export function useBackendUserContext(): BackendUserState {
  const context = useContext(BackendUserContext);
  if (!context) {
    throw new Error('useBackendUserContext must be used within BackendUserProvider');
  }
  return context;
}
