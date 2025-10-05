/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__: string | undefined;
