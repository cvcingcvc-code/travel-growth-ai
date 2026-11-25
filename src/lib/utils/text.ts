import crypto from 'node:crypto';

export function tokenizeForSearch(text: string): string[] {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return [];

  const tokens = new Set<string>();
  // 英文单词/数字
  const latinMatches = normalized.match(/[a-z0-9_]+/g) || [];
  for (const m of latinMatches) tokens.add(m);

  // 中文按双字/三字切分 + 单字，便于本地检索召回
  const cjk = normalized.replace(/[^\u4e00-\u9fa5]/g, '');
  for (let i = 0; i < cjk.length; i++) {
    tokens.add(cjk[i]);
    if (i + 1 < cjk.length) tokens.add(cjk.slice(i, i + 2));
    if (i + 2 < cjk.length) tokens.add(cjk.slice(i, i + 3));
  }
  return Array.from(tokens);
}

const EMBED_DIM = 48;

export function computeDeterministicEmbedding(text: string): number[] {
  const tokens = tokenizeForSearch(text);
  const vec = new Array<number>(EMBED_DIM).fill(0);
  if (tokens.length === 0) return vec;

  for (const tok of tokens) {
    const hash = crypto.createHash('md5').update(tok).digest();
    const idx = hash[0] % EMBED_DIM;
    const sign = hash[1] % 2 === 0 ? 1 : -1;
    vec[idx] += sign * (tok.length > 1 ? 1.5 : 0.7);
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => Number((v / norm).toFixed(4)));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function wrapUntrustedInput(label: string, content: string): string {
  const sanitized = content.replace(/<\/?untrusted_data[^>]*>/gi, '');
  return `<untrusted_data source="${label}">\n${sanitized}\n</untrusted_data>`;
}

export function computeContentHash(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 16);
}
