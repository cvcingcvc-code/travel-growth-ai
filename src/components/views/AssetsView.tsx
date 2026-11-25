'use client';

import React, { useEffect, useState } from 'react';
import { Package, Image as ImageIcon, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  summary: string;
  price_info: string;
  address: string;
  opening_hours: string;
  verification_status: string;
  is_demo: number;
}

interface Asset {
  id: string;
  title: string;
  category: string;
  file_url: string;
  source_origin: string;
  copyright_status: string;
  is_ai_generated: number;
  is_demo: number;
  created_at: string;
}

export function AssetsView({ orgId }: { orgId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Product form
  const [pName, setPName] = useState('');
  const [pSummary, setPSummary] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pVerified, setPVerified] = useState(false);

  // Asset form
  const [aTitle, setATitle] = useState('');
  const [aCat, setACat] = useState<'real_scenic' | 'product_photo' | 'poster' | 'ai_concept'>('real_scenic');
  const [aUrl, setAUrl] = useState('/demo-assets/bamboo-courtyard.svg');
  const [aSource, setASource] = useState('企业实景拍摄');
  const [aIsAi, setAIsAi] = useState(false);
  const [notice, setNotice] = useState('');

  async function loadAll() {
    const [pRes, aRes] = await Promise.all([
      fetch('/api/v1/products', { headers: { 'x-organization-id': orgId } }),
      fetch('/api/v1/assets', { headers: { 'x-organization-id': orgId } }),
    ]);
    const pJson = await pRes.json();
    const aJson = await aRes.json();
    if (pJson.ok) setProducts(pJson.data);
    if (aJson.ok) setAssets(aJson.data);
  }

  useEffect(() => {
    loadAll();
  }, [orgId]);

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    const res = await fetch('/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        name: pName,
        summary: pSummary,
        priceInfo: pPrice || '待核实',
        address: pAddress || '待核实',
        verificationStatus: pVerified ? 'verified' : 'unverified',
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setPName('');
      setPSummary('');
      setPPrice('');
      setPAddress('');
      setNotice('文旅产品已录入！');
      await loadAll();
    }
  }

  async function handleCreateAsset(e: React.FormEvent) {
    e.preventDefault();
    setNotice('');
    const res = await fetch('/api/v1/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({
        title: aTitle,
        category: aCat,
        fileUrl: aUrl,
        sourceOrigin: aSource,
        copyrightStatus: aIsAi ? 'ai_generated_concept' : 'owned',
        isAiGenerated: aIsAi,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setATitle('');
      setNotice('素材已登记入库！');
      await loadAll();
    } else {
      setNotice(`合规拦截：${json.error?.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#183a30]">企业产品与素材管理中心</h1>
        <p className="text-xs text-[#53605a] mt-0.5">
          统一管理当前企业的文旅产品事实与版权素材；AI 概念图严禁标记为真实景区实景照片。
        </p>
      </div>

      {notice && <div className="p-3 rounded bg-[#ebe6da] text-xs text-[#183a30]">{notice}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 产品录入与列表 */}
        <div className="space-y-4">
          <form onSubmit={handleCreateProduct} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#4c7364]" /> 录入文旅产品 / 服务
            </h2>
            <input
              required
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              placeholder="产品名称（如：云海观景套房 / 古镇夜游联票）*"
              className="w-full px-3 py-2 text-sm rounded border border-[#dfd9cb] bg-white"
            />
            <textarea
              rows={2}
              value={pSummary}
              onChange={(e) => setPSummary(e.target.value)}
              placeholder="核心卖点与体验说明..."
              className="w-full px-3 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={pPrice}
                onChange={(e) => setPPrice(e.target.value)}
                placeholder="价格说明（未确认留空）"
                className="px-3 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              />
              <input
                value={pAddress}
                onChange={(e) => setPAddress(e.target.value)}
                placeholder="地址/集合点"
                className="px-3 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[#53605a]">
              <input type="checkbox" checked={pVerified} onChange={(e) => setPVerified(e.target.checked)} />
              <span>已核实价格、地址与营业时间</span>
            </label>
            <button type="submit" className="w-full py-2 rounded bg-[#183a30] text-white text-sm font-medium">
              保存产品
            </button>
          </form>

          <div className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-2.5">
            <h3 className="text-sm font-semibold text-[#183a30]">企业产品列表 ({products.length})</h3>
            {products.length === 0 ? (
              <div className="text-xs text-[#7c8781] py-4 text-center">暂无产品，请在上方录入。</div>
            ) : (
              products.map((p) => (
                <div key={p.id} className="p-3 rounded bg-[#f5f2eb] border border-[#e5dfd2] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1a2420]">{p.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.verification_status === 'verified' ? 'bg-[#e3ede8] text-[#183a30]' : 'bg-[#f4e5e1] text-[#b05b43]'}`}>
                      {p.verification_status === 'verified' ? '已核实' : '待核实'}
                    </span>
                  </div>
                  <div className="text-[#53605a]">{p.summary}</div>
                  <div className="text-[11px] text-[#7c8781]">价格：{p.price_info} · 地址：{p.address}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 素材登记与展示 */}
        <div className="space-y-4">
          <form onSubmit={handleCreateAsset} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded p-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#183a30] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#4c7364]" /> 登记品牌与实景素材
            </h2>
            <input
              required
              value={aTitle}
              onChange={(e) => setATitle(e.target.value)}
              placeholder="素材名称 *"
              className="w-full px-3 py-2 text-sm rounded border border-[#dfd9cb] bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={aCat}
                onChange={(e) => setACat(e.target.value as typeof aCat)}
                className="px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              >
                <option value="real_scenic">景区/民宿实景照片</option>
                <option value="product_photo">产品实拍图</option>
                <option value="poster">品牌海报</option>
                <option value="ai_concept">AI 概念图（非实景）</option>
              </select>
              <input
                value={aSource}
                onChange={(e) => setASource(e.target.value)}
                placeholder="来源与版权说明"
                className="px-2.5 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
              />
            </div>
            <input
              value={aUrl}
              onChange={(e) => setAUrl(e.target.value)}
              placeholder="图片路径或 URL"
              className="w-full px-3 py-2 text-xs rounded border border-[#dfd9cb] bg-white"
            />
            <label className="flex items-center gap-2 text-xs text-[#53605a]">
              <input type="checkbox" checked={aIsAi} onChange={(e) => setAIsAi(e.target.checked)} />
              <span>此素材由 AI 生成（系统将禁止标记为真实景区照片）</span>
            </label>
            <button type="submit" className="w-full py-2 rounded bg-[#183a30] text-white text-sm font-medium">
              登记素材
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assets.map((a) => (
              <div key={a.id} className="bg-[#fcfbf8] border border-[#dfd9cb] rounded overflow-hidden">
                <div className="h-36 bg-[#ebe6da] flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.file_url} alt={a.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 text-xs space-y-1">
                  <div className="font-medium text-[#1a2420] line-clamp-1">{a.title}</div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#7c8781]">{a.source_origin}</span>
                    {a.is_ai_generated ? (
                      <span className="text-[#b05b43] inline-flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> AI概念图
                      </span>
                    ) : (
                      <span className="text-[#183a30] inline-flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> {a.copyright_status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
