interface ProfileCardProps {
  imageUrl?: string | null;
}

export function ProfileCard({ imageUrl }: ProfileCardProps) {
  const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="aspect-[5/6] w-full">
        {hasImage ? (
          <img
            src={imageUrl ?? ''}
            alt="Avatar"
            className="h-full w-full rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/10 text-5xl text-white/80 shadow-lg">
            👤
          </div>
        )}
      </div>
    </section>
  );
}
