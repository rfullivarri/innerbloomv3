import {
  ClerkProvider,
  useAuth as useClerkAuth,
  useClerk as useClerkRuntime,
  useUser as useClerkUser,
  type LocalizationResource,
} from '@clerk/clerk-react';
import {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';

type RuntimeAuthValue = {
  auth: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null;
    getToken: (options?: { template?: string }) => Promise<string | null>;
    signOut: (options?: { redirectUrl?: string }) => Promise<void>;
  };
  user: {
    isLoaded: boolean;
    user: ReturnType<typeof useClerkUser>['user'];
  };
  clerk: {
    openUserProfile: () => void;
  };
};

const RuntimeAuthContext = createContext<RuntimeAuthValue | null>(null);

const signedOutRuntimeValue: RuntimeAuthValue = {
  auth: {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    async getToken() {
      return null;
    },
    async signOut() {
      return;
    },
  },
  user: {
    isLoaded: true,
    user: null,
  },
  clerk: {
    openUserProfile() {
      return;
    },
  },
};

function ClerkRuntimeBridge({ children }: PropsWithChildren) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();
  const clerk = useClerkRuntime();

  return (
    <RuntimeAuthContext.Provider
      value={{
        auth: {
          isLoaded: clerkAuth.isLoaded,
          isSignedIn: clerkAuth.isSignedIn,
          userId: clerkAuth.userId,
          getToken: clerkAuth.getToken,
          signOut: clerkAuth.signOut,
        },
        user: {
          isLoaded: clerkUser.isLoaded,
          user: clerkUser.user,
        },
        clerk: {
          openUserProfile: clerk.openUserProfile,
        },
      }}
    >
      {children}
    </RuntimeAuthContext.Provider>
  );
}

type RuntimeAuthProviderProps = PropsWithChildren<{
  clerkEnabled: boolean;
  publishableKey: string;
  localization?: LocalizationResource;
  signInUrl?: string;
  signUpUrl?: string;
  signInForceRedirectUrl?: string;
  signUpForceRedirectUrl?: string;
  signInFallbackRedirectUrl?: string;
  signUpFallbackRedirectUrl?: string;
  standardBrowser?: boolean;
  touchSession?: boolean;
}>;

export function RuntimeAuthProvider({
  children,
  clerkEnabled,
  ...clerkProps
}: RuntimeAuthProviderProps) {
  if (!clerkEnabled) {
    return <RuntimeAuthContext.Provider value={signedOutRuntimeValue}>{children}</RuntimeAuthContext.Provider>;
  }

  return (
    <ClerkProvider {...clerkProps}>
      <ClerkRuntimeBridge>{children}</ClerkRuntimeBridge>
    </ClerkProvider>
  );
}

function useRuntimeAuthContext(): RuntimeAuthValue {
  const context = useContext(RuntimeAuthContext);
  if (!context) {
    throw new Error('Runtime auth context is not available.');
  }
  return context;
}

export function useAuth() {
  return useRuntimeAuthContext().auth;
}

export function useUser() {
  return useRuntimeAuthContext().user;
}

export function useClerk() {
  return useRuntimeAuthContext().clerk;
}
