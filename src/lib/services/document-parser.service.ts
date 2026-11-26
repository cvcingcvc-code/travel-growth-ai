import crypto from 'node:crypto';

export interface ParsedSection {
  heading: string;
  level: number;
  content: string;
}

export interface ParsedDocumentResult {
  fileName: string;
  format: 'markdown' | 'txt' | 'csv' | 'json' | 'docx' | 'xlsx';
  rawText: string;
  charCount: number;
  contentHash: string;
  sections: ParsedSection[];
  tablesCount: number;
  detectedFacts: string[];
  detectedProducts: string[];
  detectedUnverified: string[];
  detectedToneOrBrand: string[];
  structuredJson?: Record<string, unknown>;
  extractionMethod: 'rule_based_parser';
  capabilityNote: string;
}

function extractSectionsAndSignals(rawText: string) {
  const lines = rawText.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let currentHeading = '文档正文';
  let currentLevel = 1;
  let buf: string[] = [];
  let tablesCount = 0;
  let inTable = false;

  const detectedFacts: string[] = [];
  const detectedProducts: string[] = [];
  const detectedUnverified: string[] = [];
  const detectedToneOrBrand: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (buf.join('\n').trim()) {
        sections.push({ heading: currentHeading, level: currentLevel, content: buf.join('\n').trim() });
      }
      currentLevel = headingMatch[1].length;
      currentHeading = headingMatch[2].trim();
      buf = [];
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      if (!inTable) {
        tablesCount++;
        inTable = true;
      }
    } else {
      inTable = false;
    }

    const trimmed = line.trim();
    if (trimmed) {
      if (/(待核实|待补充|待确认|V0\d|未确认|待对接)/.test(trimmed) && detectedUnverified.length < 15) {
        detectedUnverified.push(trimmed.replace(/^[-*|\s]+/, '').slice(0, 140));
      } else if (/(门票|联票|文创|住宿|套票|研学|产品|SKU|服务|营地|体验)/.test(trimmed) && !trimmed.startsWith('#') && detectedProducts.length < 10) {
        detectedProducts.push(trimmed.replace(/^[-*|\s]+/, '').slice(0, 120));
      }
      if (/(调性|风格|定位|品牌|视觉|客群|目标用户)/.test(trimmed) && detectedToneOrBrand.length < 8) {
        detectedToneOrBrand.push(trimmed.replace(/^[-*|\s]+/, '').slice(0, 140));
      }
      if (/(F0\d|已知企业事实|位于|主营|成立|面向|所在地)/.test(trimmed) && detectedFacts.length < 10) {
        detectedFacts.push(trimmed.replace(/^[-*|\s]+/, '').slice(0, 140));
      }
    }

    buf.push(line);
  }

  if (buf.join('\n').trim()) {
    sections.push({ heading: currentHeading, level: currentLevel, content: buf.join('\n').trim() });
  }

  return {
    sections,
    tablesCount,
    detectedFacts,
    detectedProducts,
    detectedUnverified,
    detectedToneOrBrand,
  };
}

export async function parseUploadedDocument(params: {
  fileName: string;
  buffer: Buffer;
}): Promise<ParsedDocumentResult> {
  const ext = params.fileName.split('.').pop()?.toLowerCase() || 'txt';
  let rawText = '';
  let format: ParsedDocumentResult['format'] = 'txt';
  let structuredJson: Record<string, unknown> | undefined;

  if (ext === 'pdf') {
    throw new Error(
      '当前零成本版本暂未接通 PDF 复杂版式解析器（避免乱码或静默丢字）。请将 PDF 导出为 Markdown / TXT / DOCX / XLSX 后上传，或直接粘贴正文导入。'
    );
  }

  if (ext === 'docx') {
    format = 'docx';
    const mammoth = await import('mammoth');
    const res = await mammoth.extractRawText({ buffer: params.buffer });
    rawText = res.value || '';
  } else if (ext === 'xlsx' || ext === 'xls') {
    format = 'xlsx';
    const XLSX = await import('xlsx');
    const wb = XLSX.read(params.buffer, { type: 'buffer' });
    const sheetTexts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      sheetTexts.push(`## 工作表：${sheetName}\n${csv}`);
    }
    rawText = sheetTexts.join('\n\n');
  } else if (ext === 'json') {
    format = 'json';
    const text = params.buffer.toString('utf8');
    structuredJson = JSON.parse(text) as Record<string, unknown>;
    rawText = JSON.stringify(structuredJson, null, 2);
  } else if (ext === 'csv') {
    format = 'csv';
    rawText = params.buffer.toString('utf8');
  } else if (ext === 'md' || ext === 'markdown') {
    format = 'markdown';
    rawText = params.buffer.toString('utf8');
  } else if (ext === 'txt') {
    format = 'txt';
    rawText = params.buffer.toString('utf8');
  } else {
    throw new Error(`不支持的文件格式 (.${ext})，当前支持 Markdown (.md)、TXT、CSV、JSON、DOCX 与 XLSX。`);
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error(`文件「${params.fileName}」内容为空，无法解析。`);
  }

  const signals = extractSectionsAndSignals(trimmed);
  const contentHash = crypto.createHash('sha256').update(trimmed).digest('hex').slice(0, 16);

  return {
    fileName: params.fileName,
    format,
    rawText: trimmed,
    charCount: trimmed.length,
    contentHash,
    ...signals,
    structuredJson,
    extractionMethod: 'rule_based_parser',
    capabilityNote:
      '当前使用无截断开源规则解析器完整提取章节、表格与待核实项；未接入外部大模型时不会自动编造缺失字段，请人工核对后确认入库。',
  };
}
