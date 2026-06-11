import type PDFKit from 'pdfkit';
import PDFDocument from 'pdfkit';
import path from 'node:path';

const FONTS_DIR = path.join(process.cwd(), 'public', 'fonts', 'poppins');

export interface PdfDocOptions {
  title: string;
  author?: string;
  layout?: 'portrait' | 'landscape';
}

export function createReportPdfDocument(opts: PdfDocOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    layout: opts.layout || 'portrait',
    size: 'A4',
    margin: 40,
    bufferPages: true,
    info: { Title: opts.title, Author: opts.author || 'Kreativa ERP' },
  });

  doc.registerFont('Poppins', path.join(FONTS_DIR, 'Poppins-Regular.ttf'));
  doc.registerFont('Poppins-Bold', path.join(FONTS_DIR, 'Poppins-Bold.ttf'));
  doc.registerFont('Poppins-Italic', path.join(FONTS_DIR, 'Poppins-Italic.ttf'));
  doc.registerFont('Poppins-BoldItalic', path.join(FONTS_DIR, 'Poppins-BoldItalic.ttf'));

  doc.font('Poppins');

  return doc;
}

export function streamPdfResponse(
  requestUrl: string,
  filename: string,
  build: (doc: PDFKit.PDFDocument) => Promise<void>
): Response {
  const inline = new URL(requestUrl).searchParams.get('download') !== '1';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const doc = createReportPdfDocument({ title: filename.replace(/\.pdf$/i, '') });
      doc.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      doc.once('error', (err) => controller.error(err));
      doc.once('end', () => {
        try {
          controller.close();
        } catch {
          /* noop */
        }
      });
      try {
        await build(doc);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).flushPages();
        doc.end();
      } catch (e) {
        controller.error(e instanceof Error ? e : new Error(String(e)));
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
