import { NextRequest } from 'next/server';
import { handleApiError, ok } from '@/lib/api/http';
import { parseUploadedDocument } from '@/lib/services/document-parser.service';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || !(file instanceof File)) {
        throw new Error('请选择要上传的文件');
      }
      const arrayBuf = await file.arrayBuffer();
      const parsed = await parseUploadedDocument({
        fileName: file.name,
        buffer: Buffer.from(arrayBuf),
      });
      return ok(parsed);
    }

    const body = (await req.json()) as { fileName?: string; content?: string };
    const parsed = await parseUploadedDocument({
      fileName: body.fileName || 'manual-input.md',
      buffer: Buffer.from(String(body.content || ''), 'utf8'),
    });
    return ok(parsed);
  } catch (err) {
    return handleApiError(err);
  }
}
