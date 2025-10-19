import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

type MockAuthContext = {
  auth: {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null;
    getToken: (options?: { template?: string }) => Promise<string>;
    signOut: (options?: { redirectUrl?: string }) => Promise<void>;
  };
  user: {
    isLoaded: boolean;
    user: {
      id: string;
      fullName: string;
      primaryEmailAddress: { emailAddress: string } | null;
      imageUrl: string | null;
    } | null;
  };
};

const MOCK_USER_ID = 'mock-user-123';

const MockClerkContext = createContext<MockAuthContext | null>(null);

export function ClerkProvider({ children }: PropsWithChildren<{ publishableKey?: string }>) {
  const value = useMemo<MockAuthContext>(() => {
    return {
      auth: {
        isLoaded: true,
        isSignedIn: true,
        userId: MOCK_USER_ID,
        async getToken() {
          return 'mock-token';
        },
        async signOut() {
          // no-op for tests
        },
      },
      user: {
        isLoaded: true,
        user: {
          id: MOCK_USER_ID,
          fullName: 'Mock User',
          primaryEmailAddress: { emailAddress: 'mock.user@example.com' },
          imageUrl: null,
        },
      },
    };
  }, []);

  return <MockClerkContext.Provider value={value}>{children}</MockClerkContext.Provider>;
}

function useMockClerkContext(): MockAuthContext {
  const context = useContext(MockClerkContext);
  if (!context) {
    throw new Error('Mock Clerk context is not available.');
  }
  return context;
}

export function useAuth() {
  return useMockClerkContext().auth;
}

export function useUser() {
  return useMockClerkContext().user;
}

export function SignIn() {
  return <div data-testid="mock-sign-in">Iniciar sesión no disponible en modo test.</div>;
}

export function SignUp() {
  return <div data-testid="mock-sign-up">Registro no disponible en modo test.</div>;
}
