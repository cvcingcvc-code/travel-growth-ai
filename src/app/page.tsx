'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell, type NavTab, type OrgItem } from '@/components/AppShell';
import { LandingView } from '@/components/views/LandingView';
import { TodayView } from '@/components/views/TodayView';
import { CompanyProfileView } from '@/components/views/CompanyProfileView';
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

const VALID_TABS: NavTab[] = [
  'landing',
  'today',
  'profile',
  'knowledge',
  'products',
  'agent',
  'intelligence',
  'campaigns',
  'creation',
  'publish',
  'review',
  'settings',
];

function readUrlState(): { view: NavTab; org: string; item: string } {
  if (typeof window === 'undefined') return { view: 'landing', org: '', item: '' };
  const sp = new URLSearchParams(window.location.search);
  const rawView = sp.get('view') as NavTab | null;
  const view = rawView && VALID_TABS.includes(rawView) ? rawView : 'landing';
  return {
    view,
    org: sp.get('org') || '',
    item: sp.get('item') || '',
  };
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('landing');
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [focusedItemId, setFocusedItemId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<{
    summary?: { pendingReviewCount?: number };
    providerStatuses?: Array<{ capability: string; status: string }>;
  } | null>(null);
  const [agentStepCount, setAgentStepCount] = useState(0);
  const [loadingDash, setLoadingDash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const pushUrlState = useCallback((view: NavTab, org: string, item = '') => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams();
    if (view !== 'landing') sp.set('view', view);
    if (org) sp.set('org', org);
    if (item) sp.set('item', item);
    const nextUrl = sp.toString() ? `/?${sp.toString()}` : '/';
    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.pushState({ view, org, item }, '', nextUrl);
    }
  }, []);

  const navigate = useCallback(
    (tab: NavTab, itemId = '') => {
      setActiveTab(tab);
      setFocusedItemId(itemId);
      pushUrlState(tab, activeOrgId, itemId);
    },
    [activeOrgId, pushUrlState]
  );

  const handleOrgSwitch = useCallback(
    (newOrgId: string) => {
      setActiveOrgId(newOrgId);
      setFocusedItemId('');
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tg_active_org', newOrgId);
      }
      pushUrlState(activeTab, newOrgId, '');
    },
    [activeTab, pushUrlState]
  );

  const handleGoBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      navigate('landing');
    }
  }, [navigate]);

  async function loadOrgs(selectId?: string) {
    const res = await fetch('/api/v1/organizations');
    const json = await res.json();
    if (json.ok) {
      setOrgs(json.data);
      const urlState = readUrlState();
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('tg_active_org') : null;
      const preferred =
        selectId ||
        (urlState.org && json.data.some((o: OrgItem) => o.id === urlState.org) ? urlState.org : '') ||
        (saved && json.data.some((o: OrgItem) => o.id === saved) ? saved : '') ||
        json.data.find((o: OrgItem) => o.id === 'org_demo_spruce')?.id ||
        json.data[0]?.id ||
        '';
      setActiveOrgId(preferred);
      setActiveTab(urlState.view);
      setFocusedItemId(urlState.item);
    }
  }

  async function loadDashboardAndAgent(orgId: string) {
    if (!orgId) return;
    setLoadingDash(true);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch('/api/v1/dashboard', { headers: { 'x-organization-id': orgId } }),
        fetch('/api/v1/agent-profile', { headers: { 'x-organization-id': orgId } }),
      ]);
      const dJson = await dRes.json();
      const aJson = await aRes.json();
      if (dJson.ok) setDashboardData(dJson.data);
      if (aJson.ok) setAgentStepCount(aJson.data.steps?.length ?? 0);
    } finally {
      setLoadingDash(false);
    }
  }

  useEffect(() => {
    loadOrgs();
    const onPopState = () => {
      const st = readUrlState();
      setActiveTab(st.view);
      if (st.org) setActiveOrgId(st.org);
      setFocusedItemId(st.item);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (activeOrgId) {
      loadDashboardAndAgent(activeOrgId);
    }
  }, [activeOrgId, activeTab]);

  const textProvider = dashboardData?.providerStatuses?.find((p) => p.capability === 'text');
  const isLiveModel = textProvider?.status === 'connected';
  const realAgentStatus = {
    label: isLiveModel ? 'Agent · 真实模型' : 'Agent · 规则/测试模式',
    isLiveModel,
    stepCount: agentStepCount,
  };

  if (activeTab === 'landing') {
    return (
      <>
        <LandingView
          orgs={orgs}
          onEnterDemo={(orgId, tab = 'today') => {
            setActiveOrgId(orgId);
            setActiveTab(tab);
            if (typeof window !== 'undefined') window.localStorage.setItem('tg_active_org', orgId);
            pushUrlState(tab, orgId);
          }}
          onStartCreate={() => setShowOnboarding(true)}
        />
        {showOnboarding && (
          <OnboardingWizard
            onClose={() => setShowOnboarding(false)}
            onCompleted={async (newOrgId) => {
              await loadOrgs(newOrgId);
              setActiveOrgId(newOrgId);
              setActiveTab('knowledge');
              pushUrlState('knowledge', newOrgId);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onTabChange={navigate}
        onGoBack={handleGoBack}
        orgs={orgs}
        activeOrgId={activeOrgId}
        onOrgChange={handleOrgSwitch}
        onOpenOnboarding={() => setShowOnboarding(true)}
        pendingReviewCount={dashboardData?.summary?.pendingReviewCount ?? 0}
        realAgentStatus={realAgentStatus}
      >
        {!activeOrgId ? (
          <div className="p-8 text-center text-sm text-[#64748b]">正在加载企业工作空间...</div>
        ) : activeTab === 'today' ? (
          <TodayView data={dashboardData as never} loading={loadingDash} onNavigate={navigate} />
        ) : activeTab === 'profile' ? (
          <CompanyProfileView orgId={activeOrgId} onNavigate={navigate} />
        ) : activeTab === 'knowledge' ? (
          <KnowledgeView orgId={activeOrgId} focusedDocId={focusedItemId} onNavigate={navigate} />
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
          <CampaignsView orgId={activeOrgId} onNavigate={navigate} />
        ) : activeTab === 'creation' ? (
          <CreationView orgId={activeOrgId} />
        ) : activeTab === 'publish' ? (
          <PublishCenterView orgId={activeOrgId} onNavigate={navigate} />
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
            setActiveOrgId(newOrgId);
            setActiveTab('knowledge');
            pushUrlState('knowledge', newOrgId);
          }}
        />
      )}
    </>
  );
}
