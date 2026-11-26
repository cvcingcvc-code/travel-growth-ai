'use client';

import React, { useEffect, useState } from 'react';
import { AppShell, type NavTab, type OrgItem } from '@/components/AppShell';
import { TodayView } from '@/components/views/TodayView';
import { KnowledgeView } from '@/components/views/KnowledgeView';
import { AssetsView } from '@/components/views/AssetsView';
import { AgentView } from '@/components/views/AgentView';
import { IntelligenceView } from '@/components/views/IntelligenceView';
import { AnalysisView } from '@/components/views/AnalysisView';
import { CampaignsView } from '@/components/views/CampaignsView';
import { CreationView } from '@/components/views/CreationView';
import { PublishCenterView } from '@/components/views/PublishCenterView';
import { ReviewView } from '@/components/views/ReviewView';
import { ModelsView } from '@/components/views/ModelsView';
import { HelpView } from '@/components/views/HelpView';
import { OnboardingWizard } from '@/components/views/OnboardingWizard';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<{ summary?: { pendingReviewCount?: number } } | null>(null);
  const [loadingDash, setLoadingDash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  async function loadOrgs(selectId?: string) {
    const res = await fetch('/api/v1/organizations');
    const json = await res.json();
    if (json.ok) {
      setOrgs(json.data);
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('tg_active_org') : null;
      const target =
        selectId ||
        (saved && json.data.some((o: OrgItem) => o.id === saved) ? saved : json.data[0]?.id || '');
      setActiveOrgId(target);
      if (json.data.length === 0) {
        setShowOnboarding(true);
      }
    }
  }

  async function loadDashboard(orgId: string) {
    if (!orgId) return;
    setLoadingDash(true);
    try {
      const res = await fetch('/api/v1/dashboard', {
        headers: { 'x-organization-id': orgId },
      });
      const json = await res.json();
      if (json.ok) setDashboardData(json.data);
    } finally {
      setLoadingDash(false);
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  useEffect(() => {
    if (activeOrgId) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tg_active_org', activeOrgId);
      }
      loadDashboard(activeOrgId);
    }
  }, [activeOrgId, activeTab]);

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        orgs={orgs}
        activeOrgId={activeOrgId}
        onOrgChange={setActiveOrgId}
        onOpenOnboarding={() => setShowOnboarding(true)}
        pendingReviewCount={dashboardData?.summary?.pendingReviewCount ?? 0}
      >
        {!activeOrgId ? (
          <div className="p-8 text-center text-sm text-[#64748b]">正在初始化企业工作空间...</div>
        ) : activeTab === 'today' ? (
          <TodayView data={dashboardData as never} loading={loadingDash} onNavigate={setActiveTab} />
        ) : activeTab === 'brand_kb' ? (
          <KnowledgeView orgId={activeOrgId} />
        ) : activeTab === 'products' ? (
          <AssetsView orgId={activeOrgId} />
        ) : activeTab === 'agent' ? (
          <AgentView orgId={activeOrgId} />
        ) : activeTab === 'intelligence' ? (
          <div className="space-y-8">
            <IntelligenceView orgId={activeOrgId} />
            <div className="border-t border-[#e2e8f0] pt-6">
              <AnalysisView orgId={activeOrgId} />
            </div>
          </div>
        ) : activeTab === 'campaigns' ? (
          <CampaignsView orgId={activeOrgId} onNavigate={setActiveTab} />
        ) : activeTab === 'creation' ? (
          <CreationView orgId={activeOrgId} />
        ) : activeTab === 'publish' ? (
          <PublishCenterView orgId={activeOrgId} />
        ) : activeTab === 'review' ? (
          <ReviewView orgId={activeOrgId} />
        ) : (
          <div className="space-y-8">
            <ModelsView orgId={activeOrgId} />
            <div className="border-t border-[#e2e8f0] pt-6">
              <HelpView />
            </div>
          </div>
        )}
      </AppShell>

      {showOnboarding && (
        <OnboardingWizard
          onClose={() => setShowOnboarding(false)}
          onCompleted={async (newOrgId) => {
            await loadOrgs(newOrgId);
            setActiveTab('agent');
          }}
        />
      )}
    </>
  );
}
