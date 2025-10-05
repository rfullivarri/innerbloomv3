import { useAuth, useUser } from '@clerk/clerk-react';

export function Navbar() {
  const { userId, signOut } = useAuth();
  const { user } = useUser();

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/' });
  };

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || userId?.slice(0, 8);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-surface/75 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Innerbloom</p>
          <h1 className="font-display text-xl font-semibold text-white md:text-2xl">Daily Quest Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {displayName && (
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs text-text-muted md:inline-flex">
              {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text transition hover:border-white/20 hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
