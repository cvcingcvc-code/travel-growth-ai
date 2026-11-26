import fs from 'node:fs';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDbForTests } from '@/lib/db/client';
import { seedDatabaseIfEmpty } from '@/lib/db/seed';
import { parseUploadedDocument } from '@/lib/services/document-parser.service';
import { completeEnterpriseOnboarding } from '@/lib/services/onboarding.service';
import { listKnowledgeDocuments } from '@/lib/services/knowledge.service';
import { listAssets } from '@/lib/services/asset.service';

describe('TravelGrowth AI 2.1 — 无截断资料导入、多格式解析与隔离验收', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    resetDbForTests(':memory:');
    seedDatabaseIfEmpty(true);
  });

  it('无截断完整解析长 Markdown 文档（含章节、表格、待核实项识别）', async () => {
    const samplePath = 'c:\\Users\\lin\\Documents\\ChatGPT\\学习\\TravelGrowthAI-山海拾光文旅-Demo.md';
    const raw = fs.existsSync(samplePath)
      ? fs.readFileSync(samplePath)
      : Buffer.from(
          '# 山海拾光文旅\n\n## 一、已知事实\n- F01 景区门票与文创\n\n## 二、待核实\n| 编号 | 事项 |\n| --- | --- |\n| V01 | 价格待核实 |\n\n' +
            '长文档正文段落内容测试。'.repeat(600),
          'utf8'
        );

    const parsed = await parseUploadedDocument({
      fileName: 'TravelGrowthAI-山海拾光文旅-Demo.md',
      buffer: raw,
    });

    // 确认 100% 无截断保留原文
    expect(parsed.charCount).toBe(raw.toString('utf8').trim().length);
    expect(parsed.rawText.length).toBe(parsed.charCount);
    expect(parsed.sections.length).toBeGreaterThanOrEqual(2);
    expect(parsed.tablesCount).toBeGreaterThan(0);
    expect(parsed.detectedUnverified.length).toBeGreaterThan(0);
  });

  it('解析不同结构的 CSV 与 JSON 企业文件，并对未接通的 PDF 明确报错', async () => {
    const csvParsed = await parseUploadedDocument({
      fileName: 'products-catalog.csv',
      buffer: Buffer.from('产品名称,价格,状态\n古镇摇橹船票,¥88,已核实\n非遗油纸伞手作,待核实,待核实', 'utf8'),
    });
    expect(csvParsed.format).toBe('csv');
    expect(csvParsed.detectedUnverified.length).toBeGreaterThan(0);

    const jsonParsed = await parseUploadedDocument({
      fileName: 'external-ai-brief.json',
      buffer: Buffer.from(JSON.stringify({ companyName: '星野研学营地', brandPositioning: '自然博物研学' }), 'utf8'),
    });
    expect(jsonParsed.format).toBe('json');
    expect(jsonParsed.structuredJson?.companyName).toBe('星野研学营地');

    await expect(
      parseUploadedDocument({ fileName: 'brochure.pdf', buffer: Buffer.from('%PDF-1.4') })
    ).rejects.toThrow(/暂未接通 PDF/);
  });

  it('新企业入驻绝不注入演示企业默认图片/客群/方向，并完整保留长文档', () => {
    const longText = '企业完整运营手册。'.repeat(1200); // > 10,000 字
    const res = completeEnterpriseOnboarding({
      companyName: '澄湖文旅（纯净新企业）',
      industryType: 'scenic_spot',
      location: '江苏苏州',
      description: '湖畔慢生活体验区',
      isDemo: false,
      importedMaterials: [
        { title: '完整运营手册.md', content: longText, sourceType: 'markdown' },
      ],
      products: [
        { name: '湖畔骑行套票', summary: '含单车与茶饮', priceInfo: '¥98', verificationStatus: 'verified' },
        { name: '日落游船体验', summary: '傍晚游船', priceInfo: '待补充', verificationStatus: 'unverified' },
      ],
    });

    const docs = listKnowledgeDocuments(res.organizationId) as Array<{ title: string; content: string }>;
    const manual = docs.find((d) => d.title === '完整运营手册.md');
    expect(manual).toBeDefined();
    expect(manual!.content.length).toBe(longText.length);

    // 确认未注入演示企业的默认图片
    expect(listAssets(res.organizationId).length).toBe(0);
    expect(res.products.length).toBe(2);
  });
});
