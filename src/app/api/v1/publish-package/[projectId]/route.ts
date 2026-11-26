import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { ensureBootstrapped, getOrgIdFromRequest, handleApiError } from '@/lib/api/http';
import { listContentProjects } from '@/lib/services/creation.service';
import { buildZipBuffer, type ZipEntry } from '@/lib/utils/zip';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    ensureBootstrapped();
    const { projectId } = await context.params;
    const orgId = getOrgIdFromRequest(req);
    const project = listContentProjects(orgId).find((p) => p.id === projectId);
    if (!project || !project.versions[0]) {
      return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '未找到对应内容项目' } }, { status: 404 });
    }

    const v = project.versions[0];
    const tags: string[] = JSON.parse(String(v.hashtags_json || '[]'));
    const slides: Array<{ page: number; title: string; visual: string; copy: string; imageUrl?: string }> =
      JSON.parse(String(v.carousel_plan_json || '[]'));

    const copyTxt = [
      `平台：${project.target_platform}`,
      `审核状态：${project.review_status}`,
      `主标题：${v.selected_title}`,
      '',
      '=== 发布正文 ===',
      v.body_copy,
      '',
      `话题标签：${tags.join(' ')}`,
      `转化引导：${String(v.conversion_cta || '')}`,
      '',
      '=== 多页图文分镜 ===',
      ...slides.map((s) => `P${s.page} ${s.title}\n画面：${s.visual}\n文案：${s.copy}\n`),
    ].join('\n');

    const entries: ZipEntry[] = [
      { name: 'copy.txt', data: Buffer.from(copyTxt, 'utf8') },
      {
        name: 'metadata.json',
        data: Buffer.from(
          JSON.stringify(
            {
              projectId: project.id,
              organizationId: orgId,
              platform: project.target_platform,
              reviewStatus: project.review_status,
              version: v.version_number,
              title: v.selected_title,
              tags,
              exportedAt: new Date().toISOString(),
            },
            null,
            2
          ),
          'utf8'
        ),
      },
    ];

    const publicDir = path.resolve(process.cwd(), 'public');
    for (const s of slides) {
      if (s.imageUrl && s.imageUrl.startsWith('/demo-assets/')) {
        const safeRel = s.imageUrl.replace(/^\/+/, '');
        const fullPath = path.resolve(publicDir, safeRel);
        if (fullPath.startsWith(publicDir) && fs.existsSync(fullPath)) {
          const ext = path.extname(fullPath) || '.jpg';
          entries.push({
            name: `images/page-${s.page}${ext}`,
            data: fs.readFileSync(fullPath),
          });
        }
      }
    }

    const zipBuf = buildZipBuffer(entries);
    return new NextResponse(new Uint8Array(zipBuf), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="publish-package-${project.id}.zip"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
