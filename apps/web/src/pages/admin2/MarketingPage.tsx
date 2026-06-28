import { useEffect, useMemo, useState } from 'react';
import {
  marketingCampaignSeeds,
  type MarketingAsset,
  type MarketingCampaignSeed,
  type MarketingPostSeed,
  type MarketingPostStatus,
} from '../../content/marketingAdminSeed';
import { downloadMetricoolCalendarCsv } from '../../lib/marketingMetricoolCsv';
import {
  buildMarketingAssetKey,
  fetchMarketingR2Status,
  uploadMarketingAssetsToR2,
  type MarketingR2Status,
} from '../../lib/marketingR2Assets';

const STATUS_LABELS: Record<MarketingPostStatus, string> = {
  draft: 'Draft',
  needs_review: 'Needs review',
  approved: 'Approved',
};

const STORAGE_PREFIX = 'innerbloom:admin-marketing:posts:';

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
  editing,
  onToggle,
  onEditToggle,
  onPostChange,
  onStatusChange,
}: {
  post: MarketingPostSeed;
  expanded: boolean;
  editing: boolean;
  onToggle: (postId: string) => void;
  onEditToggle: (postId: string) => void;
  onPostChange: (postId: string, updater: (post: MarketingPostSeed) => MarketingPostSeed) => void;
  onStatusChange: (postId: string, status: MarketingPostStatus) => void;
}) {
  const updateField = <Key extends keyof MarketingPostSeed>(key: Key, value: MarketingPostSeed[Key]) => {
    onPostChange(post.id, (currentPost) => ({ ...currentPost, [key]: value }));
  };

  const updateAsset = (assetIndex: number, updater: (asset: MarketingAsset) => MarketingAsset) => {
    onPostChange(post.id, (currentPost) => ({
      ...currentPost,
      assets: currentPost.assets.map((asset, index) => (index === assetIndex ? updater(asset) : asset)),
    }));
  };

  const removeAsset = (assetIndex: number) => {
    onPostChange(post.id, (currentPost) => ({
      ...currentPost,
      assets: currentPost.assets.filter((_, index) => index !== assetIndex),
    }));
  };

  const moveAsset = (assetIndex: number, direction: -1 | 1) => {
    onPostChange(post.id, (currentPost) => {
      const nextIndex = assetIndex + direction;
      if (nextIndex < 0 || nextIndex >= currentPost.assets.length) {
        return currentPost;
      }

      const nextAssets = [...currentPost.assets];
      const [asset] = nextAssets.splice(assetIndex, 1);
      nextAssets.splice(nextIndex, 0, asset);
      return { ...currentPost, assets: nextAssets };
    });
  };

  const addAssets = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const assets = await Promise.all(Array.from(files).map(fileToMarketingAsset));
    onPostChange(post.id, (currentPost) => ({
      ...currentPost,
      assets: [...currentPost.assets, ...assets],
    }));
  };

  return (
    <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)]">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 p-4">
        <div className="grid gap-1 sm:grid-cols-[9rem_10rem_1fr] sm:items-center">
          <p className="text-sm font-semibold text-[color:var(--admin-text)]">
            {post.scheduledDate} {post.scheduledTime.slice(0, 5)}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">
            {post.platform} / {post.format}
          </p>
          <h3 className="text-sm font-semibold tracking-tight text-[color:var(--admin-text)]">
            {post.assets[0]?.title ?? post.id}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(post.status)}`}>
            {STATUS_LABELS[post.status]}
          </span>
          <button type="button" className="admin2-btn admin2-btn--primary" onClick={() => onEditToggle(post.id)}>
            {editing ? 'Close edit' : 'Edit'}
          </button>
          <button
            type="button"
            className="admin2-btn admin2-btn--ghost"
            aria-expanded={expanded}
            onClick={() => onToggle(post.id)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-[color:var(--admin-border)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Assets</p>
            {editing ? (
              <label className="admin2-btn admin2-btn--secondary cursor-pointer">
                Add image
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void addAssets(event.currentTarget.files);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {post.assets.map((asset, index) => (
              <figure
                key={`${asset.file}-${index}`}
                className="overflow-hidden rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)]"
              >
                <div className="aspect-square bg-[color:var(--admin-bg)]">
                  <img
                    src={asset.url}
                    alt={asset.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="space-y-2 p-3">
                  <input
                    value={asset.title}
                    disabled={!editing}
                    onChange={(event) => updateAsset(index, (currentAsset) => ({ ...currentAsset, title: event.target.value }))}
                    className="w-full rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] px-2 py-1 text-sm font-semibold text-[color:var(--admin-text)] disabled:border-transparent disabled:bg-transparent disabled:p-0"
                  />
                  <p className="truncate font-mono text-xs text-[color:var(--admin-muted)]">{asset.file}</p>
                  {editing ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin2-btn admin2-btn--ghost"
                        disabled={index === 0}
                        onClick={() => moveAsset(index, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="admin2-btn admin2-btn--ghost"
                        disabled={index === post.assets.length - 1}
                        onClick={() => moveAsset(index, 1)}
                      >
                        Down
                      </button>
                      <button type="button" className="admin2-btn admin2-btn--danger" onClick={() => removeAsset(index)}>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Caption</p>
              {editing ? (
                <textarea
                  value={post.caption}
                  rows={16}
                  onChange={(event) => updateField('caption', event.target.value)}
                  className="mt-2 min-h-72 w-full resize-y rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 font-mono text-xs leading-relaxed text-[color:var(--admin-text)]"
                />
              ) : (
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 text-xs leading-relaxed text-[color:var(--admin-text)]">
                  {post.caption}
                </pre>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Schedule</p>
                {editing ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={post.scheduledDate}
                      onChange={(event) => updateField('scheduledDate', event.target.value)}
                      className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-[color:var(--admin-text)]"
                    />
                    <input
                      type="time"
                      value={post.scheduledTime.slice(0, 5)}
                      onChange={(event) => updateField('scheduledTime', `${event.target.value}:00`)}
                      className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-[color:var(--admin-text)]"
                    />
                  </div>
                ) : (
                  <p className="mt-1 font-medium">{post.scheduledDate} / {post.scheduledTime}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Post type</p>
                {editing ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <select
                      value={post.platform}
                      onChange={(event) => updateField('platform', event.target.value as MarketingPostSeed['platform'])}
                      className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-[color:var(--admin-text)]"
                    >
                      <option value="instagram">Instagram</option>
                    </select>
                    <select
                      value={post.format}
                      onChange={(event) => updateField('format', event.target.value as MarketingPostSeed['format'])}
                      className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-[color:var(--admin-text)]"
                    >
                      <option value="carousel">Carousel</option>
                      <option value="static">Static</option>
                    </select>
                  </div>
                ) : (
                  <p className="mt-1 font-medium">{post.platform} / {post.format}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Hypothesis</p>
                {editing ? (
                  <textarea
                    value={post.hypothesis}
                    rows={3}
                    onChange={(event) => updateField('hypothesis', event.target.value)}
                    className="mt-2 w-full resize-y rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-[color:var(--admin-text)]"
                  />
                ) : (
                  <p className="mt-1 text-[color:var(--admin-muted)]">{post.hypothesis}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Metric</p>
                {editing ? (
                  <textarea
                    value={post.metric}
                    rows={3}
                    onChange={(event) => updateField('metric', event.target.value)}
                    className="mt-2 w-full resize-y rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-[color:var(--admin-text)]"
                  />
                ) : (
                  <p className="mt-1 text-[color:var(--admin-muted)]">{post.metric}</p>
                )}
              </div>
              {editing ? (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">
                    Tracking URL
                  </span>
                  <input
                    value={post.trackingUrl}
                    onChange={(event) => updateField('trackingUrl', event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-xs text-[color:var(--admin-text)]"
                  />
                </label>
              ) : (
                <a
                  href={post.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all text-xs font-semibold text-[color:var(--admin-accent)]"
                >
                  {post.trackingUrl}
                </a>
              )}
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
        </div>
      ) : null}
    </article>
  );
}

export function MarketingPage() {
  const [selectedCampaignCode, setSelectedCampaignCode] = useState(marketingCampaignSeeds[0].campaignCode);
  const selectedCampaign = useMemo(
    () => marketingCampaignSeeds.find((campaign) => campaign.campaignCode === selectedCampaignCode) ?? marketingCampaignSeeds[0],
    [selectedCampaignCode],
  );
  const [postCount, setPostCount] = useState(selectedCampaign.postCount);
  const [posts, setPosts] = useState(() => readStoredCampaignPosts(selectedCampaign));
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(() => new Set());
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [r2Status, setR2Status] = useState<MarketingR2Status | null>(null);
  const [r2StatusError, setR2StatusError] = useState<string | null>(null);
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const approvedPosts = useMemo(() => posts.filter((post) => post.status === 'approved'), [posts]);
  const needsReviewCount = posts.filter((post) => post.status === 'needs_review').length;
  const approvedAssetCount = approvedPosts.reduce((total, post) => total + post.assets.length, 0);
  const r2ReadyAssetCount = approvedPosts.reduce(
    (total, post) => total + post.assets.filter((asset) => r2Status?.publicBaseUrl && asset.url.startsWith(r2Status.publicBaseUrl)).length,
    0,
  );

  useEffect(() => {
    setPostCount(selectedCampaign.postCount);
    setPosts(readStoredCampaignPosts(selectedCampaign));
    setExpandedPostIds(new Set());
    setEditingPostId(null);
    setUploadMessage(null);
  }, [selectedCampaign]);

  useEffect(() => {
    let cancelled = false;

    fetchMarketingR2Status()
      .then((status) => {
        if (!cancelled) {
          setR2Status(status);
          setR2StatusError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setR2Status(null);
          setR2StatusError(error instanceof Error ? error.message : 'Unable to load R2 status.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateStatus(postId: string, status: MarketingPostStatus) {
    updatePost(postId, (post) => ({ ...post, status }));
  }

  function updatePost(postId: string, updater: (post: MarketingPostSeed) => MarketingPostSeed) {
    setPosts((currentPosts) => {
      const nextPosts = currentPosts.map((post) => (post.id === postId ? updater(post) : post));
      persistCampaignPosts(selectedCampaign.campaignCode, nextPosts);
      return nextPosts;
    });
  }

  function togglePost(postId: string) {
    setExpandedPostIds((current) => {
      const next = new Set(current);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }

  function togglePostEdit(postId: string) {
    setEditingPostId((currentPostId) => (currentPostId === postId ? null : postId));
    setExpandedPostIds((current) => new Set(current).add(postId));
  }

  function resetCampaignEdits() {
    const nextPosts = cloneCampaignPosts(selectedCampaign);
    setPosts(nextPosts);
    setEditingPostId(null);
    setExpandedPostIds(new Set());
    window.localStorage.removeItem(storageKeyForCampaign(selectedCampaign.campaignCode));
  }

  function downloadApprovedCsv() {
    downloadMetricoolCalendarCsv(approvedPosts);
  }

  async function uploadApprovedAssets() {
    if (approvedPosts.length === 0) {
      return;
    }

    setIsUploadingAssets(true);
    setUploadMessage(null);

    try {
      const uploadInputs = approvedPosts.flatMap((post) =>
        post.assets.map((asset) => ({
          asset,
          campaignCode: selectedCampaign.campaignCode,
          postId: post.id,
        })),
      );

      const result = await uploadMarketingAssetsToR2(uploadInputs);
      const uploadedByKey = new Map(result.assets.map((asset) => [asset.key, asset]));

      setPosts((currentPosts) => {
        const nextPosts = currentPosts.map((post) => ({
          ...post,
          assets: post.assets.map((asset) => {
            const key = buildMarketingAssetKey({
              campaignCode: selectedCampaign.campaignCode,
              postId: post.id,
              file: asset.file,
            });
            const uploaded = uploadedByKey.get(key);

            return uploaded ? { ...asset, url: uploaded.url } : asset;
          }),
        }));

        persistCampaignPosts(selectedCampaign.campaignCode, nextPosts);
        return nextPosts;
      });

      setUploadMessage(`Uploaded ${result.assets.length} approved asset${result.assets.length === 1 ? '' : 's'} to R2.`);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'R2 upload failed.');
    } finally {
      setIsUploadingAssets(false);
    }
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
          <button
            type="button"
            className="admin2-btn admin2-btn--ghost"
            onClick={resetCampaignEdits}
          >
            Reset edits
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-5">
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
          <label className="mt-3 block">
            <span className="sr-only">Marketing campaign</span>
            <select
              value={selectedCampaign.campaignCode}
              onChange={(event) => setSelectedCampaignCode(event.target.value)}
              className="w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-sm font-semibold text-[color:var(--admin-text)]"
            >
              {marketingCampaignSeeds.map((campaign) => (
                <option key={campaign.campaignCode} value={campaign.campaignCode}>
                  {campaign.campaignCode}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-[color:var(--admin-muted)]">{selectedCampaign.language}</p>
        </div>
        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">Metricool assets</p>
          <p className="mt-3 text-3xl font-semibold">{r2ReadyAssetCount}/{approvedAssetCount}</p>
          <p className="mt-1 text-xs text-[color:var(--admin-muted)]">Approved assets on R2</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
          <h3 className="text-lg font-semibold tracking-tight">Data & storage</h3>
          <p className="mt-2 text-sm text-[color:var(--admin-muted)]">
            This is prepared for GA4, Search Console and manual Metricool exports. Live integrations are intentionally not wired yet.
          </p>
          <div className="mt-4 grid gap-3 text-sm">
            <a className="font-semibold text-[color:var(--admin-accent)]" href={selectedCampaign.driveRootUrl} target="_blank" rel="noreferrer">
              Google Drive marketing root
            </a>
            <a className="font-semibold text-[color:var(--admin-accent)]" href={selectedCampaign.strategyMemoryUrl} target="_blank" rel="noreferrer">
              Strategy memory file
            </a>
            <a className="font-semibold text-[color:var(--admin-accent)]" href={selectedCampaign.assetsFolderUrl} target="_blank" rel="noreferrer">
              Assets folder
            </a>
            <a className="font-semibold text-[color:var(--admin-accent)]" href={selectedCampaign.campaignsFolderUrl} target="_blank" rel="noreferrer">
              Campaigns folder
            </a>
          </div>
          <div className="mt-5 rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Cloudflare R2</p>
                <p className="mt-1 text-xs text-[color:var(--admin-muted)]">
                  {r2StatusError
                    ? r2StatusError
                    : r2Status?.configured
                      ? `${r2Status.bucket} -> ${r2Status.publicBaseUrl}`
                      : 'Checking R2 configuration...'}
                </p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                r2Status?.configured
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200'
              }`}>
                {r2Status?.configured ? 'Ready' : 'Pending'}
              </span>
            </div>
            {r2Status && !r2Status.configured ? (
              <p className="mt-2 text-xs text-[color:var(--admin-muted)]">
                Missing: {r2Status.missing.join(', ')}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="admin2-btn admin2-btn--secondary"
                onClick={uploadApprovedAssets}
                disabled={!r2Status?.configured || approvedPosts.length === 0 || isUploadingAssets}
              >
                {isUploadingAssets ? 'Uploading assets...' : 'Upload approved assets to R2'}
              </button>
              {uploadMessage ? (
                <p className="text-xs text-[color:var(--admin-muted)]">{uploadMessage}</p>
              ) : null}
            </div>
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
            editing={editingPostId === post.id}
            onToggle={togglePost}
            onEditToggle={togglePostEdit}
            onPostChange={updatePost}
            onStatusChange={updateStatus}
          />
        ))}
      </section>
    </div>
  );
}

function cloneCampaignPosts(campaign: MarketingCampaignSeed) {
  return campaign.posts.map((post) => ({
    ...post,
    assets: post.assets.map((asset) => ({ ...asset })),
  }));
}

function storageKeyForCampaign(campaignCode: string) {
  return `${STORAGE_PREFIX}${campaignCode}`;
}

function readStoredCampaignPosts(campaign: MarketingCampaignSeed) {
  if (typeof window === 'undefined') {
    return cloneCampaignPosts(campaign);
  }

  const raw = window.localStorage.getItem(storageKeyForCampaign(campaign.campaignCode));
  if (!raw) {
    return cloneCampaignPosts(campaign);
  }

  try {
    const parsed = JSON.parse(raw) as { posts?: MarketingPostSeed[] };
    if (!Array.isArray(parsed.posts)) {
      return cloneCampaignPosts(campaign);
    }

    return parsed.posts.map((post) => ({
      ...post,
      assets: Array.isArray(post.assets) ? post.assets.map((asset) => ({ ...asset })) : [],
    }));
  } catch {
    return cloneCampaignPosts(campaign);
  }
}

function persistCampaignPosts(campaignCode: string, posts: MarketingPostSeed[]) {
  window.localStorage.setItem(
    storageKeyForCampaign(campaignCode),
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      posts,
    }),
  );
}

function fileToMarketingAsset(file: File) {
  return new Promise<MarketingAsset>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        file: file.name,
        title: file.name.replace(/\.[^.]+$/, ''),
        url: String(reader.result),
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
