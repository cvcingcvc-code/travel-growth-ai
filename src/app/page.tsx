'use client';

import React, { useEffect, useState } from 'react';
import { AppShell, type NavTab, type OrgItem } from '@/components/AppShell';
import { TodayView } from '@/components/views/TodayView';
import { IntelligenceView } from '@/components/views/IntelligenceView';
import { AnalysisView } from '@/components/views/AnalysisView';
import { KnowledgeView } from '@/components/views/KnowledgeView';
import { CreationView } from '@/components/views/CreationView';
import { AssetsView } from '@/components/views/AssetsView';
import { ModelsView } from '@/components/views/ModelsView';
import { HelpView } from '@/components/views/HelpView';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDash, setLoadingDash] = useState(true);

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
      if (activeTab === 'today') {
        loadDashboard(activeOrgId);
      }
    }
  }, [activeOrgId, activeTab]);

  async function handleCreateOrg(payload: {
    name: string;
    industryType: string;
    location: string;
    description: string;
  }) {
    const res = await fetch('/api/v1/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.ok) {
      const newId = json.data.organization.id;
      await loadOrgs(newId);
    }
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      orgs={orgs}
      activeOrgId={activeOrgId}
      onOrgChange={setActiveOrgId}
      onCreateOrg={handleCreateOrg}
    >
      {!activeOrgId ? (
        <div className="p-8 text-center text-sm text-[#53605a]">正在初始化企业工作空间...</div>
      ) : activeTab === 'today' ? (
        <TodayView data={dashboardData} loading={loadingDash} onNavigate={setActiveTab} />
      ) : activeTab === 'intelligence' ? (
        <IntelligenceView orgId={activeOrgId} />
      ) : activeTab === 'analysis' ? (
        <AnalysisView orgId={activeOrgId} />
      ) : activeTab === 'knowledge' ? (
        <KnowledgeView orgId={activeOrgId} />
      ) : activeTab === 'creation' ? (
        <CreationView orgId={activeOrgId} />
      ) : activeTab === 'assets' ? (
        <AssetsView orgId={activeOrgId} />
      ) : activeTab === 'models' ? (
        <ModelsView orgId={activeOrgId} />
      ) : (
        <HelpView />
      )}
    </AppShell>
  );
}
