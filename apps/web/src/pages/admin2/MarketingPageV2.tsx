import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Check, ChevronDown, ChevronUp, FileDown, ImagePlus, Pencil, RefreshCcwDot, RotateCcw, Save, Trash2, UploadCloud, X } from '../../lib/lucide-react';
import { fetchMarketingCampaigns, updateMarketingCampaignPost, type MarketingAssetRecord, type MarketingCampaignRecord, type MarketingPostRecord } from '../../lib/marketingCampaigns';
import { downloadMetricoolCalendarCsv } from '../../lib/marketingMetricoolCsv';
import { buildMarketingAssetKey, fetchMarketingR2Status, isMarketingAssetStoredOnR2, uploadMarketingAssetsToR2, type MarketingR2Status } from '../../lib/marketingR2Assets';
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
  const [drafts, setDrafts] = useState<Record<string, EditablePost>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [r2Status, setR2Status] = useState<MarketingR2Status | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analytics, setAnalytics] = useState<MarketingAnalyticsInsights | null>(null);
  const [syncing, setSyncing] = useState(false);

  const selectedCampaign = useMemo(() => campaigns.find((campaign) => campaign.campaignCode === selectedCampaignCode) ?? campaigns[0] ?? null, [campaigns, selectedCampaignCode]);
  const approvedPosts = useMemo(() => posts.filter((post) => post.status === 'approved'), [posts]);
  const needsReviewCount = useMemo(() => posts.filter((post) => post.status === 'needs_review').length, [posts]);
  const approvedAssetCount = approvedPosts.reduce((sum, post) => sum + post.assets.length, 0);
  const r2ReadyCount = approvedPosts.reduce((sum, post) => sum + post.assets.filter((asset) => isMarketingAssetStoredOnR2(asset.url, r2Status?.publicBaseUrl)).length, 0);
  const csvReady = approvedPosts.length > 0 && approvedAssetCount > 0 && approvedAssetCount === r2ReadyCount;

  useEffect(() => { void loadCampaigns(); void loadSecondaryData(); }, []);
  useEffect(() => {
    if (!selectedCampaign) return;
    setPosts(selectedCampaign.posts.map(mapPost));
    setExpandedIds(new Set());
    setEditingId(null);
    setDrafts({});
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

  function beginEdit(post: EditablePost) {
    setDrafts((current) => ({ ...current, [post.id]: clonePost(post) }));
    setEditingId(post.id);
    setExpandedIds((current) => new Set(current).add(post.id));
    setMessage(null);
    setError(null);
  }

  function cancelEdit(postId: string) {
    setDrafts((current) => { const next = { ...current }; delete next[postId]; return next; });
    setEditingId(null);
    setMessage(null);
    setError(null);
  }

  function updateDraft(postId: string, updater: (post: EditablePost) => EditablePost) {
    setDrafts((current) => {
      const source = current[postId] ?? posts.find((post) => post.id === postId);
      return source ? { ...current, [postId]: updater(source) } : current;
    });
  }

  function removeAsset(postId: string, assetIndex: number) {
    const source = drafts[postId] ?? posts.find((post) => post.id === postId);
    if (!source) return;
    if (source.assets.length <= 1) {
      setError('A post must keep at least one image. Add the replacement first, then remove the old image.');
      return;
    }
    updateDraft(postId, (post) => ({ ...post, assets: post.assets.filter((_, index) => index !== assetIndex) }));
    setMessage('Image removed from the draft. Press Save to confirm the carousel change.');
    setError(null);
  }

  async function addAsset(postId: string, file: File) {
    const source = drafts[postId] ?? posts.find((post) => post.id === postId);
    if (!source || !selectedCampaign) return;
    if (!r2Status?.configured) {
      setError('R2 must be configured before adding a new image.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('The image is larger than 12 MB.');
      return;
    }
    if (source.assets.length >= MAX_CAROUSEL_ASSETS) {
      setError('Instagram carousels support a maximum of 10 images.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const fileName = `${postId}-manual-${Date.now()}-${safeFileName(file.name)}`;
    const temporaryAsset: MarketingAsset = {
      file: fileName,
      title: file.name.replace(/\.[^.]+$/, ''),
      url: objectUrl,
      previewUrl: objectUrl,
    };

    setUploadingAssetId(postId);
    setError(null);
    setMessage(null);
    try {
      const result = await uploadMarketingAssetsToR2([{ asset: temporaryAsset, campaignCode: selectedCampaign.campaignCode, postId }]);
      const uploaded = result.assets[0];
      if (!uploaded) throw new Error('R2 did not return the uploaded image.');
      const storedAsset: MarketingAsset = {
        file: fileName,
        title: temporaryAsset.title,
        url: uploaded.url,
        previewUrl: uploaded.url,
      };
      updateDraft(postId, (post) => ({ ...post, assets: [...post.assets, storedAsset] }));
      setMessage(`${file.name} was uploaded to R2 and added to the draft. Press Save to confirm.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add image.');
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploadingAssetId(null);
    }
  }

  async function savePost(postId: string) {
    const draft = drafts[postId];
    if (!draft || !selectedCampaign) return;
    setSavingId(postId);
    setMessage(null);
    setError(null);
    try {
      await updateMarketingCampaignPost(selectedCampaign.campaignCode, postId, toApiUpdate(draft));
      setPosts((current) => current.map((post) => post.id === postId ? clonePost(draft) : post));
      setCampaigns((current) => current.map((campaign) => campaign.campaignCode === selectedCampaign.campaignCode ? { ...campaign, posts: campaign.posts.map((post) => post.postCode === postId ? mergeApiPost(post, draft) : post) } : campaign));
      setDrafts((current) => ({ ...current, [postId]: clonePost(draft) }));
      setMessage(`Saved ${postId}. Editing remains open.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save post.');
    } finally {
      setSavingId(null);
    }
  }

  async function changeStatus(postId: string, status: EditablePost['status']) {
    const currentPost = drafts[postId] ?? posts.find((post) => post.id === postId);
    if (!currentPost || !selectedCampaign) return;
    const previousStatus = currentPost.status;
    const nextPost = { ...currentPost, status };
    if (drafts[postId]) setDrafts((current) => ({ ...current, [postId]: nextPost }));
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, status } : post));
    setStatusBusyId(postId);
    setError(null);
    setMessage(null);
    try {
      await updateMarketingCampaignPost(selectedCampaign.campaignCode, postId, { status });
      setMessage(`${postId} marked ${statusLabels[status]}.`);
    } catch (cause) {
      if (drafts[postId]) setDrafts((current) => ({ ...current, [postId]: { ...nextPost, status: previousStatus } }));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, status: previousStatus } : post));
      setError(cause instanceof Error ? cause.message : 'Unable to update status.');
    } finally {
      setStatusBusyId(null);
    }
  }

  function toggleExpanded(postId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  async function uploadApproved() {
    if (!selectedCampaign || !r2Status?.configured) return;
    const inputs = approvedPosts.flatMap((post) => post.assets.filter((asset) => !isMarketingAssetStoredOnR2(asset.url, r2Status.publicBaseUrl)).map((asset) => ({ asset, campaignCode: selectedCampaign.campaignCode, postId: post.id })));
    if (!inputs.length) { setMessage('All approved assets are already on R2.'); return; }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMarketingAssetsToR2(inputs);
      const uploaded = new Map(result.assets.map((asset) => [asset.key, asset.url]));
      const nextPosts = posts.map((post) => ({ ...post, assets: post.assets.map((asset) => {
        const key = buildMarketingAssetKey({ campaignCode: selectedCampaign.campaignCode, postId: post.id, file: asset.file });
        return uploaded.has(key) ? { ...asset, url: uploaded.get(key)!, previewUrl: uploaded.get(key)! } : asset;
      }) }));
      setPosts(nextPosts);
      for (const post of nextPosts.filter((candidate) => candidate.status === 'approved')) await updateMarketingCampaignPost(selectedCampaign.campaignCode, post.id, toApiUpdate(post));
      setMessage(`Uploaded ${result.assets.length} assets to R2.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'R2 upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function syncAnalytics() {
    setSyncing(true);
    try {
      await syncMarketingAnalytics();
      setAnalytics(await fetchMarketingAnalyticsInsights());
    } finally {
      setSyncing(false);
    }
  }

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 pb-16">
    <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Marketing operations</p><h2 className="mt-1 text-2xl font-semibold">Campaign review</h2></div>
        <div className="flex items-center gap-2">
          <button className="admin2-btn admin2-btn--ghost inline-flex items-center gap-2" onClick={() => void loadCampaigns()} disabled={loading}><RefreshCcwDot className={loading ? 'animate-spin' : ''} size={16}/>{loading ? 'Loading' : 'Refresh'}</button>
          <select value={selectedCampaignCode} onChange={(event) => setSelectedCampaignCode(event.target.value)} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-sm">{campaigns.map((campaign) => <option key={campaign.campaignCode} value={campaign.campaignCode}>{campaign.campaignCode}</option>)}</select>
        </div>
      </div>
      <div className="mt-5 flex gap-2 border-b border-[color:var(--admin-border)]"><TabButton active={tab === 'posts'} onClick={() => setTab('posts')}>Posts & approval</TabButton><TabButton active={tab === 'insights'} onClick={() => setTab('insights')}>Insights & infrastructure</TabButton></div>
      {error ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      {message ? <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
    </header>

    {loading ? <LoadingPanel/> : tab === 'posts' ? <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Posts" value={posts.length}/><Stat label="Approved" value={approvedPosts.length}/><Stat label="Needs review" value={needsReviewCount}/><Stat label="R2 assets" value={`${r2ReadyCount}/${approvedAssetCount}`}/>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4"><button className="admin2-btn admin2-btn--secondary inline-flex items-center gap-2" disabled={!r2Status?.configured || !approvedPosts.length || uploading} onClick={uploadApproved}>{uploading ? <RotateCcw className="animate-spin" size={16}/> : <UploadCloud size={16}/>} {uploading ? 'Uploading' : 'Upload R2'}</button><button className="admin2-btn admin2-btn--primary inline-flex items-center gap-2" disabled={!csvReady} onClick={() => downloadMetricoolCalendarCsv(approvedPosts)}><FileDown size={16}/>CSV</button></div>
      </section>
      <section className="flex flex-col gap-4">{posts.map((post) => {
        const editing = editingId === post.id;
        const displayPost = editing ? drafts[post.id] ?? post : post;
        return <ReviewCard key={post.id} post={displayPost} expanded={expandedIds.has(post.id)} editing={editing} saving={savingId === post.id} statusBusy={statusBusyId === post.id} uploadingAsset={uploadingAssetId === post.id} onToggle={() => toggleExpanded(post.id)} onEdit={() => beginEdit(post)} onCancel={() => cancelEdit(post.id)} onSave={() => void savePost(post.id)} onChange={(updater) => updateDraft(post.id, updater)} onStatus={(status) => void changeStatus(post.id, status)} onRemoveAsset={(index) => removeAsset(post.id, index)} onAddAsset={(file) => void addAsset(post.id, file)}/>;
      })}</section>
    </> : <InsightsPanel analytics={analytics} r2Status={r2Status} syncing={syncing} onSync={() => void syncAnalytics()} campaign={selectedCampaign}/>} 
  </div>;
}

function ReviewCard({ post, expanded, editing, saving, statusBusy, uploadingAsset, onToggle, onEdit, onCancel, onSave, onChange, onStatus, onRemoveAsset, onAddAsset }: { post: EditablePost; expanded: boolean; editing: boolean; saving: boolean; statusBusy: boolean; uploadingAsset: boolean; onToggle: () => void; onEdit: () => void; onCancel: () => void; onSave: () => void; onChange: (updater: (post: EditablePost) => EditablePost) => void; onStatus: (status: EditablePost['status']) => void; onRemoveAsset: (index: number) => void; onAddAsset: (file: File) => void; }) {
  const field = <K extends keyof EditablePost>(key: K, value: EditablePost[K]) => onChange((current) => ({ ...current, [key]: value }));
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onAddAsset(file);
  }

  return <article className={`overflow-hidden rounded-2xl border bg-[color:var(--admin-surface)] transition ${post.status === 'approved' ? 'border-emerald-500/45 shadow-[0_0_0_1px_rgba(16,185,129,.08)]' : 'border-[color:var(--admin-border)]'}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-[color:var(--admin-surface-muted)] p-4">
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{post.scheduledDate} {post.scheduledTime.slice(0,5)} · {post.platform}/{post.format}</p><p className="truncate text-sm text-[color:var(--admin-muted)]">{post.assets[0]?.title ?? post.id}</p></div>
      <div className="flex items-center gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${statusBusy ? 'animate-pulse' : ''} ${statusClass(post.status)}`}>{statusBusy ? 'Updating…' : statusLabels[post.status]}</span>{editing ? <><button className="admin2-btn admin2-btn--primary inline-flex items-center gap-2" onClick={onSave} disabled={saving || uploadingAsset}>{saving ? <RotateCcw className="animate-spin" size={16}/> : <Save size={16}/>} {saving ? 'Saving' : 'Save'}</button><button className="admin2-btn admin2-btn--ghost" onClick={onCancel} disabled={saving || uploadingAsset}><X size={16}/></button></> : <button className="admin2-btn admin2-btn--ghost" onClick={onEdit}><Pencil size={16}/></button>}<button className="admin2-btn admin2-btn--ghost" onClick={onToggle}>{expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button></div>
    </div>
    {expanded ? <div className="space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Carousel assets</p><p className="text-xs text-[color:var(--admin-muted)]">{post.assets.length}/{MAX_CAROUSEL_ASSETS} images · changes are confirmed with Save</p></div>{editing ? <label className={`admin2-btn admin2-btn--secondary inline-flex cursor-pointer items-center gap-2 ${uploadingAsset ? 'pointer-events-none opacity-60' : ''}`}>{uploadingAsset ? <RotateCcw className="animate-spin" size={16}/> : <ImagePlus size={16}/>} {uploadingAsset ? 'Uploading image' : 'Add image'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={handleFile} disabled={uploadingAsset || post.assets.length >= MAX_CAROUSEL_ASSETS}/></label> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{post.assets.map((asset, index) => <figure key={`${asset.file}-${index}`} className="group relative overflow-hidden rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)]"><img src={asset.previewUrl || asset.url} alt={asset.title} className="aspect-square w-full object-cover"/>{editing ? <button type="button" title="Remove image" aria-label={`Remove ${asset.file}`} onClick={() => onRemoveAsset(index)} className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-300/30 bg-black/70 text-red-200 opacity-90 backdrop-blur transition hover:scale-105 hover:bg-red-500 hover:text-white"><Trash2 size={17}/></button> : null}<figcaption className="flex items-center justify-between gap-2 p-3 text-xs text-[color:var(--admin-muted)]"><span className="truncate">{asset.file}</span><span>{index + 1}/{post.assets.length}</span></figcaption></figure>)}</div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><label><span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Caption</span><textarea disabled={!editing} value={post.caption} onChange={(event) => field('caption', event.target.value)} rows={12} className="mt-2 w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 text-sm disabled:opacity-80"/></label><div className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><input disabled={!editing} type="date" value={post.scheduledDate} onChange={(event) => field('scheduledDate', event.target.value)} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2"/><input disabled={!editing} type="time" value={post.scheduledTime.slice(0,5)} onChange={(event) => field('scheduledTime', `${event.target.value}:00`)} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2"/></div><label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Tracking URL</span><input disabled={!editing} value={post.trackingUrl} onChange={(event) => field('trackingUrl', event.target.value)} className="mt-2 w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-xs"/></label><label className="block"><span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Hypothesis</span><textarea disabled={!editing} value={post.hypothesis} onChange={(event) => field('hypothesis', event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-3 text-sm"/></label></div></div>
      <div className="flex flex-wrap gap-2 border-t border-[color:var(--admin-border)] pt-4"><button className="admin2-btn admin2-btn--secondary inline-flex items-center gap-2" disabled={statusBusy} onClick={() => onStatus('approved')}>{statusBusy ? <RotateCcw className="animate-spin" size={16}/> : <Check size={16}/>} {statusBusy ? 'Approving' : post.status === 'approved' ? 'Approved' : 'Approve'}</button><button className="admin2-btn admin2-btn--ghost" disabled={statusBusy} onClick={() => onStatus('needs_review')}>Needs review</button><button className="admin2-btn admin2-btn--ghost" disabled={statusBusy} onClick={() => onStatus('draft')}>Draft</button></div>
    </div> : null}
  </article>;
}

function LoadingPanel() {
  return <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)]"><div className="flex flex-col items-center gap-3 text-center"><RotateCcw className="animate-spin text-[color:var(--admin-accent)]" size={30}/><div><p className="font-semibold">Loading campaign posts</p><p className="mt-1 text-sm text-[color:var(--admin-muted)]">Preparing images, statuses and review data…</p></div></div></div>;
}

function InsightsPanel({ analytics, r2Status, syncing, onSync, campaign }: { analytics: MarketingAnalyticsInsights | null; r2Status: MarketingR2Status | null; syncing: boolean; onSync: () => void; campaign: MarketingCampaignRecord | null; }) {
  const totals = analytics?.summary?.totals;
  return <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Marketing insights</h3><button className="admin2-btn admin2-btn--secondary inline-flex items-center gap-2" disabled={syncing || !analytics?.configured} onClick={onSync}>{syncing ? <RotateCcw className="animate-spin" size={16}/> : <RefreshCcwDot size={16}/>} {syncing ? 'Syncing' : 'Sync data'}</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Stat label="Active users" value={totals?.activeUsers ?? 0}/><Stat label="Sessions" value={totals?.sessions ?? 0}/><Stat label="Page views" value={totals?.pageViews ?? 0}/><Stat label="Search clicks" value={totals?.searchClicks ?? 0}/><Stat label="Search impressions" value={totals?.searchImpressions ?? 0}/><Stat label="Registered users" value={analytics?.registeredUsers?.total ?? 0}/></div>{analytics?.summary?.highlights?.length ? <div className="mt-4 space-y-2">{analytics.summary.highlights.map((item) => <p key={item} className="rounded-xl bg-[color:var(--admin-surface-muted)] p-3 text-sm">{item}</p>)}</div> : null}</section><section className="space-y-4"><div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5"><h3 className="font-semibold">Infrastructure</h3><p className="mt-3 text-sm text-[color:var(--admin-muted)]">R2: {r2Status?.configured ? `Ready · ${r2Status.bucket}` : 'Pending'}</p><p className="mt-2 text-sm text-[color:var(--admin-muted)]">Analytics: {analytics?.configured ? 'Ready' : 'Pending'}</p></div><div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5"><h3 className="font-semibold">Campaign resources</h3><p className="mt-3 break-all text-sm text-[color:var(--admin-muted)]">{campaign?.campaignCode}</p></div></section></div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button type="button" onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? 'border-[color:var(--admin-accent)] text-[color:var(--admin-text)]' : 'border-transparent text-[color:var(--admin-muted)]'}`}>{children}</button>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>; }
function statusClass(status: EditablePost['status']) { return status === 'approved' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : status === 'needs_review' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-[color:var(--admin-border)] text-[color:var(--admin-muted)]'; }
function clonePost(post: EditablePost): EditablePost { return { ...post, assets: post.assets.map((asset) => ({ ...asset })) }; }
function mapAsset(asset: MarketingAssetRecord): MarketingAsset { return { file: asset.file, title: asset.title, url: asset.url ?? '', previewUrl: asset.previewUrl ?? asset.url ?? '', sourceUrl: asset.sourceUrl }; }
function mapPost(post: MarketingPostRecord): EditablePost { const [date = '', rawTime = '19:30:00'] = (post.scheduledAt ?? '').split('T'); const time = rawTime.slice(0,8) || '19:30:00'; return { id: post.postCode, number: post.postCode.replace(/^post_?/, '').padStart(3, '0'), platform: 'instagram', format: post.format === 'carousel' ? 'carousel' : 'static', status: post.status === 'approved' || post.status === 'draft' ? post.status : 'needs_review', scheduledDate: date, scheduledTime: time, hypothesis: post.hypothesis, metric: post.targetMetric, caption: post.caption, trackingUrl: post.trackingUrl, assets: post.assetUrls.map(mapAsset) }; }
function toApiUpdate(post: EditablePost) { return { status: post.status, caption: post.caption, hypothesis: post.hypothesis, targetMetric: post.metric, trackingUrl: post.trackingUrl, scheduledAt: post.scheduledDate ? `${post.scheduledDate}T${post.scheduledTime.length === 5 ? `${post.scheduledTime}:00` : post.scheduledTime}+02:00` : null, assetUrls: post.assets.map((asset) => { const url = persistableUrl(asset.url); const previewUrl = persistableUrl(asset.previewUrl); const sourceUrl = persistableUrl(asset.sourceUrl); return { file: asset.file, title: asset.title, ...(url ? { url } : {}), ...(previewUrl ? { previewUrl } : {}), ...(sourceUrl ? { sourceUrl } : {}), selected: true }; }) }; }
function mergeApiPost(post: MarketingPostRecord, draft: EditablePost): MarketingPostRecord { const update = toApiUpdate(draft); return { ...post, status: draft.status, caption: draft.caption, hypothesis: draft.hypothesis, targetMetric: draft.metric, trackingUrl: draft.trackingUrl, scheduledAt: update.scheduledAt, assetUrls: update.assetUrls }; }
function persistableUrl(value: string | undefined) { const normalized = String(value ?? '').trim(); return /^https?:\/\//i.test(normalized) && normalized.length <= 2000 ? normalized : undefined; }
function safeFileName(value: string) { return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'image.png'; }
