'use client';

import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, FileUp, Sparkles, X } from 'lucide-react';

const STEPS = [
  '1. 企业基础信息',
  '2. 导入企业资料',
  '3. 品牌定位提取',
  '4. 知识库确认',
  '5. 产品档案建立',
  '6. 营销方向与 Agent',
];

export function OnboardingWizard({
  onClose,
  onCompleted,
}: {
  onClose: () => void;
  onCompleted: (newOrgId: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [companyName, setCompanyName] = useState('');
  const [industryType, setIndustryType] = useState('scenic_spot');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [mainBusiness, setMainBusiness] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [isDemo, setIsDemo] = useState(true);

  // Step 2
  const [materials, setMaterials] = useState<Array<{ title: string; content: string; sourceType: 'manual' | 'markdown' | 'txt' | 'csv' }>>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matContent, setMatContent] = useState('');

  // Step 3
  const [brandPositioning, setBrandPositioning] = useState('');
  const [brandStyle, setBrandStyle] = useState('真实可信、克制高级、有在地文化感');
  const [audiencesText, setAudiencesText] = useState('18-35岁都市年轻人, 亲子家庭, 周末短途客群');
  const [advantages, setAdvantages] = useState('');
  const [forbiddenText, setForbiddenText] = useState('虚构价格, 未核实开放时间, 绝对化宣传语');

  // Step 5
  const [prodName, setProdName] = useState('');
  const [prodSummary, setProdSummary] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodAddress, setProdAddress] = useState('');
  const [prodVerified, setProdVerified] = useState(false);
  const [prodImageUrl, setProdImageUrl] = useState('/demo-assets/shanhai-d01-cover.jpg');

  // Step 6
  const [direction, setDirection] = useState('围绕核心产品打造小红书 3:4 攻略清单图文，先建立收藏率与有效咨询率基线，再放大高转化选题。');

  function handleAutoExtract() {
    if (!brandPositioning && description) {
      setBrandPositioning(`${location ? location + ' · ' : ''}${description.slice(0, 60)}`);
    }
    if (!advantages && mainBusiness) {
      setAdvantages(mainBusiness);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || ext === 'docx') {
      setError('PDF / DOCX 真实解析能力尚未接通，当前支持 TXT / Markdown / CSV 文件导入。');
      return;
    }
    setError('');
    const content = await file.text();
    setMaterials((prev) => [
      ...prev,
      {
        title: file.name,
        content: content.slice(0, 8000),
        sourceType: ext === 'csv' ? 'csv' : ext === 'md' ? 'markdown' : 'txt',
      },
    ]);
  }

  async function handleFinish() {
    if (!companyName.trim()) {
      setError('请先填写企业名称');
      setStep(0);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/v1/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          industryType,
          location,
          website,
          mainBusiness,
          contactInfo,
          description,
          isDemo,
          importedMaterials: materials,
          brandPositioning,
          brandStyle,
          targetAudiences: audiencesText.split(/[,，、]+/).map((s) => s.trim()).filter(Boolean),
          companyAdvantages: advantages,
          forbiddenClaims: forbiddenText.split(/[,，、]+/).map((s) => s.trim()).filter(Boolean),
          product: prodName.trim()
            ? {
                name: prodName,
                summary: prodSummary,
                priceInfo: prodPrice || '待补充',
                address: prodAddress || location || '待补充',
                verificationStatus: prodVerified ? 'verified' : 'unverified',
                imageUrl: prodImageUrl,
              }
            : undefined,
          confirmedMarketingDirection: direction,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || '初始化失败');
      }
      await onCompleted(json.data.organizationId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化异常');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e2e8f0] rounded-lg w-full max-w-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">新企业入驻与专属 Agent 初始化向导</h2>
            <p className="text-xs text-[#64748b] mt-0.5">6 步完成企业档案、知识库构建、产品建档与专属营销 Agent 自动创建</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#64748b] hover:text-[#0f172a]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 步骤指示条 */}
        <div className="px-5 py-2.5 border-b border-[#e2e8f0] flex flex-wrap gap-1.5 bg-white">
          {STEPS.map((label, idx) => (
            <button
              key={label}
              onClick={() => setStep(idx)}
              className={`px-2 py-1 rounded text-[11px] font-medium ${
                step === idx
                  ? 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]'
                  : idx < step
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-[#64748b]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 min-h-[300px] text-xs">
          {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700">{error}</div>}

          {step === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] mb-1 font-medium">企业名称 *</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="如：青禾文旅有限公司" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
                </div>
                <div>
                  <label className="block text-[#475569] mb-1 font-medium">所属行业</label>
                  <select value={industryType} onChange={(e) => setIndustryType(e.target.value)} className="w-full px-3 py-2 rounded border border-[#e2e8f0] bg-white">
                    <option value="scenic_spot">文旅景区 / 古镇</option>
                    <option value="homestay">精品民宿 / 度假酒店</option>
                    <option value="travel_agency">旅游企业 / 研学机构</option>
                    <option value="cultural_org">文创 / 文化传播机构</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#475569] mb-1 font-medium">所在地</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="如：浙江杭州" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
                </div>
                <div>
                  <label className="block text-[#475569] mb-1 font-medium">官方网站（选填）</label>
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
                </div>
                <div>
                  <label className="block text-[#475569] mb-1 font-medium">主营业务</label>
                  <input value={mainBusiness} onChange={(e) => setMainBusiness(e.target.value)} placeholder="如：景区门票、联票、在地文创" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
                </div>
                <div>
                  <label className="block text-[#475569] mb-1 font-medium">联系方式（选填）</label>
                  <input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="官方客服微信或电话" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
                </div>
              </div>
              <div>
                <label className="block text-[#475569] mb-1 font-medium">公司介绍</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简述企业核心特色与业务定位..." className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              </div>
              <label className="flex items-center gap-2 text-[#475569]">
                <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} />
                <span>标记为演示企业（明确区分演示数据与正式客户数据）</span>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">导入企业已有资料（支持 TXT / Markdown / CSV；PDF/DOCX 暂未接通）</span>
                <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-medium">
                  <FileUp className="w-3.5 h-3.5" /> 上传文件
                  <input type="file" accept=".txt,.md,.csv,.pdf,.docx" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
                <input value={matTitle} onChange={(e) => setMatTitle(e.target.value)} placeholder="或手动粘贴资料标题" className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                <textarea rows={3} value={matContent} onChange={(e) => setMatContent(e.target.value)} placeholder="粘贴企业手册、FAQ、产品介绍文本..." className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                <button
                  type="button"
                  onClick={() => {
                    if (!matTitle.trim() || !matContent.trim()) return;
                    setMaterials((prev) => [...prev, { title: matTitle, content: matContent, sourceType: 'manual' }]);
                    setMatTitle('');
                    setMatContent('');
                  }}
                  className="px-3 py-1 rounded bg-[#0f172a] text-white"
                >
                  加入导入列表
                </button>
              </div>
              {materials.length > 0 && (
                <div className="space-y-1">
                  <div className="font-medium text-[#0f172a]">待导入资料 ({materials.length})</div>
                  {materials.map((m, i) => (
                    <div key={i} className="px-2.5 py-1.5 rounded bg-[#f1f5f9] flex justify-between">
                      <span>{m.title} ({m.sourceType})</span>
                      <span className="text-[#64748b]">{m.content.length} 字</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#475569]">确认提取的品牌定位、调性与宣传禁区</span>
                <button type="button" onClick={handleAutoExtract} className="inline-flex items-center gap-1 text-[#1d4ed8] font-medium hover:underline">
                  <Sparkles className="w-3.5 h-3.5" /> 从第一步自动提取
                </button>
              </div>
              <input value={brandPositioning} onChange={(e) => setBrandPositioning(e.target.value)} placeholder="品牌定位（无法确认请留空，将自动标为待补充）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={brandStyle} onChange={(e) => setBrandStyle(e.target.value)} placeholder="品牌表达风格" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={audiencesText} onChange={(e) => setAudiencesText(e.target.value)} placeholder="目标客户群体（逗号分隔）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={advantages} onChange={(e) => setAdvantages(e.target.value)} placeholder="企业核心优势" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={forbiddenText} onChange={(e) => setForbiddenText(e.target.value)} placeholder="宣传禁区与红线（逗号分隔）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2.5">
              <div className="font-medium text-[#0f172a]">将自动写入的结构化知识库预览（未填项自动标注 [待补充]）</div>
              <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] space-y-1 text-[#475569]">
                <div><strong>A_FACTS（企业基本事实）</strong>：{companyName || '未填'} · {location || '[待补充]'} · {mainBusiness || '[待补充]'}</div>
                <div><strong>C_BRAND（品牌与禁区）</strong>：定位={brandPositioning || '[待补充]'} · 禁区={forbiddenText}</div>
                <div><strong>B_PRODUCTS（导入资料）</strong>：共 {materials.length} 份资料，默认标为待核实，严禁 AI 编造未确认价格与时间。</div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="font-medium text-[#0f172a]">建立首个主打产品档案（选填，可在产品管理继续新增）</div>
              <input value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="产品名称（如：周末半日慢游套票）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <textarea rows={2} value={prodSummary} onChange={(e) => setProdSummary(e.target.value)} placeholder="产品核心卖点与适用人群..." className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <div className="grid grid-cols-2 gap-3">
                <input value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} placeholder="真实价格（未确认留空）" className="px-3 py-2 rounded border border-[#e2e8f0]" />
                <input value={prodAddress} onChange={(e) => setProdAddress(e.target.value)} placeholder="使用地址/门店" className="px-3 py-2 rounded border border-[#e2e8f0]" />
              </div>
              <input value={prodImageUrl} onChange={(e) => setProdImageUrl(e.target.value)} placeholder="产品实拍图 URL（可选）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <label className="flex items-center gap-2 text-[#475569]">
                <input type="checkbox" checked={prodVerified} onChange={(e) => setProdVerified(e.target.checked)} />
                <span>已人工核实价格与规则（不勾选则标为待核实）</span>
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="font-medium text-[#0f172a]">确认首阶段营销方向，完成后自动生成企业专属营销 Agent</div>
              <textarea rows={4} value={direction} onChange={(e) => setDirection(e.target.value)} className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <div className="p-3 rounded bg-[#eff6ff] border border-[#bfdbfe] text-[#1e40af]">
                点击下方「完成入驻并创建专属 Agent」后，系统将持久化企业工作空间、结构化知识库、产品档案，并自动装配 8 大逻辑角色的专属营销 Agent。
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#e2e8f0] bg-white text-xs text-[#475569] disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> 上一步
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 0) handleAutoExtract();
                setStep((s) => s + 1);
              }}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded bg-[#1d4ed8] text-white text-xs font-medium"
            >
              下一步 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinish}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" /> {submitting ? '初始化中...' : '完成入驻并创建专属 Agent'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
