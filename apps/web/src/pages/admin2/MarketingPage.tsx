import { useMemo, useState } from 'react';
import { marketingCampaignSeed, type MarketingPostSeed, type MarketingPostStatus } from '../../content/marketingAdminSeed';
import { downloadMetricoolCalendarCsv } from '../../lib/marketingMetricoolCsv';

const STATUS_LABELS: Record<MarketingPostStatus, string> = {
  draft: 'Draft',
  needs_review: 'Needs review',
  approved: 'Approved',
};

function statusClass(status: MarketingPostStatus) {
  if (status === 'approved') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  }

  if (status === 'needs_review') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200';
  }

  return 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] text-[color:var(--admin-muted)]';
}

function PostCard({
  post,
  expanded,
  onToggleExpanded,
  onStatusChange,
}: {
  post: MarketingPostSeed;
  expanded: boolean;
  onToggleExpanded: (postId: string) => void;
  onStatusChange: (postId: string, status: MarketingPostStatus) => void;
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
        aria-expanded={expanded}
        onClick={() => onToggleExpanded(post.id)}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">
            <span>{post.scheduledDate}</span>
            <span>/</span>
            <span>{post.scheduledTime.slice(0, 5)}</span>
            <span>/</span>
            <span>{post.platform}</span>
            <span>/</span>
            <span>{post.format}</span>
          </div>
          <h3 className="mt-1 truncate text-base font-semibold tracking-tight md:text-lg">
            {post.assets[0]?.title ?? post.id}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(post.status)}`}>
            {STATUS_LABELS[post.status]}
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] text-sm font-semibold text-[color:var(--admin-muted)]">
            {expanded ? '-' : '+'}
          </span>
        </div>
      </button>

      {!expanded ? null : (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {post.assets.map((asset) => (
              <img
                key={asset.file}
                src={asset.url}
                alt={asset.title}
                className="h-32 w-32 shrink-0 rounded-xl border border-[color:var(--admin-border)] object-cover"
                loading="lazy"
              />
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Caption</p>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 text-xs leading-relaxed text-[color:var(--admin-text)]">
                {post.caption}
              </pre>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Schedule</p>
                <p className="mt-1 font-medium">{post.scheduledDate} / {post.scheduledTime}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Hypothesis</p>
                <p className="mt-1 text-[color:var(--admin-muted)]">{post.hypothesis}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Metric</p>
                <p className="mt-1 text-[color:var(--admin-muted)]">{post.metric}</p>
              </div>
              <a
                href={post.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-xs font-semibold text-[color:var(--admin-accent)]"
              >
                {post.trackingUrl}
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="admin2-btn admin2-btn--success" onClick={() => onStatusChange(post.id, 'approved')}>
              Approve
            </button>
            <button type="button" className="admin2-btn admin2-btn--secondary" onClick={() => onStatusChange(post.id, 'needs_review')}>
              Needs review
            </button>
            <button type="button" className="admin2-btn admin2-btn--ghost" onClick={() => onStatusChange(post.id, 'draft')}>
              Draft
            </button>
            <button type="button" className="admin2-btn admin2-btn--ghost" disabled title="Next step: wire generation service">
              Regenerate copy
            </button>
            <button type="button" className="admin2-btn admin2-btn--ghost" disabled title="Next step: wire image generation">
              Regenerate image
            </button>
          </div>
        </>
      )}
    </article>
  );
}

export function MarketingPage() {
  const [postCount, setPostCount] = useState(marketingCampaignSeed.postCount);
  const [posts, setPosts] = useState(marketingCampaignSeed.posts);
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(() => new Set());
  const approvedPosts = useMemo(() => posts.filter((post) => post.status === 'approved'), [posts]);
  const needsReviewCount = posts.filter((post) => post.status === 'needs_review').length;

  function updateStatus(postId: string, status: MarketingPostStatus) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => (post.id === postId ? { ...post, status } : post)),
    );
  }

  function downloadApprovedCsv() {
    downloadMetricoolCalendarCsv(approvedPosts);
  }

  function toggleExpanded(postId: string) {
    setExpandedPostIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(postId)) {
        nextIds.delete(postId);
      } else {
        nextIds.add(postId);
      }
      return nextIds;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Marketing</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Monthly content approval board</h2>
            <p className="mt-3 max-w-3xl text-sm text-[color:var(--admin-muted)]">
              Review generated posts, approve the ones that are ready, and export a Metricool CSV for the approved queue.
            </p>
          </div>
          <button
            type="button"
            className="admin2-btn admin2-btn--primary"
            onClick={downloadApprovedCsv}
            disabled={approvedPosts.length === 0}
          >
            Download Metricool CSV
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Configured posts</p>
          <label className="mt-3 block">
            <span className="sr-only">Monthly post count</span>
            <input
              type="number"
              min={1}
              max={100}
              value={postCount}
              onChange={(event) => setPostCount(Number(event.target.value))}
              className="w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-2xl font-semibold text-[color:var(--admin-text)]"
            />
          </label>
        </div>
        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Approved</p>
          <p className="mt-3 text-3xl font-semibold">{approvedPosts.length}</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Needs review</p>
          <p className="mt-3 text-3xl font-semibold">{needsReviewCount}</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Campaign</p>
          <p className="mt-3 text-lg font-semibold">{marketingCampaignSeed.campaignCode}</p>
          <p className="mt-1 text-xs text-[color:var(--admin-muted)]">{marketingCampaignSeed.language}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
          <h3 className="text-lg font-semibold tracking-tight">Data & storage</h3>
          <p className="mt-2 text-sm text-[color:var(--admin-muted)]">
            This is prepared for GA4, Search Console and manual Metricool exports. Live integrations are intentionally not wired yet.
          </p>
          <div className="mt-4 grid gap-3 text-sm">
            <a className="font-semibold text-[color:var(--admin-accent)]" href={marketingCampaignSeed.driveRootUrl} target="_blank" rel="noreferrer">
              Google Drive marketing root
            </a>
            <a className="font-semibold text-[color:var(--admin-accent)]" href={marketingCampaignSeed.strategyMemoryUrl} target="_blank" rel="noreferrer">
              Strategy memory file
            </a>
            <a className="font-semibold text-[color:var(--admin-accent)]" href={marketingCampaignSeed.assetsFolderUrl} target="_blank" rel="noreferrer">
              Assets folder
            </a>
            <a className="font-semibold text-[color:var(--admin-accent)]" href={marketingCampaignSeed.campaignsFolderUrl} target="_blank" rel="noreferrer">
              Campaigns folder
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
          <h3 className="text-lg font-semibold tracking-tight">Monthly generation protocol</h3>
          <ol className="mt-3 space-y-2 text-sm text-[color:var(--admin-muted)]">
            <li>1. Read and update the latest strategy memory Markdown.</li>
            <li>2. Read new GA4, Search Console and Metricool data when available.</li>
            <li>3. Generate drafts and save copy, assets, schedule and tracking URLs.</li>
            <li>4. Review drafts here, approve or request regeneration.</li>
            <li>5. Export a Metricool CSV only after approval.</li>
          </ol>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            expanded={expandedPostIds.has(post.id)}
            onToggleExpanded={toggleExpanded}
            onStatusChange={updateStatus}
          />
        ))}
      </section>
    </div>
  );
}
