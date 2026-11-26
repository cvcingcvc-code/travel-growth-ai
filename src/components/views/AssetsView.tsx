'use client';

import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  Check,
  Download,
  Eye,
  MoreHorizontal,
  Package,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { NavTab } from '../AppShell';

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
  tags_json?: string;
  product_id?: string | null;
  is_favorite?: number;
  is_ai_generated: number;
  is_demo: number;
  created_at: string;
}

const FILTER_TABS = [
  { id: 'ALL', label: '全部素材' },
  { id: 'FAVORITE', label: '已收藏' },
  { id: 'reference_material', label: '参考素材' },
  { id: 'ai_concept', label: 'AI 概念图' },
  { id: 'real_scenic', label: '企业实拍' },
  { id: 'product_photo', label: '产品图' },
];

export function AssetsView({
  orgId,
  onNavigate,
}: {
  orgId: string;
  onNavigate?: (tab: NavTab, itemId?: string) => void;
}) {
  const [section, setSection] = useState<'gallery' | 'products'>('gallery');
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [creatingPlatform, setCreatingPlatform] = useState<string | null>(null);

  // 上传弹窗状态
  const [showUpload, setShowUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [upCat, setUpCat] = useState<'reference_material' | 'real_scenic' | 'product_photo' | 'ai_concept'>('reference_material');
  const [upTags, setUpTags] = useState('住宿, 自然风光');
  const [upSource, setUpSource] = useState('参考素材');
  const [upProductId, setUpProductId] = useState('');
  const [upIsAi, setUpIsAi] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 高清预览 & 编辑弹窗状态
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // 产品新增表单（收纳在「产品档案管理」子视图）
  const [pName, setPName] = useState('');
  const [pSummary, setPSummary] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pVerified, setPVerified] = useState(false);

  async function loadAll() {
    const [pRes, aRes] = await Promise.all([
      fetch('/api/v1/products', { headers: { 'x-organization-id': orgId } }),
      fetch(`/api/v1/assets?category=${filter}`, { headers: { 'x-organization-id': orgId } }),
    ]);
    const pJson = await pRes.json();
    const aJson = await aRes.json();
    if (pJson.ok) setProducts(pJson.data);
    if (aJson.ok) setAssets(aJson.data);
  }

  useEffect(() => {
    setSelectedIds([]);
    loadAll();
  }, [orgId, filter]);

  function openPreview(a: Asset) {
    setPreviewAsset(a);
    setEditTitle(a.title);
    const tags: string[] = JSON.parse(a.tags_json || '[]');
    setEditTags(tags.join(' · '));
    setEditProductId(a.product_id || '');
    setOpenMenuId(null);
  }

  async function toggleFavorite(a: Asset, e?: React.MouseEvent) {
    e?.stopPropagation();
    const nextFav = !Boolean(a.is_favorite);
    await fetch('/api/v1/assets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
      body: JSON.stringify({ assetId: a.id, isFavorite: nextFav }),
    });
    if (previewAsset?.id === a.id) {
      setPreviewAsset({ ...previewAsset, is_favorite: nextFav ? 1 : 0 });
    }
    await loadAll();
  }

  async function handleSavePreviewEdit() {
    if (!previewAsset) return;
    setSavingEdit(true);
    try {
      const tags = editTags.split(/[,，、·\s]+/).map((t) => t.trim()).filter(Boolean);
      const res = await fetch('/api/v1/assets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({
          assetId: previewAsset.id,
          title: editTitle,
          tags,
          productId: editProductId || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setPreviewAsset(json.data);
        setNotice('素材标签、名称与关联产品已保存。');
        await loadAll();
      }
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteAsset(assetId: string) {
    await fetch(`/api/v1/assets?id=${assetId}`, {
      method: 'DELETE',
      headers: { 'x-organization-id': orgId },
    });
    if (previewAsset?.id === assetId) setPreviewAsset(null);
    setSelectedIds((prev) => prev.filter((id) => id !== assetId));
    setOpenMenuId(null);
    setNotice('素材已移除。');
    await loadAll();
  }

  async function handleBatchUpload(e: React.FormEvent) {
    e.preventDefault();
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setNotice('');
    try {
      const fd = new FormData();
      fd.append('organizationId', orgId);
      fd.append('category', upIsAi ? 'ai_concept' : upCat);
      fd.append('tags', upTags);
      fd.append('sourceOrigin', upIsAi ? 'AI 概念图' : upSource);
      fd.append('isAiGenerated', String(upIsAi));
      if (upProductId) fd.append('productId', upProductId);
      for (const f of uploadFiles) fd.append('files', f);

      const res = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: { 'x-organization-id': orgId },
        body: fd,
      });
      const json = await res.json();
      if (json.ok) {
        setUploadFiles([]);
        setShowUpload(false);
        setNotice(`成功批量上传 ${json.data.uploaded} 张素材！`);
        await loadAll();
      } else {
        setNotice(`上传失败：${json.error?.message}`);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleOneClickCreate(targetAssets: Asset[], platform: 'xiaohongshu' | 'wechat' | 'douyin') {
    if (targetAssets.length === 0) return;
    setCreatingPlatform(platform);
    setNotice('');
    try {
      const titles = targetAssets.map((a) => a.title).join(' × ');
      const linkedProductId = targetAssets.find((a) => a.product_id)?.product_id || products[0]?.id;
      const platformLabel = platform === 'xiaohongshu' ? '小红书图文' : platform === 'wechat' ? '微信公众号推文' : '短视频脚本与封面';

      const res = await fetch('/api/v1/creations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
        body: JSON.stringify({
          action: 'generate',
          productId: linkedProductId,
          topic: `${titles}｜${platformLabel}营销方案`,
          targetPlatform: platform,
          marketingGoal: '结合品牌素材实现高收藏与咨询转化',
          visualRequirements: `优先引用已选素材：${titles}`,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || '生成失败');

      // 将选中的素材图片挂载到生成项目对应页
      const projId = json.data.id;
      for (let i = 0; i < Math.min(targetAssets.length, 4); i++) {
        await fetch('/api/v1/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-organization-id': orgId },
          body: JSON.stringify({
            action: 'attach_external',
            title: targetAssets[i].title,
            imageUrl: targetAssets[i].file_url,
            projectId: projId,
            slidePage: i + 1,
            isAiGenerated: Boolean(targetAssets[i].is_ai_generated),
          }),
        });
      }

      setNotice(`已基于 ${targetAssets.length} 张素材生成「${platformLabel}」并挂载配图，正在前往内容生产...`);
      setPreviewAsset(null);
      if (onNavigate) onNavigate('creation', projId);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '一键创作失败');
    } finally {
      setCreatingPlatform(null);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
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
    if (res.ok) {
      setPName('');
      setPSummary('');
      setPPrice('');
      setPAddress('');
      setNotice('产品档案已保存。');
      await loadAll();
    }
  }

  const visibleAssets = assets.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.tags_json || '').toLowerCase().includes(q) ||
      a.source_origin.toLowerCase().includes(q)
    );
  });

  const selectedAssets = assets.filter((a) => selectedIds.includes(a.id));

  return (
    <div className="space-y-6">
      {/* 顶部标题与模式切换（视觉素材库为主，产品管理为独立标签） */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#0f172a]">品牌素材库与产品资产</h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            图片优先的视觉资产中心：支持 4:3 画廊浏览、收藏、高清预览、批量拖拽上传与选中素材一键多平台创作。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#f1f5f9] p-1 text-xs">
            <button
              onClick={() => setSection('gallery')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${section === 'gallery' ? 'bg-white text-[#1d4ed8] shadow-xs' : 'text-[#475569]'}`}
            >
              品牌素材库 ({assets.length})
            </button>
            <button
              onClick={() => setSection('products')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${section === 'products' ? 'bg-white text-[#1d4ed8] shadow-xs' : 'text-[#475569]'}`}
            >
              产品档案 ({products.length})
            </button>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-xs"
          >
            <UploadCloud className="w-4 h-4" /> 上传素材
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af] flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-[#1d4ed8] hover:underline">关闭</button>
        </div>
      )}

      {/* 品牌素材库（Pinterest / Canva 大尺寸 4:3 画廊） */}
      {section === 'gallery' && (
        <div className="space-y-5">
          {/* 筛选与搜索条 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5 text-xs">
              {FILTER_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                    filter === t.id
                      ? 'bg-[#1d4ed8] text-white'
                      : 'bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#cbd5e1]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索素材名称、标签或来源..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-[#e2e8f0] bg-white focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          {/* 选中素材批量一键创作工具条 */}
          {selectedAssets.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#0f172a] text-white flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#1d4ed8] font-semibold">已选 {selectedAssets.length} 张素材</span>
                <span className="text-slate-300 hidden sm:inline">可直接基于所选视觉素材生成营销内容</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={Boolean(creatingPlatform)}
                  onClick={() => handleOneClickCreate(selectedAssets, 'xiaohongshu')}
                  className="px-3 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#2563eb] font-medium inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {creatingPlatform === 'xiaohongshu' ? '生成中...' : '一键生成小红书'}
                </button>
                <button
                  disabled={Boolean(creatingPlatform)}
                  onClick={() => handleOneClickCreate(selectedAssets, 'wechat')}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 font-medium"
                >
                  {creatingPlatform === 'wechat' ? '生成中...' : '生成公众号推文'}
                </button>
                <button
                  disabled={Boolean(creatingPlatform)}
                  onClick={() => handleOneClickCreate(selectedAssets, 'douyin')}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 font-medium"
                >
                  {creatingPlatform === 'douyin' ? '生成中...' : '生成短视频脚本'}
                </button>
                <button onClick={() => setSelectedIds([])} className="px-2 py-1.5 text-slate-300 hover:text-white">
                  取消选择
                </button>
              </div>
            </div>
          )}

          {/* 空状态（新创建的真实企业保持纯净空白，绝不混入演示素材） */}
          {visibleAssets.length === 0 ? (
            <div className="bg-white border border-dashed border-[#cbd5e1] rounded-2xl py-16 px-6 text-center space-y-3">
              <UploadCloud className="w-10 h-10 text-[#94a3b8] mx-auto" />
              <div className="text-sm font-semibold text-[#0f172a]">当前企业素材库为空</div>
              <p className="text-xs text-[#64748b] max-w-md mx-auto">
                为保证企业数据纯净隔离，新建企业不会自动混入演示素材。点击下方按钮拖拽上传您的实拍图、海报或产品素材。
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="px-4 py-2 rounded-lg bg-[#1d4ed8] text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" /> 拖拽上传首批素材
              </button>
            </div>
          ) : (
            /* 严格对齐参考图：大尺寸 4:3 三列起（宽屏自适应四列/五列）轻边框圆角卡片 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {visibleAssets.map((a) => {
                const tags: string[] = JSON.parse(a.tags_json || '[]');
                const isSelected = selectedIds.includes(a.id);
                const isFav = Boolean(a.is_favorite);
                const sourceLabel = a.is_ai_generated
                  ? 'AI 概念图'
                  : a.category === 'reference_material' || a.copyright_status === 'reference_only'
                  ? '参考素材'
                  : a.source_origin || '企业实拍';

                return (
                  <div
                    key={a.id}
                    className={`group bg-white rounded-2xl overflow-hidden border transition-all duration-200 flex flex-col ${
                      isSelected
                        ? 'border-[#1d4ed8] ring-2 ring-[#bfdbfe] shadow-md'
                        : 'border-[#e2e8f0] hover:border-[#cbd5e1] hover:shadow-lg'
                    }`}
                  >
                    {/* 4:3 图片区 + 悬停浮层操作 */}
                    <div
                      onClick={() => openPreview(a)}
                      className="relative aspect-[4/3] bg-[#f1f5f9] overflow-hidden cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.file_url}
                        alt={a.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />

                      {/* 左上角多选勾选框 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds((prev) =>
                            prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                          );
                        }}
                        aria-label="选择素材"
                        className={`absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white opacity-100'
                            : 'bg-white/90 border-slate-300 text-transparent opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      {/* 右上角深色毛玻璃胶囊（下载 + 收藏，复刻参考图视觉） */}
                      <div
                        className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/70 backdrop-blur-md text-white transition-opacity ${
                          isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <a
                          href={a.file_url}
                          download
                          onClick={(e) => e.stopPropagation()}
                          title="下载原图"
                          className="p-1 rounded-full hover:bg-white/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(a, e)}
                          title={isFav ? '取消收藏' : '收藏素材'}
                          className="p-1 rounded-full hover:bg-white/20"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      </div>

                      {/* 底部悬停快捷按钮：预览 + 一键创作 */}
                      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(a);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[#0f172a] text-[11px] font-medium inline-flex items-center gap-1 shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> 预览
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOneClickCreate([a], 'xiaohongshu');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-[11px] font-medium inline-flex items-center gap-1 shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> 一键创作
                        </button>
                      </div>
                    </div>

                    {/* 图片下方留白元信息区（名称 / 分类标签 / 来源 + 更多操作） */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <h3
                          onClick={() => openPreview(a)}
                          className="text-[15px] font-semibold text-[#0f172a] truncate cursor-pointer hover:text-[#1d4ed8]"
                        >
                          {a.title}
                        </h3>
                        <div className="text-xs text-[#64748b] mt-1 truncate">
                          {tags.length > 0 ? tags.join(' · ') : a.category}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 relative">
                        <span className="text-xs text-[#64748b]">{sourceLabel}</span>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)}
                          aria-label="更多操作"
                          className="p-1 rounded-md text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {openMenuId === a.id && (
                          <div className="absolute right-0 bottom-8 w-40 bg-white border border-[#e2e8f0] rounded-xl shadow-lg py-1.5 z-30 text-xs">
                            <button onClick={() => openPreview(a)} className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#0f172a]">
                              高清预览与编辑
                            </button>
                            <button onClick={() => handleOneClickCreate([a], 'xiaohongshu')} className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#1d4ed8]">
                              一键生成小红书
                            </button>
                            <button onClick={() => handleOneClickCreate([a], 'wechat')} className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#0f172a]">
                              一键生成公众号
                            </button>
                            <button onClick={() => handleOneClickCreate([a], 'douyin')} className="w-full text-left px-3 py-1.5 hover:bg-[#f8fafc] text-[#0f172a]">
                              一键生成短视频
                            </button>
                            <button onClick={() => handleDeleteAsset(a.id)} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600">
                              删除素材
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 产品档案管理子视图（保留全部原有产品录入与展示能力） */}
      {section === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          <form onSubmit={handleCreateProduct} className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3 h-fit">
            <h2 className="text-sm font-semibold text-[#0f172a] flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#1d4ed8]" /> 新增企业产品档案
            </h2>
            <input required value={pName} onChange={(e) => setPName(e.target.value)} placeholder="产品名称 *" className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0]" />
            <textarea rows={3} value={pSummary} onChange={(e) => setPSummary(e.target.value)} placeholder="核心卖点与体验说明..." className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0]" />
            <div className="grid grid-cols-2 gap-2">
              <input value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="真实价格（未确认留空）" className="px-3 py-2 rounded-lg border border-[#e2e8f0]" />
              <input value={pAddress} onChange={(e) => setPAddress(e.target.value)} placeholder="使用地址/门店" className="px-3 py-2 rounded-lg border border-[#e2e8f0]" />
            </div>
            <label className="flex items-center gap-2 text-[#475569]">
              <input type="checkbox" checked={pVerified} onChange={(e) => setPVerified(e.target.checked)} />
              <span>已人工核实价格与地址</span>
            </label>
            <button type="submit" className="w-full py-2 rounded-lg bg-[#1d4ed8] text-white font-medium">保存产品档案</button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            {products.length === 0 ? (
              <div className="md:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-10 text-center text-[#94a3b8]">暂无产品档案，请在左侧录入。</div>
            ) : (
              products.map((p) => (
                <div key={p.id} className="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-[#0f172a]">{p.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.verification_status === 'verified' ? '已核实' : '待核实'}
                    </span>
                  </div>
                  <div className="text-[#475569] leading-relaxed">{p.summary || '暂无简介'}</div>
                  <div className="text-[11px] text-[#64748b] pt-1 border-t border-[#f1f5f9]">
                    价格：{p.price_info} · 地址：{p.address}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 批量拖拽上传弹窗 */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <form
            onSubmit={handleBatchUpload}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#e2e8f0] rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">上传品牌与营销素材</h2>
                <p className="text-[11px] text-[#64748b] mt-0.5">支持批量拖拽 JPG / PNG / WebP 图片，自动归属当前企业</p>
              </div>
              <button type="button" onClick={() => setShowUpload(false)} className="text-[#64748b] hover:text-[#0f172a]"><X className="w-4 h-4" /></button>
            </div>

            {/* 拖拽区 */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
                if (dropped.length > 0) setUploadFiles((prev) => [...prev, ...dropped]);
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragActive ? 'border-[#1d4ed8] bg-[#eff6ff]' : 'border-[#cbd5e1] bg-[#f8fafc]'
              }`}
            >
              <UploadCloud className="w-8 h-8 text-[#1d4ed8] mx-auto mb-2" />
              <div className="font-medium text-[#0f172a]">拖拽多张图片到此处，或点击下方选择文件</div>
              <label className="mt-3 inline-block cursor-pointer px-3.5 py-1.5 rounded-lg bg-white border border-[#e2e8f0] hover:bg-[#f1f5f9] font-medium text-[#1d4ed8]">
                选择本地图片
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || []);
                    if (picked.length > 0) setUploadFiles((prev) => [...prev, ...picked]);
                  }}
                />
              </label>
              {uploadFiles.length > 0 && (
                <div className="mt-3 text-[11px] text-emerald-700 font-medium">
                  已选 {uploadFiles.length} 张：{uploadFiles.map((f) => f.name).join('、')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#475569] mb-1">素材分类</label>
                <select value={upCat} onChange={(e) => setUpCat(e.target.value as typeof upCat)} className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white">
                  <option value="reference_material">参考素材</option>
                  <option value="real_scenic">企业实拍</option>
                  <option value="product_photo">产品展示</option>
                  <option value="ai_concept">AI 概念图</option>
                </select>
              </div>
              <div>
                <label className="block text-[#475569] mb-1">关联产品（选填）</label>
                <select value={upProductId} onChange={(e) => setUpProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white">
                  <option value="">暂不关联</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input value={upTags} onChange={(e) => setUpTags(e.target.value)} placeholder="标签（逗号分隔）" className="px-3 py-2 rounded-lg border border-[#e2e8f0]" />
              <input value={upSource} onChange={(e) => setUpSource(e.target.value)} placeholder="来源说明（如：参考素材）" className="px-3 py-2 rounded-lg border border-[#e2e8f0]" />
            </div>

            <label className="flex items-center gap-2 text-[#475569]">
              <input type="checkbox" checked={upIsAi} onChange={(e) => setUpIsAi(e.target.checked)} />
              <span>标记为 AI 概念图（严禁冒充真实景区实拍）</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-[#475569]">取消</button>
              <button type="submit" disabled={uploading || uploadFiles.length === 0} className="px-5 py-2 rounded-lg bg-[#1d4ed8] text-white font-medium disabled:opacity-50">
                {uploading ? '上传中...' : `确认上传 (${uploadFiles.length})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 高清预览、标签编辑、产品关联与一键创作弹窗 */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 flex items-center justify-center p-4" onClick={() => setPreviewAsset(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl overflow-hidden w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 shadow-2xl max-h-[90vh]"
          >
            {/* 左侧高清大图 */}
            <div className="lg:col-span-7 bg-[#0f172a] flex items-center justify-center p-4 min-h-[280px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewAsset.file_url} alt={previewAsset.title} className="max-h-[75vh] w-auto object-contain rounded-lg" />
            </div>

            {/* 右侧编辑与一键创作面板 */}
            <div className="lg:col-span-5 p-5 flex flex-col justify-between space-y-4 overflow-y-auto text-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
                  <span className="font-semibold text-sm text-[#0f172a]">素材详情与编辑</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleFavorite(previewAsset)} className="p-1.5 rounded-lg border border-[#e2e8f0] hover:bg-[#f8fafc]" title="收藏">
                      <Bookmark className={`w-4 h-4 ${previewAsset.is_favorite ? 'fill-amber-400 text-amber-500' : 'text-[#64748b]'}`} />
                    </button>
                    <a href={previewAsset.file_url} download className="p-1.5 rounded-lg border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#475569]" title="下载原图">
                      <Download className="w-4 h-4" />
                    </a>
                    <button onClick={() => setPreviewAsset(null)} className="p-1.5 rounded-lg text-[#64748b] hover:bg-[#f1f5f9]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[#475569] mb-1 font-medium">素材名称</label>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0]" />
                  </div>
                  <div>
                    <label className="block text-[#475569] mb-1 font-medium">分类标签（用 · 或逗号分隔）</label>
                    <input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="如：住宿 · 自然风光" className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0]" />
                  </div>
                  <div>
                    <label className="block text-[#475569] mb-1 font-medium">关联企业产品</label>
                    <select value={editProductId} onChange={(e) => setEditProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white">
                      <option value="">暂不关联产品</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[11px] text-[#64748b]">
                    来源标记：<strong>{previewAsset.source_origin}</strong> · 版权状态：{previewAsset.copyright_status}
                  </div>
                  <button
                    onClick={handleSavePreviewEdit}
                    disabled={savingEdit}
                    className="w-full py-2 rounded-lg bg-[#0f172a] hover:bg-slate-800 text-white font-medium"
                  >
                    {savingEdit ? '保存中...' : '保存修改'}
                  </button>
                </div>

                {/* 一键多平台创作 */}
                <div className="pt-3 border-t border-[#e2e8f0] space-y-2">
                  <div className="font-semibold text-[#0f172a]">使用此素材一键生成营销内容</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleOneClickCreate([previewAsset], 'xiaohongshu')} className="py-2 rounded-lg bg-[#1d4ed8] text-white font-medium">
                      小红书
                    </button>
                    <button onClick={() => handleOneClickCreate([previewAsset], 'wechat')} className="py-2 rounded-lg bg-[#eff6ff] text-[#1d4ed8] font-medium border border-[#bfdbfe]">
                      公众号
                    </button>
                    <button onClick={() => handleOneClickCreate([previewAsset], 'douyin')} className="py-2 rounded-lg bg-[#f8fafc] text-[#0f172a] font-medium border border-[#e2e8f0]">
                      短视频
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteAsset(previewAsset.id)}
                className="w-full py-1.5 rounded-lg text-red-600 hover:bg-red-50 inline-flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> 删除此素材
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
