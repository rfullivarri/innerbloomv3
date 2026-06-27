import { useMemo, useState } from 'react';
import {
  parseStrategyMemoryMarkdown,
  type StrategyMemoryEntry,
} from '../../lib/marketingStrategyMemory';
import type { ReactNode } from 'react';

type MarketingTab = 'posts' | 'insights' | 'sources';
type PostStatus = 'draft' | 'review' | 'approved' | 'rejected';

type MarketingAsset = {
  file: string;
  title: string;
  type: string;
};

type MarketingPost = {
  id: string;
  date: string;
  platform: string;
  format: string;
  status: PostStatus;
  hook: string;
  caption: string;
  hypothesis: string;
  trackingUrl: string;
  assets: MarketingAsset[];
  selectedAssets: string[];
};

const ASSET_BASE = '/marketing/campaigns/2026-06-mvp/assets';

const STRATEGY_MEMORY_MARKDOWN = `# Innerbloom Marketing Strategy Memory

## Strategic Changelog

<!-- STRATEGY_MEMORY_ENTRIES:START -->

### 2026-06-29 | 2026-06 MVP baseline

- **Period analyzed:** 2026-06-01 -> 2026-06-28

- **Insights detected:** Instagram / social is the top acquisition source after hygiene filters; product dashboard pages are receiving more views than the landing page; Search Console has very low click volume and should not drive messaging decisions yet

- **Hypotheses:** Adaptive rhythm and real-week positioning can differentiate Innerbloom from rigid streak-based habit apps; product screenshots should make the promise more concrete

- **Decisions taken:** Keep the 2026-06 MVP campaign as a small validation loop; export only approved posts to Metricool; separate post approval work from analytics and source configuration

- **Changes vs previous strategy:** Move from one long operational board to a tabbed monthly workflow; use Cost of Inaction instead of Cost of Safe in UI copy

- **What worked:** Clear anti-perfect-days hook; explicit tracking URLs per post; reusable campaign assets

- **What did not work:** Ambiguous internal shorthand such as Cost of Safe; stacking GA4 and Search Console in one low-hierarchy column

- **Learnings:** Keep post operations, strategic interpretation, and data source health in separate views; every post should map to a measurable funnel event

- **Next experiments:** Test dashboard walkthrough carousel; compare product-mechanism hooks against general habit advice; add Metricool results after publishing

- **Recommendations for future content proposals:** Tie each hook to one user pain and one product mechanism; keep data source status visible before generating proposals; preserve strategy memory before monthly regeneration

<!-- STRATEGY_MEMORY_ENTRIES:END -->`;

const INITIAL_POSTS: MarketingPost[] = [
  {
    id: 'post_001',
    date: '2026-06-30 19:30',
    platform: 'Instagram',
    format: 'Carousel',
    status: 'approved',
    hook: 'Your habits should adapt to your real life.',
    caption:
      'Most habit apps assume every day is the same. Then a busy week hits, your streak breaks, and the whole plan starts feeling useless. Innerbloom is built around adaptive rhythm: lower the intensity when life gets heavy, keep visible progress, recalibrate instead of starting over, and build a Journey that can survive real weeks.',
    hypothesis:
      'People who have failed with streak-based apps will respond to adaptive rhythm and real weeks.',
    trackingUrl:
      'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001',
    assets: [
      { file: 'post-001-carousel-01.png', title: 'Your habits should adapt to your real life.', type: 'image' },
      { file: 'post-001-carousel-02.png', title: 'Most habit apps assume every day is the same.', type: 'split' },
      { file: 'post-001-carousel-03.png', title: 'Lower the intensity. Keep the direction.', type: 'image' },
      { file: 'post-001-carousel-04.png', title: 'Build a Journey that can survive real weeks.', type: 'brand' },
    ],
    selectedAssets: [
      'post-001-carousel-01.png',
      'post-001-carousel-02.png',
      'post-001-carousel-03.png',
      'post-001-carousel-04.png',
    ],
  },
  {
    id: 'post_002',
    date: '2026-07-02 22:30',
    platform: 'Instagram',
    format: 'Static',
    status: 'approved',
    hook: 'If your plan only works on perfect days, it is not a plan.',
    caption:
      'Most people do not fail habits because they are lazy. They fail because the system expects the same output from them every day, even when their energy, stress, sleep, and schedule change. Innerbloom is an adaptive habit app. It helps you keep direction without forcing the same rhythm all the time.',
    hypothesis:
      'A direct anti-perfect-days message will perform better for people tired of rigid productivity systems.',
    trackingUrl:
      'https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_002&ib_post=002',
    assets: [
      { file: 'post-002-static-pain-proposal.png', title: 'If your plan only works on perfect days, it is not a plan.', type: 'static' },
    ],
    selectedAssets: ['post-002-static-pain-proposal.png'],
  },
];

const TABS: Array<{ id: MarketingTab; label: string; description: string }> = [
  { id: 'posts', label: 'Posts', description: 'Propuestas, previews, edición, aprobación, imágenes y CSV.' },
  { id: 'insights', label: 'Insights y estrategia', description: 'Métricas, análisis, recomendaciones y memoria estratégica.' },
  { id: 'sources', label: 'Data Sources', description: 'GA4, Search Console, sincronización, errores y aporte de datos.' },
];

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  review: 'Needs review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_CLASSES: Record<PostStatus, string> = {
  draft: 'border-slate-400/40 bg-slate-500/10 text-[color:var(--admin-muted)]',
  review: 'border-amber-400/50 bg-amber-500/10 text-[color:var(--admin-text)]',
  approved: 'border-emerald-400/50 bg-emerald-500/10 text-[color:var(--admin-text)]',
  rejected: 'border-rose-400/50 bg-rose-500/10 text-[color:var(--admin-text)]',
};

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

function buildMetricoolCsv(posts: MarketingPost[]) {
  const rows = [
    ['post_id', 'platform', 'format', 'status', 'asset_files', 'caption_file_or_source', 'tracking_url', 'notes'],
    ...posts
      .filter((post) => post.status === 'approved')
      .map((post) => [
        post.id,
        post.platform.toLowerCase(),
        post.format.toLowerCase(),
        'ready',
        post.selectedAssets.map((asset) => `assets/${asset}`).join('; '),
        'content-plan.md',
        post.trackingUrl,
        post.format === 'Carousel' ? 'Upload as carousel' : 'Upload as single image',
      ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function MarketingPage() {
  const [activeTab, setActiveTab] = useState<MarketingTab>('posts');
  const [posts, setPosts] = useState<MarketingPost[]>(INITIAL_POSTS);
  const [selectedPostId, setSelectedPostId] = useState(INITIAL_POSTS[0]?.id ?? '');

  const selectedPost = posts.find((post) => post.id === selectedPostId) ?? posts[0];
  const approvedCount = posts.filter((post) => post.status === 'approved').length;
  const reviewCount = posts.filter((post) => post.status === 'review').length;
  const selectedAssetCount = posts.reduce((total, post) => total + post.selectedAssets.length, 0);

  const csvPreview = useMemo(() => buildMetricoolCsv(posts), [posts]);

  const updatePost = (postId: string, updater: (post: MarketingPost) => MarketingPost) => {
    setPosts((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
  };

  const exportCsv = () => {
    const blob = new Blob([csvPreview], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'metricool-upload.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Marketing</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Monthly content approval board</h2>
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--admin-muted)]">
              Review generated posts, approve the ones that are ready, and export a Metricool CSV for the approved queue.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="admin2-btn admin2-btn--primary" onClick={exportCsv}>
              Export CSV
            </button>
            <button type="button" className="admin2-btn admin2-btn--ghost" onClick={() => setPosts(INITIAL_POSTS)}>
              Reset
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Configured posts" value={String(posts.length)} helper="Monthly queue" />
        <SummaryCard label="Approved" value={String(approvedCount)} helper="Included in CSV" />
        <SummaryCard label="Needs review" value={String(reviewCount)} helper="Requires decision" />
        <SummaryCard label="Campaign" value="ib20_mvp" helper="English test" />
        <SummaryCard label="Metricool assets" value={`${selectedAssetCount}/5`} helper="Selected assets" />
      </section>

      <nav className="grid gap-2 rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-2 md:grid-cols-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'rounded-xl px-4 py-3 text-left transition',
              activeTab === tab.id
                ? 'bg-[color:var(--admin-active-bg)] text-[color:var(--admin-active-text)]'
                : 'text-[color:var(--admin-muted)] hover:bg-[color:var(--admin-hover)] hover:text-[color:var(--admin-text)]',
            ].join(' ')}
          >
            <span className="block text-sm font-semibold">{tab.label}</span>
            <span className="mt-1 block text-xs opacity-80">{tab.description}</span>
          </button>
        ))}
      </nav>

      {activeTab === 'posts' ? (
        <PostsTab
          posts={posts}
          selectedPost={selectedPost}
          selectedPostId={selectedPostId}
          setSelectedPostId={setSelectedPostId}
          updatePost={updatePost}
          csvPreview={csvPreview}
          exportCsv={exportCsv}
        />
      ) : null}
      {activeTab === 'insights' ? <InsightsTab /> : null}
      {activeTab === 'sources' ? <DataSourcesTab /> : null}
    </div>
  );
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-[color:var(--admin-muted)]">{helper}</p>
    </article>
  );
}

function PostsTab({
  posts,
  selectedPost,
  selectedPostId,
  setSelectedPostId,
  updatePost,
  csvPreview,
  exportCsv,
}: {
  posts: MarketingPost[];
  selectedPost: MarketingPost;
  selectedPostId: string;
  setSelectedPostId: (postId: string) => void;
  updatePost: (postId: string, updater: (post: MarketingPost) => MarketingPost) => void;
  csvPreview: string;
  exportCsv: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.18fr)]">
      <div className="flex flex-col gap-3">
        <Panel title="Generation queue" eyebrow="Posts">
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedPostId(post.id)}
                className={[
                  'rounded-xl border p-4 text-left transition',
                  selectedPostId === post.id
                    ? 'border-[color:var(--admin-accent)] bg-[color:var(--admin-hover)]'
                    : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] hover:border-[color:var(--admin-accent)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{post.date}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">
                      {post.platform} / {post.format}
                    </p>
                  </div>
                  <StatusPill status={post.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-[color:var(--admin-text)]">{post.hook}</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Metricool CSV" eyebrow="Export">
          <p className="text-sm text-[color:var(--admin-muted)]">
            Export only includes approved posts and the currently selected assets.
          </p>
          <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] p-3 text-xs text-[color:var(--admin-muted)]">
            {csvPreview}
          </pre>
          <button type="button" className="admin2-btn admin2-btn--primary mt-3" onClick={exportCsv}>
            Export CSV for Metricool
          </button>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
        <Panel title="Preview and manual editing" eyebrow={selectedPost.id}>
          <div className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">
                {selectedPost.platform} / {selectedPost.format}
              </p>
              <StatusPill status={selectedPost.status} />
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{selectedPost.hook}</h3>
            <p className="mt-3 text-sm leading-6 text-[color:var(--admin-muted)]">{selectedPost.caption}</p>
            <p className="mt-4 rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] p-3 text-xs text-[color:var(--admin-muted)]">
              Tracking: {selectedPost.trackingUrl}
            </p>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Hook</span>
            <input
              value={selectedPost.hook}
              onChange={(event) => updatePost(selectedPost.id, (post) => ({ ...post, hook: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] px-3 py-2 text-sm outline-none focus:border-[color:var(--admin-accent)]"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Caption</span>
            <textarea
              value={selectedPost.caption}
              rows={8}
              onChange={(event) => updatePost(selectedPost.id, (post) => ({ ...post, caption: event.target.value }))}
              className="mt-2 w-full resize-y rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] px-3 py-2 text-sm leading-6 outline-none focus:border-[color:var(--admin-accent)]"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="admin2-btn admin2-btn--success"
              onClick={() => updatePost(selectedPost.id, (post) => ({ ...post, status: 'approved' }))}
            >
              Approve
            </button>
            <button
              type="button"
              className="admin2-btn admin2-btn--danger"
              onClick={() => updatePost(selectedPost.id, (post) => ({ ...post, status: 'rejected' }))}
            >
              Reject
            </button>
            <button
              type="button"
              className="admin2-btn admin2-btn--secondary"
              onClick={() => updatePost(selectedPost.id, (post) => ({ ...post, status: 'review' }))}
            >
              Request review
            </button>
          </div>
        </Panel>

        <Panel title="Image selection" eyebrow="Assets">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {selectedPost.assets.map((asset) => {
              const isSelected = selectedPost.selectedAssets.includes(asset.file);
              return (
                <label
                  key={asset.file}
                  className={[
                    'flex cursor-pointer gap-3 rounded-xl border p-3 transition',
                    isSelected
                      ? 'border-[color:var(--admin-accent)] bg-[color:var(--admin-hover)]'
                      : 'border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)]',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) =>
                      updatePost(selectedPost.id, (post) => ({
                        ...post,
                        selectedAssets: event.target.checked
                          ? [...post.selectedAssets, asset.file]
                          : post.selectedAssets.filter((file) => file !== asset.file),
                      }))
                    }
                    className="mt-1"
                  />
                  <img
                    src={`${ASSET_BASE}/${asset.file}`}
                    alt={asset.title}
                    className="h-20 w-20 shrink-0 rounded-lg border border-[color:var(--admin-border)] object-cover"
                    loading="lazy"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{asset.title}</span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.12em] text-[color:var(--admin-muted)]">{asset.type}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function InsightsTab() {
  const strategyMemoryEntries = useMemo(
    () => parseStrategyMemoryMarkdown(STRATEGY_MEMORY_MARKDOWN),
    [],
  );

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
      <Panel title="Marketing insights" eyebrow="Latest snapshot">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="GA active users" value="14" helper="Anonymous visitors" />
          <SummaryCard label="Registered users" value="22" helper="Neon users" />
          <SummaryCard label="Landing views" value="85" helper="Top path: /" />
          <SummaryCard label="Product views" value="759" helper="/innerbloom2/dashboard" />
          <SummaryCard label="Search clicks" value="0" helper="Search Console" />
          <SummaryCard label="Search impressions" value="3" helper="Brand queries" />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <InsightList
            title="Analysis"
            items={[
              'Top landing: / with 67 views.',
              'Top product page: /innerbloom2/dashboard with 220 views.',
              'Top acquisition source after filters: instagram / social with 11 sessions.',
              'Top query: inner bloom mrr with 2 impressions.',
            ]}
          />
          <InsightList
            title="Recommendations"
            items={[
              'Keep testing adaptive rhythm and real-week positioning.',
              'Use dashboard screenshots when the hook promises product behavior.',
              'Watch page_view -> landing_cta_clicked -> auth_started -> dashboard_view.',
              'Rename unclear strategic language: use Cost of Inaction instead of Cost of Safe.',
            ]}
          />
        </div>
      </Panel>

      <Panel title="Strategy memory" eyebrow="STRATEGY_MEMORY.md">
        <div className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-4">
          <p className="text-sm font-semibold">Historical source</p>
          <p className="mt-2 text-sm text-[color:var(--admin-muted)]">
            The persistent source is <code>Docs/marketing/STRATEGY_MEMORY.md</code>. New runs append dated entries to the changelog instead of replacing earlier strategy context.
          </p>
        </div>

        <StrategyMemoryTimeline entries={strategyMemoryEntries} />

        <InsightList
          title="Monthly generation protocol"
          items={[
            'Read the latest strategy memory Markdown before generating drafts.',
            'Append a dated changelog entry with insights, decisions, learnings and next experiments.',
            'Read new GA4, Search Console and Metricool data when available.',
            'Generate drafts and save copy, assets, schedule and tracking URLs.',
            'Review drafts here, then approve, reject or request review.',
            'Export a Metricool CSV only after approval.',
          ]}
        />
      </Panel>
    </section>
  );
}

function StrategyMemoryTimeline({ entries }: { entries: StrategyMemoryEntry[] }) {
  if (!entries.length) {
    return (
      <p className="mt-4 rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] p-4 text-sm text-[color:var(--admin-muted)]">
        No strategy memory entries found yet.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {entries.map((entry) => (
        <article key={`${entry.date}-${entry.period}`} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">{entry.date}</p>
              <h4 className="mt-1 text-base font-semibold">{entry.period}</h4>
            </div>
            {entry.periodAnalyzed[0] ? (
              <span className="rounded-full border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-1 text-xs text-[color:var(--admin-muted)]">
                {entry.periodAnalyzed[0]}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            <StrategyMemorySection title="Insights" items={entry.insights} />
            <StrategyMemorySection title="Decisions" items={entry.decisions} />
            <StrategyMemorySection title="Changes" items={entry.changes} />
            <StrategyMemorySection title="Worked" items={entry.worked} />
            <StrategyMemorySection title="Did not work" items={entry.didNotWork} />
            <StrategyMemorySection title="Learnings" items={entry.learnings} />
            <StrategyMemorySection title="Next actions" items={entry.nextExperiments} />
            <StrategyMemorySection title="Future recommendations" items={entry.futureRecommendations} />
          </div>
        </article>
      ))}
    </div>
  );
}

function StrategyMemorySection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-[color:var(--admin-muted)]">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataSourcesTab() {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.62fr)]">
      <Panel title="Connected data sources" eyebrow="Data Sources">
        <div className="grid gap-3 lg:grid-cols-2">
          <SourceCard
            name="GA4"
            status="Connected"
            lastSync="2026-06-01 -> 2026-06-28"
            error="No active sync errors"
            action="Sync GA4 data"
            contributes="Landing views, product views, active users, acquisition source and funnel events."
          />
          <SourceCard
            name="Google Search Console"
            status="Connected"
            lastSync="2026-06-01 -> 2026-06-28"
            error="No active sync errors"
            action="Sync Search Console"
            contributes="Search impressions, clicks, queries and destination URLs."
          />
        </div>
      </Panel>

      <Panel title="Storage and files" eyebrow="Data Storage">
        <div className="flex flex-col gap-3">
          {[
            ['Google Drive marketing root', 'Campaign folders, generated assets and copy sources.'],
            ['Strategy memory file', 'Expected Markdown source for positioning and recommendations.'],
            ['Assets folder', 'Approved post images used by the Metricool export.'],
            ['Campaigns folder', 'Monthly campaign plan and CSV upload files.'],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[color:var(--admin-accent)]">{title}</p>
              <p className="mt-1 text-xs text-[color:var(--admin-muted)]">{detail}</p>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">{title}</h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function StatusPill({ status }: { status: PostStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-4">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-[color:var(--admin-muted)]">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-[color:var(--admin-border)] bg-[color:var(--admin-bg)] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceCard({
  name,
  status,
  lastSync,
  error,
  action,
  contributes,
}: {
  name: string;
  status: string;
  lastSync: string;
  error: string;
  action: string;
  contributes: string;
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold">{name}</h4>
          <p className="mt-1 text-xs text-[color:var(--admin-muted)]">{contributes}</p>
        </div>
        <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-[color:var(--admin-text)]">
          {status}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Last sync</dt>
          <dd className="mt-1">{lastSync}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Errors</dt>
          <dd className="mt-1">{error}</dd>
        </div>
      </dl>
      <button type="button" className="admin2-btn admin2-btn--secondary mt-4">
        {action}
      </button>
    </article>
  );
}
