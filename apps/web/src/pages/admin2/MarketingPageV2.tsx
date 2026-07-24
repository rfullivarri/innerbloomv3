import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Check, ChevronDown, ChevronUp, FileDown, ImagePlus, Pencil, Save, Trash2, X } from '../../lib/lucide-react';
import { fetchMarketingCampaigns, saveMarketingCampaignBulk, type MarketingAssetRecord, type MarketingCampaignRecord, type MarketingPostRecord } from '../../lib/marketingCampaigns';
import { downloadMetricoolCalendarCsv } from '../../lib/marketingMetricoolCsv';
import { fetchMarketingR2Status, uploadMarketingAssetsToR2, validateMarketingMedia, type MarketingR2Status } from '../../lib/marketingR2Assets';
import { fetchMarketingAnalyticsInsights, syncMarketingAnalytics, type MarketingAnalyticsInsights } from '../../lib/marketingAnalytics';
import type { MarketingAsset, MarketingPostSeed } from '../../content/marketingAdminSeed';

type MarketingTab = 'posts' | 'insights';
type EditablePost = MarketingPostSeed;
const statusLabels = { draft: 'Draft', needs_review: 'Needs review', approved: 'Approved' } as const;
const MAX_CAROUSEL_ASSETS = 10;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export function MarketingPageV2() {
  const [tab, setTab] = useState<MarketingTab>('posts');
  const [campaigns, setCampaigns] = useState<MarketingCampaignRecord[]>([]);
  const [selectedCampaignCode, setSelectedCampaignCode] = useState('');
  const [posts, setPosts] = useState<EditablePost[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [r2Status, setR2Status] = useState<MarketingR2Status | null>(null);
  const [analytics, setAnalytics] = useState<MarketingAnalyticsInsights | null>(null);
  const [syncing, setSyncing] = useState(false);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.campaignCode === selectedCampaignCode) ?? campaigns[0] ?? null,
    [campaigns, selectedCampaignCode],
  );
  const approvedPosts = useMemo(() => posts.filter((post) => post.status === 'approved'), [posts]);
  const needsReviewCount = useMemo(() => posts.filter((post) => post.status === 'needs_review').length, [posts]);

  useEffect(() => { void loadCampaigns(); void loadSecondaryData(); }, []);
  useEffect(() => {
    if (!selectedCampaign) return;
    setPosts(selectedCampaign.posts.map(mapPost));
    setExpandedIds(new Set());
    setEditingId(null);
    setDirtyIds(new Set());
  }, [selectedCampaignCode]);

  async function loadCampaigns() {
    setLoading(true);
    try {
      const result = await fetchMarketingCampaigns();
      setCampaigns(result.campaigns);
      setSelectedCampaignCode((current) => current || result.campaigns[0]?.campaignCode || '');
      if (result.campaigns[0]) setPosts(result.campaigns[0].posts.map(mapPost));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load marketing campaigns.');
    } finally {
      setLoading(false);
    }
  }

  async function loadSecondaryData() {
    const [r2Result, analyticsResult] = await Promise.allSettled([fetchMarketingR2Status(), fetchMarketingAnalyticsInsights()]);
    if (r2Result.status === 'fulfilled') setR2Status(r2Result.value);
    if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value);
  }

  function markDirty(postId: string) {
    setDirtyIds((current) => new Set(current).add(postId));
  }

  function updatePost(postId: string, updater: (post: EditablePost) => EditablePost) {
    setPosts((current) => current.map((post) => post.id === postId ? updater(post) : post));
    markDirty(postId);
    setMessage(null);
    setError(null);
  }

  function removeAsset(postId: string, assetIndex: number) {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    if (post.assets.length <= 1) {
      setError('A post must keep at least one image. Add the replacement first.');
      return;
    }
    updatePost(postId, (item) => ({ ...item, assets: item.assets.filter((_, index) => index !== assetIndex) }));
  }

  async function addAsset(postId: string, file: File) {
    const post = posts.find((item) => item.id === postId);
    if (!post || !selectedCampaign) return;
    if (!r2Status?.configured) return setError('R2 must be configured before adding an image.');
    if (!file.type.startsWith('image/')) return setError('Choose a PNG, JPEG or WebP image.');
    if (file.size > MAX_UPLOAD_BYTES) return setError('The image is larger than 12 MB.');
    if (post.assets.length >= MAX_CAROUSEL_ASSETS) return setError('Instagram carousels support a maximum of 10 images.');

    const objectUrl = URL.createObjectURL(file);
    const fileName = `${postId}-manual-${Date.now()}-${safeFileName(file.name)}`;
    setUploadingAssetId(postId);
    setError(null);
    try {
      const result = await uploadMarketingAssetsToR2([{
        asset: { file: fileName, title: file.name.replace(/\.[^.]+$/, ''), url: objectUrl, previewUrl: objectUrl },
        campaignCode: selectedCampaign.campaignCode,
        postId,
      }]);
      const uploaded = result.assets[0];
      if (!uploaded) throw new Error('R2 did not return the uploaded image.');
      updatePost(postId, (item) => ({
        ...item,
        assets: [...item.assets, { file: fileName, title: file.name.replace(/\.[^.]+$/, ''), url: uploaded.url, previewUrl: uploaded.url }],
      }));
      setMessage('Image uploaded to R2. Save campaign to persist the new carousel.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add image.');
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploadingAssetId(null);
    }
  }

  async function persistPendingChanges() {
    if (!selectedCampaign || dirtyIds.size === 0) return;
    const changedPosts = posts.filter((post) => dirtyIds.has(post.id));
    const result = await saveMarketingCampaignBulk(
      selectedCampaign.campaignCode,
      changedPosts.map((post) => ({ postCode: post.id, changes: toApiUpdate(post) })),
    );
    const savedByCode = new Map(result.posts.map((post) => [post.postCode, post]));
    setCampaigns((current) => current.map((campaign) => campaign.campaignCode !== selectedCampaign.campaignCode ? campaign : {
      ...campaign,
      posts: campaign.posts.map((post) => savedByCode.get(post.postCode) ?? post),
    }));
    setDirtyIds(new Set());
  }

  async function saveCampaign() {
    if (!dirtyIds.size) return setMessage('There are no pending changes.');
    setSavingAll(true);
    setError(null);
    try {
      const count = dirtyIds.size;
      await persistPendingChanges();
      setMessage(`Saved ${count} changed post${count === 1 ? '' : 's'} in one transaction.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save campaign changes.');
    } finally {
      setSavingAll(false);
    }
  }

  async function exportCsv() {
    if (!approvedPosts.length) return setError('Approve at least one post before exporting.');
    setExportingCsv(true);
    setError(null);
    setMessage(null);
    try {
      await persistPendingChanges();
      const urls = approvedPosts.flatMap((post) => post.assets.map((asset) => asset.url)).filter(Boolean);
      const validation = await validateMarketingMedia(urls);
      const failures = validation.assets.filter((asset) => !asset.ok);
      if (failures.length) {
        throw new Error(`${failures.length} image${failures.length === 1 ? '' : 's'} failed public validation. Fix them before exporting.`);
      }
      downloadMetricoolCalendarCsv(approvedPosts);
      setMessage(`Saved campaign, validated ${urls.length} images and generated the Metricool CSV.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CSV export failed.');
    } finally {
      setExportingCsv(false);
    }
  }

  function toggleExpanded(postId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  async function syncAnalytics() {
    setSyncing(true);
    try { await syncMarketingAnalytics(); setAnalytics(await fetchMarketingAnalyticsInsights()); }
    finally { setSyncing(false); }
  }

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 pb-16">
    <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Marketing operations</p><h2 className="mt-1 text-2xl font-semibold">Campaign review</h2></div>
        <div className="flex items-center gap-2">
          <button className="admin2-btn admin2-btn--ghost" onClick={() => void loadCampaigns()} disabled={loading || dirtyIds.size > 0}>{loading ? <Spinner size="sm"/> : 'Refresh'}</button>
          <select value={selectedCampaignCode} onChange={(event) => setSelectedCampaignCode(event.target.value)} disabled={dirtyIds.size > 0} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-sm">{campaigns.map((campaign) => <option key={campaign.campaignCode} value={campaign.campaignCode}>{campaign.campaignCode}</option>)}</select>
        </div>
      </div>
      <div className="mt-5 flex gap-2 border-b border-[color:var(--admin-border)]"><TabButton active={tab === 'posts'} onClick={() => setTab('posts')}>Posts & approval</TabButton><TabButton active={tab === 'insights'} onClick={() => setTab('insights')}>Insights & infrastructure</TabButton></div>
      {error ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {message ? <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
    </header>

    {loading ? <LoadingPanel/> : tab === 'posts' ? <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Posts" value={posts.length}/><Stat label="Approved" value={approvedPosts.length}/><Stat label="Needs review" value={needsReviewCount}/><Stat label="Unsaved changes" value={dirtyIds.size}/>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
          <button className="admin2-btn admin2-btn--secondary inline-flex items-center gap-2" disabled={!dirtyIds.size || savingAll || exportingCsv} onClick={() => void saveCampaign()}>{savingAll ? <Spinner size="sm"/> : <Save size={16}/>}Save campaign</button>
          <button className="admin2-btn admin2-btn--primary inline-flex items-center gap-2" disabled={!approvedPosts.length || savingAll || exportingCsv} onClick={() => void exportCsv()}>{exportingCsv ? <Spinner size="sm"/> : <FileDown size={16}/>} {exportingCsv ? 'Checking media' : 'Export CSV'}</button>
        </div>
      </section>
      <section className="flex flex-col gap-4">{posts.map((post) => <ReviewCard
        key={post.id}
        post={post}
        expanded={expandedIds.has(post.id)}
        editing={editingId === post.id}
        dirty={dirtyIds.has(post.id)}
        uploadingAsset={uploadingAssetId === post.id}
        onToggle={() => toggleExpanded(post.id)}
        onEdit={() => { setEditingId(post.id); setExpandedIds((current) => new Set(current).add(post.id)); }}
        onDone={() => setEditingId(null)}
        onChange={(updater) => updatePost(post.id, updater)}
        onStatus={(status) => updatePost(post.id, (item) => ({ ...item, status }))}
        onRemoveAsset={(index) => removeAsset(post.id, index)}
        onAddAsset={(file) => void addAsset(post.id, file)}
      />)}</section>
    </> : <InsightsPanel analytics={analytics} r2Status={r2Status} syncing={syncing} onSync={() => void syncAnalytics()} campaign={selectedCampaign}/>} 
  </div>;
}

function ReviewCard({ post, expanded, editing, dirty, uploadingAsset, onToggle, onEdit, onDone, onChange, onStatus, onRemoveAsset, onAddAsset }: { post: EditablePost; expanded: boolean; editing: boolean; dirty: boolean; uploadingAsset: boolean; onToggle: () => void; onEdit: () => void; onDone: () => void; onChange: (updater: (post: EditablePost) => EditablePost) => void; onStatus: (status: EditablePost['status']) => void; onRemoveAsset: (index: number) => void; onAddAsset: (file: File) => void; }) {
  const field = <K extends keyof EditablePost>(key: K, value: EditablePost[K]) => onChange((current) => ({ ...current, [key]: value }));
  function handleFile(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; event.target.value = ''; if (file) onAddAsset(file); }
  return <article className={`overflow-hidden rounded-2xl border bg-[color:var(--admin-surface)] transition ${post.status === 'approved' ? 'border-emerald-500/45' : 'border-[color:var(--admin-border)]'}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[color:var(--admin-surface-muted)] p-4">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{post.scheduledDate} {post.scheduledTime.slice(0,5)} · {post.platform}/{post.format}</p><p className="truncate text-sm text-[color:var(--admin-muted)]">{post.assets[0]?.title ?? post.id}</p></div>
      <div className="flex items-center gap-2">{dirty ? <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-1 text-xs text-blue-200">Unsaved</span> : null}<span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(post.status)}`}>{statusLabels[post.status]}</span>{editing ? <button className="admin2-btn admin2-btn--primary" onClick={onDone}><Check size={16}/>Done</button> : <button className="admin2-btn admin2-btn--ghost" onClick={onEdit}><Pencil size={16}/></button>}<button className="admin2-btn admin2-btn--ghost" onClick={onToggle}>{expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button></div>
    </div>
    {expanded ? <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Carousel assets</p><p className="text-xs text-[color:var(--admin-muted)]">{post.assets.length}/{MAX_CAROUSEL_ASSETS} images</p></div>{editing ? <label className={`admin2-btn admin2-btn--secondary inline-flex cursor-pointer items-center gap-2 ${uploadingAsset ? 'pointer-events-none opacity-60' : ''}`}>{uploadingAsset ? <Spinner size="sm"/> : <ImagePlus size={16}/>} {uploadingAsset ? 'Uploading' : 'Add image'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleFile} disabled={uploadingAsset || post.assets.length >= MAX_CAROUSEL_ASSETS}/></label> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{post.assets.map((asset, index) => <figure key={`${asset.file}-${index}`} className="group relative overflow-hidden rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)]"><img src={asset.previewUrl || asset.url} alt={asset.title} className="aspect-square w-full object-cover"/>{editing ? <button type="button" aria-label={`Remove ${asset.file}`} onClick={() => onRemoveAsset(index)} className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 size={17}/></button> : null}<figcaption className="flex items-center justify-between gap-2 p-3 text-xs text-[color:var(--admin-muted)]"><span className="truncate">{asset.file}</span><span>{index + 1}/{post.assets.length}</span></figcaption></figure>)}</div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><label><span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Caption</span><textarea disabled={!editing} value={post.caption} onChange={(event) => field('caption', event.target.value)} rows={12} className="mt-2 w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 text-sm disabled:opacity-80"/></label><div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><input disabled={!editing} type="date" value={post.scheduledDate} onChange={(event) => field('scheduledDate', event.target.value)} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2"/><input disabled={!editing} type="time" value={post.scheduledTime.slice(0,5)} onChange={(event) => field('scheduledTime', `${event.target.value}:00`)} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2"/></div><input disabled={!editing} value={post.trackingUrl} onChange={(event) => field('trackingUrl', event.target.value)} className="w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-xs"/><textarea disabled={!editing} value={post.hypothesis} onChange={(event) => field('hypothesis', event.target.value)} rows={3} className="w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 text-sm"/></div></div>
      <div className="flex flex-wrap gap-2 border-t border-[color:var(--admin-border)] pt-4"><button className="admin2-btn admin2-btn--secondary" onClick={() => onStatus('approved')}>Approve</button><button className="admin2-btn admin2-btn--ghost" onClick={() => onStatus('needs_review')}>Needs review</button><button className="admin2-btn admin2-btn--ghost" onClick={() => onStatus('draft')}>Draft</button></div>
    </div> : null}
  </article>;
}

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) { return <span aria-hidden="true" className={`${size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-[3px]'} inline-block animate-spin rounded-full border-current border-r-transparent`}/>; }
function LoadingPanel() { return <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)]"><div className="flex flex-col items-center gap-3 text-center"><Spinner/><div><p className="font-semibold">Loading campaign posts</p><p className="mt-1 text-sm text-[color:var(--admin-muted)]">Preparing images and review data…</p></div></div></div>; }
function InsightsPanel({ analytics, r2Status, syncing, onSync, campaign }: { analytics: MarketingAnalyticsInsights | null; r2Status: MarketingR2Status | null; syncing: boolean; onSync: () => void; campaign: MarketingCampaignRecord | null; }) { const totals = analytics?.summary?.totals; return <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Marketing insights</h3><button className="admin2-btn admin2-btn--secondary inline-flex items-center gap-2" disabled={syncing || !analytics?.configured} onClick={onSync}>{syncing ? <Spinner size="sm"/> : null}{syncing ? 'Syncing' : 'Sync data'}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Stat label="Active users" value={totals?.activeUsers ?? 0}/><Stat label="Sessions" value={totals?.sessions ?? 0}/><Stat label="Page views" value={totals?.pageViews ?? 0}/><Stat label="Search clicks" value={totals?.searchClicks ?? 0}/><Stat label="Search impressions" value={totals?.searchImpressions ?? 0}/><Stat label="Registered users" value={analytics?.registeredUsers?.total ?? 0}/></div></section><section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5"><h3 className="font-semibold">Infrastructure</h3><p className="mt-3 text-sm text-[color:var(--admin-muted)]">R2: {r2Status?.configured ? `Ready · ${r2Status.bucket}` : 'Pending'}</p><p className="mt-2 text-sm text-[color:var(--admin-muted)]">Campaign: {campaign?.campaignCode}</p></section></div>; }
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button type="button" onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? 'border-[color:var(--admin-accent)] text-[color:var(--admin-text)]' : 'border-transparent text-[color:var(--admin-muted)]'}`}>{children}</button>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>; }
function statusClass(status: EditablePost['status']) { return status === 'approved' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : status === 'needs_review' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-[color:var(--admin-border)] text-[color:var(--admin-muted)]'; }
function mapAsset(asset: MarketingAssetRecord): MarketingAsset { return { file: asset.file, title: asset.title, url: asset.url ?? '', previewUrl: asset.previewUrl ?? asset.url ?? '', sourceUrl: asset.sourceUrl }; }
function mapPost(post: MarketingPostRecord): EditablePost { const [date = '', rawTime = '19:30:00'] = (post.scheduledAt ?? '').split('T'); return { id: post.postCode, number: post.postCode.replace(/^post_?/, '').padStart(3, '0'), platform: 'instagram', format: post.format === 'carousel' ? 'carousel' : 'static', status: post.status === 'approved' || post.status === 'draft' ? post.status : 'needs_review', scheduledDate: date, scheduledTime: rawTime.slice(0,8) || '19:30:00', hypothesis: post.hypothesis, metric: post.targetMetric, caption: post.caption, trackingUrl: post.trackingUrl, assets: post.assetUrls.map(mapAsset) }; }
function toApiUpdate(post: EditablePost) { return { status: post.status, caption: post.caption, hypothesis: post.hypothesis, targetMetric: post.metric, trackingUrl: post.trackingUrl, scheduledAt: post.scheduledDate ? `${post.scheduledDate}T${post.scheduledTime.length === 5 ? `${post.scheduledTime}:00` : post.scheduledTime}+02:00` : null, assetUrls: post.assets.map((asset) => ({ file: asset.file, title: asset.title, ...(persistableUrl(asset.url) ? { url: persistableUrl(asset.url) } : {}), ...(persistableUrl(asset.previewUrl) ? { previewUrl: persistableUrl(asset.previewUrl) } : {}), ...(persistableUrl(asset.sourceUrl) ? { sourceUrl: persistableUrl(asset.sourceUrl) } : {}), selected: true })) }; }
function persistableUrl(value: string | undefined) { const normalized = String(value ?? '').trim(); return /^https?:\/\//i.test(normalized) && normalized.length <= 2000 ? normalized : undefined; }
function safeFileName(value: string) { return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image.png'; }
