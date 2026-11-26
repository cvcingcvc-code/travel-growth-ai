'use client';

import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, FileUp, Plus, Sparkles, Trash2, X, AlertCircle } from 'lucide-react';

const STEPS = [
  '1. 企业基础信息',
  '2. 导入企业资料',
  '3. 规则提取与品牌',
  '4. 知识库确认',
  '5. 多产品档案',
  '6. 确认并建 Agent',
];

interface ImportedMat {
  title: string;
  content: string;
  sourceType: 'manual' | 'markdown' | 'txt' | 'csv';
  contentHash?: string;
  charCount: number;
  sectionsCount: number;
  tablesCount: number;
  detectedUnverified: string[];
  category: 'A_FACTS' | 'B_PRODUCTS' | 'C_BRAND' | 'D_STRATEGIES' | 'E_EXPERIENCE' | 'F_SYSTEM_AGENT';
}

interface ProductDraft {
  name: string;
  summary: string;
  priceInfo: string;
  address: string;
  verificationStatus: 'verified' | 'unverified';
  imageUrl: string;
}

export function OnboardingWizard({
  onClose,
  onCompleted,
}: {
  onClose: () => void;
  onCompleted: (newOrgId: string) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [infoNote, setInfoNote] = useState('');

  // Step 1（严禁预填演示企业的默认画像/图片/方向）
  const [companyName, setCompanyName] = useState('');
  const [industryType, setIndustryType] = useState('scenic_spot');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [mainBusiness, setMainBusiness] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [description, setDescription] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  // Step 2: 无截断多文件导入
  const [materials, setMaterials] = useState<ImportedMat[]>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matContent, setMatContent] = useState('');

  // Step 3: 规则提取的品牌信息（初始全空，避免误写演示数据）
  const [brandPositioning, setBrandPositioning] = useState('');
  const [brandStyle, setBrandStyle] = useState('');
  const [audiencesText, setAudiencesText] = useState('');
  const [advantages, setAdvantages] = useState('');
  const [forbiddenText, setForbiddenText] = useState('');

  // Step 5: 多产品列表（初始为空，不注入演示图片）
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [pName, setPName] = useState('');
  const [pSummary, setPSummary] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pVerified, setPVerified] = useState(false);
  const [pImg, setPImg] = useState('');

  // Step 6: 营销方向
  const [direction, setDirection] = useState('');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setParsing(true);
    setError('');
    setInfoNote('');

    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/v1/parse-file', { method: 'POST', body: fd });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error?.message || `解析 ${file.name} 失败`);
          continue;
        }
        const parsed = json.data as {
          fileName: string;
          format: string;
          rawText: string;
          charCount: number;
          contentHash: string;
          sections: Array<{ heading: string }>;
          tablesCount: number;
          detectedFacts: string[];
          detectedProducts: string[];
          detectedUnverified: string[];
          detectedToneOrBrand: string[];
          structuredJson?: Record<string, unknown>;
          capabilityNote: string;
        };

        // 重复检测
        if (materials.some((m) => m.contentHash === parsed.contentHash)) {
          setInfoNote(`文件「${parsed.fileName}」内容与已导入资料重复，已自动去重。`);
          continue;
        }

        // 若导入的是外部 AI 结构化 JSON，支持自动字段映射
        if (parsed.format === 'json' && parsed.structuredJson) {
          const sj = parsed.structuredJson;
          if (!companyName && typeof sj.companyName === 'string') setCompanyName(sj.companyName);
          if (!brandPositioning && typeof sj.brandPositioning === 'string') setBrandPositioning(sj.brandPositioning);
          if (!direction && typeof sj.marketingDirection === 'string') setDirection(sj.marketingDirection);
        }

        // 基于真实规则提取结果填充空白项（不覆盖用户已手写的内容）
        if (!brandStyle && parsed.detectedToneOrBrand.length > 0) {
          setBrandStyle(parsed.detectedToneOrBrand.slice(0, 2).join('；'));
        }
        if (!advantages && parsed.detectedFacts.length > 0) {
          setAdvantages(parsed.detectedFacts.slice(0, 3).join('；'));
        }

        setMaterials((prev) => [
          ...prev,
          {
            title: parsed.fileName,
            content: parsed.rawText, // 完整原文，零截断
            sourceType: parsed.format === 'csv' ? 'csv' : parsed.format === 'markdown' ? 'markdown' : 'txt',
            contentHash: parsed.contentHash,
            charCount: parsed.charCount,
            sectionsCount: parsed.sections.length,
            tablesCount: parsed.tablesCount,
            detectedUnverified: parsed.detectedUnverified,
            category: 'B_PRODUCTS',
          },
        ]);
        setInfoNote(
          `已无截断解析「${parsed.fileName}」（共 ${parsed.charCount} 字，识别 ${parsed.sections.length} 个章节、${parsed.tablesCount} 个表格、${parsed.detectedUnverified.length} 条待核实项）。${parsed.capabilityNote}`
        );
      }
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  }

  function addManualMaterial() {
    if (!matTitle.trim() || !matContent.trim()) return;
    setMaterials((prev) => [
      ...prev,
      {
        title: matTitle.trim(),
        content: matContent.trim(),
        sourceType: 'manual',
        charCount: matContent.trim().length,
        sectionsCount: 1,
        tablesCount: 0,
        detectedUnverified: [],
        category: 'B_PRODUCTS',
      },
    ]);
    setMatTitle('');
    setMatContent('');
  }

  function addProductItem() {
    if (!pName.trim()) return;
    setProducts((prev) => [
      ...prev,
      {
        name: pName.trim(),
        summary: pSummary.trim(),
        priceInfo: pPrice.trim() || '待补充',
        address: pAddress.trim() || location.trim() || '待补充',
        verificationStatus: pVerified ? 'verified' : 'unverified',
        imageUrl: pImg.trim(),
      },
    ]);
    setPName('');
    setPSummary('');
    setPPrice('');
    setPAddress('');
    setPVerified(false);
    setPImg('');
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
      const finalProducts = [...products];
      if (pName.trim()) {
        finalProducts.push({
          name: pName.trim(),
          summary: pSummary.trim(),
          priceInfo: pPrice.trim() || '待补充',
          address: pAddress.trim() || location.trim() || '待补充',
          verificationStatus: pVerified ? 'verified' : 'unverified',
          imageUrl: pImg.trim(),
        });
      }

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
          importedMaterials: materials.map((m) => ({
            title: m.title,
            content: m.content,
            sourceType: m.sourceType,
            contentHash: m.contentHash,
            category: m.category,
          })),
          brandPositioning,
          brandStyle,
          targetAudiences: audiencesText.split(/[,，、]+/).map((s) => s.trim()).filter(Boolean),
          companyAdvantages: advantages,
          forbiddenClaims: forbiddenText.split(/[,，、]+/).map((s) => s.trim()).filter(Boolean),
          products: finalProducts,
          confirmedMarketingDirection: direction,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || '初始化失败');
      await onCompleted(json.data.organizationId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化异常');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e2e8f0] rounded-xl w-full max-w-2xl shadow-xl overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">创建我的企业（6 步无截断入驻向导）</h2>
            <p className="text-xs text-[#64748b] mt-0.5">支持 Markdown / TXT / CSV / JSON / DOCX / XLSX 完整解析，绝不写入演示企业默认数据</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#64748b] hover:text-[#0f172a]"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-2.5 border-b border-[#e2e8f0] flex flex-wrap gap-1.5 bg-white">
          {STEPS.map((label, idx) => (
            <button
              key={label}
              onClick={() => setStep(idx)}
              className={`px-2 py-1 rounded text-[11px] font-medium ${
                step === idx ? 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]' : idx < step ? 'bg-emerald-50 text-emerald-700' : 'text-[#64748b]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 min-h-[320px] max-h-[65vh] overflow-y-auto text-xs">
          {error && <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
          {infoNote && <div className="p-2.5 rounded bg-[#eff6ff] border border-[#bfdbfe] text-[#1e40af]">{infoNote}</div>}

          {step === 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#475569] mb-1 font-medium">企业名称 *</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="输入真实或测试企业名称" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
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
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="省市区（未填标为待补充）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
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
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简述企业核心特色..." className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              </div>
              <label className="flex items-center gap-2 text-[#475569]">
                <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} />
                <span>标记为临时演示/测试企业</span>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#475569]">支持多文件无截断解析：<code>.md .txt .csv .json .docx .xlsx</code>（PDF 暂未接通）</span>
                <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#1d4ed8] text-white font-medium">
                  <FileUp className="w-3.5 h-3.5" /> {parsing ? '解析中...' : '上传多个文件'}
                  <input type="file" multiple accept=".md,.txt,.csv,.json,.docx,.xlsx,.xls,.pdf" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
                <input value={matTitle} onChange={(e) => setMatTitle(e.target.value)} placeholder="或手动粘贴资料标题" className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                <textarea rows={3} value={matContent} onChange={(e) => setMatContent(e.target.value)} placeholder="粘贴企业资料全文（不做任何字符截断）..." className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                <button type="button" onClick={addManualMaterial} className="px-3 py-1 rounded bg-[#0f172a] text-white">加入待导入清单</button>
              </div>
              {materials.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-[#0f172a]">导入预览与分类映射 ({materials.length} 份，完整保留全文)</div>
                  {materials.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-[#f8fafc] border border-[#e2e8f0] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[#0f172a]">{m.title}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={m.category}
                            onChange={(e) =>
                              setMaterials((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, category: e.target.value as ImportedMat['category'] } : item))
                              )
                            }
                            className="px-2 py-0.5 rounded border border-[#e2e8f0] bg-white text-[11px]"
                          >
                            <option value="A_FACTS">A. 基本事实</option>
                            <option value="B_PRODUCTS">B. 产品服务</option>
                            <option value="C_BRAND">C. 品牌客群</option>
                            <option value="D_STRATEGIES">D. 案例策略</option>
                            <option value="E_EXPERIENCE">E. 运营经验</option>
                          </select>
                          <button onClick={() => setMaterials((prev) => prev.filter((_, i) => i !== idx))} className="text-[#94a3b8] hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#64748b]">
                        完整字数：{m.charCount} 字 · 识别章节：{m.sectionsCount} · 表格：{m.tablesCount} · 待核实线索：{m.detectedUnverified.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="p-2.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1d4ed8]" />
                <span>以下字段仅保留您输入的或规则解析提取的内容，未确认项保持留空（入库时标为待补充）。</span>
              </div>
              <input value={brandPositioning} onChange={(e) => setBrandPositioning(e.target.value)} placeholder="品牌定位（选填）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={brandStyle} onChange={(e) => setBrandStyle(e.target.value)} placeholder="品牌表达风格（如：真实克制、有文化感）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={audiencesText} onChange={(e) => setAudiencesText(e.target.value)} placeholder="目标客户群体（逗号分隔）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={advantages} onChange={(e) => setAdvantages(e.target.value)} placeholder="企业核心优势" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <input value={forbiddenText} onChange={(e) => setForbiddenText(e.target.value)} placeholder="宣传禁区与红线（逗号分隔）" className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2.5">
              <div className="font-semibold text-[#0f172a]">即将写入的结构化知识库确认</div>
              <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] space-y-1.5 text-[#475569]">
                <div><strong>企业基本事实 (A_FACTS)</strong>：{companyName || '[待补充]'} · {location || '[待补充]'} · {mainBusiness || '[待补充]'}</div>
                <div><strong>品牌规范 (C_BRAND)</strong>：{brandPositioning || '[待补充]'} / {brandStyle || '[待补充]'}</div>
                <div><strong>完整导入文档</strong>：{materials.length} 份（总计 {materials.reduce((s, m) => s + m.charCount, 0)} 字，零截断保留原貌）</div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="font-semibold text-[#0f172a]">录入企业产品档案（支持多产品，不预填演示图片）</div>
              <div className="p-3 rounded bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
                <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="产品名称" className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                <textarea rows={2} value={pSummary} onChange={(e) => setPSummary(e.target.value)} placeholder="产品核心卖点与适用人群..." className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="真实价格（未确认留空）" className="px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                  <input value={pAddress} onChange={(e) => setPAddress(e.target.value)} placeholder="使用地址/门店" className="px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                </div>
                <input value={pImg} onChange={(e) => setPImg(e.target.value)} placeholder="企业实拍图 URL（选填，留空则不自动挂载）" className="w-full px-2.5 py-1.5 rounded border border-[#e2e8f0] bg-white" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[#475569]">
                    <input type="checkbox" checked={pVerified} onChange={(e) => setPVerified(e.target.checked)} />
                    <span>已人工核实价格与规则</span>
                  </label>
                  <button type="button" onClick={addProductItem} className="px-3 py-1 rounded bg-[#0f172a] text-white inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" /> 添加到产品列表
                  </button>
                </div>
              </div>
              {products.length > 0 && (
                <div className="space-y-1">
                  {products.map((p, i) => (
                    <div key={i} className="px-3 py-2 rounded bg-[#eff6ff] border border-[#bfdbfe] flex justify-between items-center">
                      <span><strong>{p.name}</strong> · {p.priceInfo} ({p.verificationStatus === 'verified' ? '已核实' : '待核实'})</span>
                      <button onClick={() => setProducts((prev) => prev.filter((_, idx) => idx !== i))} className="text-[#64748b] hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <div className="font-semibold text-[#0f172a]">确认营销方向（可留空，后续在「营销方案」继续细化）</div>
              <textarea rows={3} value={direction} onChange={(e) => setDirection(e.target.value)} placeholder="例如：首月聚焦小红书攻略清单，建立收藏与有效咨询基线..." className="w-full px-3 py-2 rounded border border-[#e2e8f0]" />
              <div className="p-3 rounded bg-[#eff6ff] border border-[#bfdbfe] text-[#1e40af]">
                确认后将为您建立独立隔离的企业空间，所有导入资料完整入库，并自动创建专属营销 Agent（可随时通过顶部「导出备份」保存 JSON）。
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-between">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#e2e8f0] bg-white text-xs text-[#475569] disabled:opacity-40">
            <ChevronLeft className="w-3.5 h-3.5" /> 上一步
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="inline-flex items-center gap-1 px-4 py-1.5 rounded bg-[#1d4ed8] text-white text-xs font-medium">
              下一步 <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button type="button" disabled={submitting} onClick={handleFinish} className="inline-flex items-center gap-1 px-4 py-1.5 rounded bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium disabled:opacity-60">
              <Check className="w-3.5 h-3.5" /> {submitting ? '正在创建...' : '完成入驻并进入企业工作台'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
