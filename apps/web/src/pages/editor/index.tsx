import { useLocation } from 'react-router-dom';
import { DevErrorBoundary } from '../../components/DevErrorBoundary';
import { Navbar } from '../../components/layout/Navbar';
import { MobileBottomNav } from '../../components/layout/MobileBottomNav';
import { Card } from '../../components/common/Card';
import {
  DASHBOARD_SECTIONS,
  getActiveSection,
  taskEditorSection,
  type DashboardSectionConfig,
} from '../dashboardSections';

export default function TaskEditorPage() {
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);

  return (
    <DevErrorBoundary>
      <div className="flex min-h-screen flex-col">
        <Navbar title={activeSection.pageTitle} sections={DASHBOARD_SECTIONS} />
        <main className="flex-1 pb-24 md:pb-0">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
            <SectionHeader section={taskEditorSection} />
            <Card>
              <div className="min-h-[320px]" />
            </Card>
          </div>
        </main>
        <MobileBottomNav
          items={DASHBOARD_SECTIONS.map((section) => {
            const Icon = section.icon;

            return {
              key: section.key,
              label: section.label,
              to: section.to,
              icon: <Icon className="h-5 w-5" />,
              end: section.end,
            };
          })}
        />
      </div>
    </DevErrorBoundary>
  );
}

function SectionHeader({ section }: { section: DashboardSectionConfig }) {
  const normalizedTitle = section.contentTitle.trim();
  const normalizedDescription = section.description?.trim() ?? '';
  const shouldShowDescription = normalizedDescription.length > 0;

  return (
    <header className="mb-6 space-y-2 md:mb-8">
      <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        {normalizedTitle}
      </h1>
      {shouldShowDescription && <p className="text-sm text-slate-400">{normalizedDescription}</p>}
    </header>
  );
}
