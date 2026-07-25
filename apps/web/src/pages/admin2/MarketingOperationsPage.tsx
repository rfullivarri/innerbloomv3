import { useState } from 'react';
import { MarketingPageV2 } from './MarketingPageV2';
import { MarketingPipelinePanel } from './MarketingPipelinePage';

type MarketingSection = 'campaigns' | 'pipeline';

export function MarketingOperationsPage() {
  const [section, setSection] = useState<MarketingSection>('campaigns');

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 pb-16">
    <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] px-5 pt-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Marketing operations</p>
        <h2 className="mt-1 text-2xl font-semibold">Marketing</h2>
        <p className="mt-2 text-sm text-[color:var(--admin-muted)]">Review campaigns or inspect the automation workflow that produces them.</p>
      </div>
      <div className="mt-5 flex gap-2 border-b border-[color:var(--admin-border)]">
        <TabButton active={section === 'campaigns'} onClick={() => setSection('campaigns')}>Campaigns</TabButton>
        <TabButton active={section === 'pipeline'} onClick={() => setSection('pipeline')}>Pipeline</TabButton>
      </div>
    </header>

    {section === 'campaigns' ? <MarketingPageV2/> : <MarketingPipelinePanel/>}
  </div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button type="button" onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? 'border-[color:var(--admin-accent)] text-[color:var(--admin-text)]' : 'border-transparent text-[color:var(--admin-muted)]'}`}>{children}</button>;
}
