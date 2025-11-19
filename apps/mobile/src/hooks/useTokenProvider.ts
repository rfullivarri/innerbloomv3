import { useAuth } from '@clerk/clerk-expo';
import { useMemo } from 'react';
import { createTokenProvider, type TokenProvider } from '../api/client';

type TokenProviderState = {
  tokenProvider: TokenProvider | null;
  clerkUserId: string | null;
  ready: boolean;
  signedIn: boolean;
};

export function useTokenProvider(): TokenProviderState {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();

  const tokenProvider = useMemo(() => {
    if (!isLoaded || !isSignedIn) {
      return null;
    }
    return createTokenProvider(getToken);
  }, [getToken, isLoaded, isSignedIn]);

  return {
    tokenProvider,
    clerkUserId: userId ?? null,
    ready: isLoaded,
    signedIn: Boolean(isSignedIn),
  };
}
