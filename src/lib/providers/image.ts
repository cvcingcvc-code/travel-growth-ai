import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../db/client';
import { newId, requireOrgAccess } from '../db/tenant';
import { getProviderStatuses, recordModelRun } from './registry';
import { createAsset } from '../services/asset.service';
import { ProviderUnconfiguredError } from './types';

export interface ImageGenerationRequest {
  organizationId: string;
  prompt: string;
  style?: string;
  aspectRatio?: '3:4' | '1:1' | '16:9' | '9:16';
  projectId?: string;
  slidePage?: number;
  productId?: string;
}

function mapAspectToOpenAISize(ratio?: string): '1024x1792' | '1024x1024' | '1792x1024' {
  if (ratio === '16:9') return '1792x1024';
  if (ratio === '1:1') return '1024x1024';
  return '1024x1792';
}

export async function generateOrRejectRealImage(req: ImageGenerationRequest) {
  requireOrgAccess(req.organizationId);
  const started = Date.now();
  const statuses = getProviderStatuses(req.organizationId);
  const imgStatus = statuses.find((s) => s.capability === 'image')!;

  const finalPrompt = `${req.prompt.trim()}${req.style ? ` | 风格要求：${req.style}` : ''} | 比例：${req.aspectRatio || '3:4'}`;

  if (!imgStatus.hasValidKey) {
    recordModelRun({
      organizationId: req.organizationId,
      capability: 'image',
      provider: imgStatus.provider,
      modelName: imgStatus.modelName,
      taskType: 'image_generation',
      status: 'unconfigured',
      durationMs: Date.now() - started,
      errorMessage: '未配置图片生成模型 API Key，禁止用 SVG/程序图冒充真实生图',
    });

    throw new ProviderUnconfiguredError(
      `图片生成模型未配置 (${imgStatus.provider} / ${imgStatus.modelName})`,
      `请配置 OPENAI_API_KEY 启用真实文生图，或复制下方生图提示词在外部生图工具生成后上传关联：\n${finalPrompt}`
    );
  }

  const endpointBase = imgStatus.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.OPENAI_API_KEY;
  const res = await fetch(`${endpointBase.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: imgStatus.modelName || 'dall-e-3',
      prompt: finalPrompt,
      n: 1,
      size: mapAspectToOpenAISize(req.aspectRatio),
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    recordModelRun({
      organizationId: req.organizationId,
      capability: 'image',
      provider: imgStatus.provider,
      modelName: imgStatus.modelName,
      taskType: 'image_generation',
      status: 'error',
      durationMs: Date.now() - started,
      errorMessage: `HTTP ${res.status}: ${errText.slice(0, 180)}`,
    });
    throw new Error(`真实生图接口调用失败 (HTTP ${res.status}): ${errText.slice(0, 180)}`);
  }

  const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const item = data.data?.[0];
  let savedUrl = item?.url || '';

  if (item?.b64_json) {
    const fileName = `gen_${newId('img')}.png`;
    if (process.env.VERCEL !== '1') {
      const outDir = path.resolve(process.cwd(), 'public', 'demo-assets');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, fileName), Buffer.from(item.b64_json, 'base64'));
      savedUrl = `/demo-assets/${fileName}`;
    } else {
      savedUrl = `data:image/png;base64,${item.b64_json}`;
    }
  }

  const asset = createAsset({
    organizationId: req.organizationId,
    title: `AI 生图 · ${req.prompt.slice(0, 24)}`,
    category: 'ai_concept',
    fileUrl: savedUrl,
    mimeType: 'image/png',
    sourceOrigin: `${imgStatus.provider}/${imgStatus.modelName} 真实生成（创意概念图）`,
    copyrightStatus: 'ai_generated_concept',
    isAiGenerated: true,
  });

  if (req.projectId) {
    attachImageToProjectSlide(req.organizationId, req.projectId, req.slidePage ?? 1, savedUrl);
  }

  recordModelRun({
    organizationId: req.organizationId,
    capability: 'image',
    provider: imgStatus.provider,
    modelName: imgStatus.modelName,
    taskType: 'image_generation',
    status: 'success',
    durationMs: Date.now() - started,
  });

  return { asset, imageUrl: savedUrl, prompt: finalPrompt, model: `${imgStatus.provider}/${imgStatus.modelName}` };
}

export function attachImageToProjectSlide(
  organizationId: string,
  projectId: string,
  slidePage: number,
  imageUrl: string
) {
  requireOrgAccess(organizationId);
  const db = getDb();
  const ver = db
    .prepare(
      'SELECT id, carousel_plan_json FROM content_versions WHERE project_id = ? AND organization_id = ? ORDER BY version_number DESC LIMIT 1'
    )
    .get(projectId, organizationId) as { id: string; carousel_plan_json: string } | undefined;

  if (!ver) return false;
  const slides = JSON.parse(ver.carousel_plan_json || '[]') as Array<Record<string, unknown>>;
  const idx = Math.max(0, slidePage - 1);
  if (slides[idx]) {
    slides[idx].imageUrl = imageUrl;
    db.prepare('UPDATE content_versions SET carousel_plan_json = ? WHERE id = ? AND organization_id = ?').run(
      JSON.stringify(slides),
      ver.id,
      organizationId
    );
    return true;
  }
  return false;
}
