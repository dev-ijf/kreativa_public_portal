import type PDFKit from 'pdfkit';

/* ═══════════════════════════════════════════════════════════════════════════════
 * Logo helpers (inlined from ERP receipt-pdf)
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function resolveLogoFetchUrl(requestUrl: string, logoUrl: string | null): string | null {
  if (!logoUrl || !logoUrl.trim()) return null;
  const u = logoUrl.trim();
  if (/^https?:\/\//i.test(u)) return u;
  try {
    const origin = new URL(requestUrl).origin;
    if (u.startsWith('/')) return `${origin}${u}`;
  } catch {
    /* ignore */
  }
  return null;
}

export async function fetchLogoBuffer(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Colors & Score helpers
 * ═══════════════════════════════════════════════════════════════════════════════ */

export const Color = {
  text: '#0f172a',
  muted: '#64748b',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  zebra: '#f8fafc',
  accent: '#2563eb',
  ok: '#059669',
  warn: '#d97706',
  err: '#dc2626',
  pu: '#7c3aed',
};

export function indicatorScoreColor(score: string | null | undefined): string {
  switch ((score || '').trim()) {
    case 'Exceeding':
    case 'Excellent':
      return Color.ok;
    case 'Secure':
    case 'Very Good':
      return Color.accent;
    case 'Developing':
    case 'Good':
      return Color.warn;
    case 'Emerging':
    case 'Improving':
      return Color.err;
    default:
      return Color.muted;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * School Header
 * ═══════════════════════════════════════════════════════════════════════════════ */

export async function drawSchoolHeader(
  doc: PDFKit.PDFDocument,
  opts: {
    requestUrl: string;
    schoolName: string;
    schoolLogoUrl: string | null;
    schoolAddress?: string | null;
    schoolTagline?: string | null;
    schoolPhone?: string | null;
    schoolEmail?: string | null;
    schoolWebsite?: string | null;
    titleLine1: string;
    titleLine2: string;
    titleLine3?: string | null;
  }
): Promise<number> {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const y = margin;

  const logoBuf = await fetchLogoBuffer(resolveLogoFetchUrl(opts.requestUrl, opts.schoolLogoUrl));
  const logoSize = 60;
  const logoGap = logoBuf ? logoSize + 12 : 0;

  if (logoBuf) {
    try {
      doc.image(logoBuf, margin, y, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
    } catch {
      /* invalid image */
    }
  }

  const periodBlockW = 140;
  const px = pageW - margin - periodBlockW;
  doc.font('Poppins').fontSize(8).fillColor(Color.muted);
  doc.text(opts.titleLine1, px, y, { width: periodBlockW, align: 'right' });
  doc.text(opts.titleLine2, px, y + 11, { width: periodBlockW, align: 'right' });
  if (opts.titleLine3) {
    doc.text(opts.titleLine3, px, y + 22, { width: periodBlockW, align: 'right' });
  }

  const nameBlockW = contentW - logoGap - periodBlockW - 8;
  const tx = margin + logoGap;
  let ty = y;

  doc.font('Poppins-Bold').fontSize(15).fillColor(Color.text);
  doc.text(opts.schoolName.toUpperCase(), tx, ty, { width: nameBlockW, align: 'left' });
  ty += doc.heightOfString(opts.schoolName.toUpperCase(), { width: nameBlockW }) + 1;

  if (opts.schoolTagline) {
    doc.font('Poppins-Bold').fontSize(9).fillColor(Color.muted);
    doc.text(opts.schoolTagline.toUpperCase(), tx, ty, { width: nameBlockW, align: 'left' });
    ty += 12;
  }

  if (opts.schoolAddress) {
    doc.font('Poppins').fontSize(7.5).fillColor(Color.muted);
    const addrOneLine = opts.schoolAddress.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
    doc.text(addrOneLine, tx, ty, { width: nameBlockW + periodBlockW, align: 'left', lineBreak: false });
    ty += 11;
  }

  const contactParts: string[] = [];
  if (opts.schoolPhone) contactParts.push(opts.schoolPhone);
  if (opts.schoolEmail) contactParts.push(opts.schoolEmail);
  if (opts.schoolWebsite) contactParts.push(opts.schoolWebsite);
  if (contactParts.length > 0) {
    doc.font('Poppins').fontSize(7).fillColor(Color.muted);
    doc.text(contactParts.join('   |   '), tx, ty, { width: nameBlockW + periodBlockW, align: 'left', lineBreak: false });
    ty += 11;
  }

  const headerBottom = Math.max(y + logoSize, ty) + 8;
  doc.moveTo(margin, headerBottom).lineTo(pageW - margin, headerBottom).strokeColor(Color.borderLight).lineWidth(0.7).stroke();
  return headerBottom + 10;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Student Info
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function drawStudentInfoPlain(
  doc: PDFKit.PDFDocument,
  y: number,
  rows: Array<{ label: string; value: string }>
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const colW = contentW / 2;
  const labelW = 90;
  const lineH = 18;
  const numRows = Math.ceil(rows.length / 2);

  for (let ri = 0; ri < numRows; ri++) {
    for (let ci = 0; ci < 2; ci++) {
      const idx = ri * 2 + ci;
      if (idx >= rows.length) break;
      const r = rows[idx];
      const cx = margin + ci * colW;
      const cy = y + ri * lineH;
      doc.font('Poppins').fontSize(10).fillColor(Color.text);
      doc.text(r.label, cx, cy, { width: labelW, continued: false, lineBreak: false });
      doc.font('Poppins').fontSize(10).fillColor(Color.text);
      doc.text(`: ${r.value || '—'}`, cx + labelW, cy, { width: colW - labelW - 8, lineBreak: false });
    }
  }

  return y + numRows * lineH + 12;
}

export function drawStudentInfo(
  doc: PDFKit.PDFDocument,
  y: number,
  rows: Array<{ label: string; value: string }>,
  cols = 2
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;

  const colW = contentW / cols;
  const labelH = 10;

  const cellHeights = rows.map((r) => {
    doc.font('Poppins-Bold').fontSize(10);
    const vh = doc.heightOfString(r.value || '—', { width: colW - 16 });
    return labelH + Math.max(vh, 14) + 8;
  });

  const numRows = Math.ceil(rows.length / cols);
  const rowHeights: number[] = [];
  for (let ri = 0; ri < numRows; ri++) {
    let maxH = 0;
    for (let ci = 0; ci < cols; ci++) {
      const idx = ri * cols + ci;
      if (idx < rows.length) maxH = Math.max(maxH, cellHeights[idx]);
    }
    rowHeights.push(maxH);
  }
  const totalH = rowHeights.reduce((a, b) => a + b, 0);

  doc.save();
  doc.rect(margin, y, contentW, totalH).strokeColor(Color.border).lineWidth(0.6).stroke();
  doc.restore();

  let ry = y;
  for (let ri = 0; ri < numRows; ri++) {
    const rh = rowHeights[ri];
    for (let ci = 0; ci < cols; ci++) {
      const idx = ri * cols + ci;
      if (idx >= rows.length) break;
      const cx = margin + ci * colW;
      const r = rows[idx];

      doc.save();
      if (ci < cols - 1) {
        doc.moveTo(cx + colW, ry).lineTo(cx + colW, ry + rh).strokeColor(Color.border).lineWidth(0.4).stroke();
      }
      if (ri < numRows - 1) {
        doc.moveTo(cx, ry + rh).lineTo(cx + colW, ry + rh).strokeColor(Color.border).lineWidth(0.4).stroke();
      }
      doc.restore();

      const pad = 8;
      doc.font('Poppins').fontSize(8).fillColor(Color.muted);
      doc.text(r.label + ' :', cx + pad, ry + 5, { width: colW - pad * 2, lineBreak: false });
      doc.font('Poppins-Bold').fontSize(10).fillColor(Color.text);
      doc.text(r.value || '—', cx + pad, ry + 5 + labelH, { width: colW - pad * 2 });
    }
    ry += rh;
  }

  return y + totalH + 10;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Theme/Unit Table
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function drawThemeUnitTable(
  doc: PDFKit.PDFDocument,
  y: number,
  themeUnits: Array<{ theme: string; unit: string }>
): number {
  if (!themeUnits.length) return y;

  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const themeW = contentW * 0.35;
  const unitW = contentW - themeW;
  const headerH = 20;
  const rowH = 18;

  doc.save();
  doc.rect(margin, y, contentW, headerH).fill('#1e293b');
  doc.restore();
  doc.font('Poppins-Bold').fontSize(8).fillColor('#ffffff');
  doc.text('THEME', margin + 8, y + 6, { width: themeW - 16 });
  doc.text('UNIT', margin + themeW + 8, y + 6, { width: unitW - 16 });
  y += headerH;

  let lastTheme = '';
  const resolved = themeUnits.map((tu) => {
    if (tu.theme) lastTheme = tu.theme;
    return { theme: lastTheme, unit: tu.unit };
  });

  const startDataY = y;
  let prevTheme = '';
  let themeStartY = y;

  resolved.forEach((tu, idx) => {
    const isNewTheme = tu.theme !== prevTheme;
    if (isNewTheme) {
      themeStartY = y;
      prevTheme = tu.theme;
    }
    if (idx % 2 === 1) {
      doc.save();
      doc.rect(margin, y, contentW, rowH).fill(Color.zebra);
      doc.restore();
    }
    doc.font('Poppins').fontSize(9).fillColor(Color.text);
    doc.text(tu.unit || '—', margin + themeW + 8, y + 4, { width: unitW - 16 });
    y += rowH;

    const isLastOfTheme =
      idx === resolved.length - 1 || resolved[idx + 1].theme !== tu.theme;
    if (isLastOfTheme) {
      const blockH = y - themeStartY;
      const themeTextY = themeStartY + (blockH - 12) / 2;
      doc.font('Poppins-Bold').fontSize(9).fillColor(Color.text);
      doc.text(tu.theme, margin + 8, themeTextY, { width: themeW - 16 });
    }
  });

  doc.rect(margin, startDataY - headerH, contentW, y - (startDataY - headerH))
    .strokeColor(Color.border).lineWidth(0.5).stroke();
  doc.moveTo(margin + themeW, startDataY - headerH)
    .lineTo(margin + themeW, y)
    .strokeColor(Color.border).lineWidth(0.4).stroke();

  return y + 10;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Footer
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function drawFooter(doc: PDFKit.PDFDocument): void {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;
  const range = d.bufferedPageRange();
  const totalPages = range.count;

  for (let i = 0; i < totalPages; i++) {
    d.switchToPage(range.start + i);
    doc.font('Poppins').fontSize(7).fillColor(Color.muted);
    const footerY = doc.page.height - margin - 14;
    doc.text(
      `Page ${i + 1} of ${totalPages}`,
      margin,
      footerY,
      { width: contentW / 2, align: 'left' }
    );
    doc.text(
      `Generated by Kreativa ERP`,
      margin + contentW / 2,
      footerY,
      { width: contentW / 2, align: 'right' }
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Table
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function drawTable(
  doc: PDFKit.PDFDocument,
  startY: number,
  headers: Array<{ label: string; align?: 'left' | 'center' | 'right' }>,
  widths: number[],
  rows: Array<Array<{ text: string; color?: string; bold?: boolean; align?: 'left' | 'center' | 'right' }>>,
  opts: {
    groupHeaders?: Array<{ rowIdx: number; label: string }>;
    subgroupHeaders?: Array<{ rowIdx: number; label: string }>;
  } = {}
): number {
  const margin = 40;
  let y = startY;
  const headerH = 22;

  doc.save();
  doc.rect(margin, y, widths.reduce((a, b) => a + b, 0), headerH).fill('#1e293b');
  doc.restore();
  let x = margin;
  for (let i = 0; i < headers.length; i++) {
    doc.font('Poppins-Bold').fontSize(8).fillColor('#ffffff');
    doc.text(headers[i].label.toUpperCase(), x + 6, y + 7, {
      width: widths[i] - 12,
      align: headers[i].align || 'left',
    });
    x += widths[i];
  }
  y += headerH;

  for (let r = 0; r < rows.length; r++) {
    const grp = opts.groupHeaders?.find((g) => g.rowIdx === r);
    if (grp) {
      if (y + 18 > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      doc.save();
      doc.rect(margin, y, widths.reduce((a, b) => a + b, 0), 18).fill('#cbd5e1');
      doc.restore();
      doc.font('Poppins-Bold').fontSize(9).fillColor(Color.text);
      doc.text(grp.label, margin + 8, y + 4, { width: widths.reduce((a, b) => a + b, 0) - 16 });
      y += 18;
    }
    const sub = opts.subgroupHeaders?.find((g) => g.rowIdx === r);
    if (sub) {
      if (y + 16 > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      doc.save();
      doc.rect(margin, y, widths.reduce((a, b) => a + b, 0), 16).fill('#f1f5f9');
      doc.restore();
      doc.font('Poppins-Bold').fontSize(8).fillColor(Color.muted);
      doc.text(sub.label, margin + 16, y + 4, { width: widths.reduce((a, b) => a + b, 0) - 24 });
      y += 16;
    }

    const cellHeights = rows[r].map((cell, i) => {
      doc.font(cell.bold ? 'Poppins-Bold' : 'Poppins').fontSize(9);
      return doc.heightOfString(cell.text || ' ', { width: widths[i] - 12 });
    });
    const dynRowH = Math.max(...cellHeights) + 10;

    if (y + dynRowH > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }

    if (r % 2 === 1) {
      doc.save();
      doc.rect(margin, y, widths.reduce((a, b) => a + b, 0), dynRowH).fill(Color.zebra);
      doc.restore();
    }
    let cx = margin;
    for (let i = 0; i < rows[r].length; i++) {
      const cell = rows[r][i];
      doc
        .font(cell.bold ? 'Poppins-Bold' : 'Poppins')
        .fontSize(9)
        .fillColor(cell.color || Color.text);
      doc.text(cell.text, cx + 6, y + 5, {
        width: widths[i] - 12,
        align: cell.align || 'left',
      });
      cx += widths[i];
    }
    y += dynRowH;
  }

  doc
    .rect(margin, startY, widths.reduce((a, b) => a + b, 0), y - startY)
    .strokeColor(Color.border)
    .lineWidth(0.5)
    .stroke();
  return y + 10;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Section, Text, Narratives
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function drawSectionHeading(
  doc: PDFKit.PDFDocument,
  y: number,
  title: string
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  doc.font('Poppins-Bold').fontSize(11).fillColor(Color.text);
  doc.text(title, margin, y, { width: contentW });
  return y + 18;
}

export function drawTextBlock(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  text: string | null
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  doc.font('Poppins-Bold').fontSize(8).fillColor(Color.muted);
  doc.text(label.toUpperCase(), margin, y, { width: contentW });
  doc.font('Poppins').fontSize(9).fillColor(Color.text);
  const value = (text && text.trim()) || '—';
  doc.text(value, margin, y + 11, { width: contentW, align: 'left' });
  const h = doc.heightOfString(value, { width: contentW });
  return y + 11 + h + 6;
}

export function drawBoxedNarrative(
  doc: PDFKit.PDFDocument,
  y: number,
  title: string,
  text: string | null
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const pad = 10;
  const value = (text && text.trim()) || '—';

  doc.font('Poppins').fontSize(9.5);
  const textH = doc.heightOfString(value, { width: contentW - pad * 2, align: 'justify' });
  const titleH = 18;
  const boxH = titleH + textH + pad * 2;

  if (y + boxH > doc.page.height - 60) {
    doc.addPage();
    y = margin;
  }

  doc.save();
  doc.rect(margin, y, contentW, boxH).strokeColor(Color.border).lineWidth(0.8).stroke();
  doc.restore();

  doc.font('Poppins-Bold').fontSize(10).fillColor(Color.text);
  doc.text(title, margin + pad, y + pad, { width: contentW - pad * 2, align: 'center' });

  doc.font('Poppins').fontSize(9.5).fillColor(Color.text);
  doc.text(value, margin + pad, y + pad + titleH, {
    width: contentW - pad * 2,
    align: 'justify',
  });

  return y + boxH + 10;
}

export function formatReportDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function drawProgressHeader(
  doc: PDFKit.PDFDocument,
  opts: { titleLine1: string; titleLine2: string; date?: string | null; startY?: number }
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  let y = opts.startY ?? margin;
  doc.font('Poppins-Bold').fontSize(14).fillColor(Color.text);
  doc.text(opts.titleLine1, margin, y, { width: contentW, align: 'center' });
  y += 18;
  doc.font('Poppins').fontSize(11).fillColor(Color.text);
  doc.text(opts.titleLine2, margin, y, { width: contentW, align: 'center' });
  y += 16;
  if (opts.date) {
    doc.font('Poppins').fontSize(9).fillColor(Color.muted);
    doc.text(opts.date, margin, y, { width: contentW, align: 'center' });
    y += 14;
  }
  doc.moveTo(margin, y).lineTo(pageW - margin, y).strokeColor(Color.borderLight).lineWidth(0.6).stroke();
  return y + 12;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * Attendance & Signatures
 * ═══════════════════════════════════════════════════════════════════════════════ */

export function drawAttendanceInline(
  doc: PDFKit.PDFDocument,
  y: number,
  items: Array<{ label: string; value: string }>
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  doc.font('Poppins').fontSize(10).fillColor(Color.text);
  const parts = items.map((it) => `${it.label} : ${it.value}`).join('     ');
  doc.text(parts, margin, y, { width: contentW, align: 'left' });
  const h = doc.heightOfString(parts, { width: contentW });
  return y + h + 8;
}

export function drawSignaturesGrid(
  doc: PDFKit.PDFDocument,
  y: number,
  cells: Array<{ label: string; name?: string }>
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const colW = contentW / cells.length;

  doc.font('Poppins-Bold').fontSize(9).fillColor(Color.text);
  for (let i = 0; i < cells.length; i++) {
    const cx = margin + i * colW;
    doc.text(cells[i].label, cx, y, { width: colW, align: 'center' });
  }

  const lineY = y + 60;
  doc.strokeColor(Color.text).lineWidth(0.5);
  for (let i = 0; i < cells.length; i++) {
    const cx = margin + i * colW + colW / 2;
    doc.moveTo(cx - 60, lineY).lineTo(cx + 60, lineY).stroke();
  }

  doc.font('Poppins').fontSize(8).fillColor(Color.muted);
  for (let i = 0; i < cells.length; i++) {
    const cx = margin + i * colW;
    if (cells[i].name) {
      doc.text(cells[i].name as string, cx, lineY + 4, { width: colW, align: 'center' });
    }
  }
  return lineY + 22;
}

export function drawSignaturesGrid2x2(
  doc: PDFKit.PDFDocument,
  y: number,
  cells: Array<{ label: string; name?: string }>
): number {
  const margin = 40;
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const cols = 2;
  const colW = contentW / cols;
  const rowH = 100;
  const numRows = Math.ceil(cells.length / cols);
  const totalH = numRows * rowH;

  doc.save();
  doc.rect(margin, y, contentW, totalH).strokeColor(Color.border).lineWidth(0.8).stroke();

  for (let ci = 1; ci < cols; ci++) {
    doc.moveTo(margin + ci * colW, y).lineTo(margin + ci * colW, y + totalH).stroke();
  }
  for (let ri = 1; ri < numRows; ri++) {
    doc.moveTo(margin, y + ri * rowH).lineTo(margin + contentW, y + ri * rowH).stroke();
  }
  doc.restore();

  for (let i = 0; i < cells.length; i++) {
    const ri = Math.floor(i / cols);
    const ci = i % cols;
    const cx = margin + ci * colW;
    const cy = y + ri * rowH;

    doc.font('Poppins-Bold').fontSize(9).fillColor(Color.text);
    doc.text(cells[i].label, cx + 10, cy + 8, { width: colW - 20, align: 'center' });

    const lineYPos = cy + rowH - 26;
    doc.strokeColor(Color.text).lineWidth(0.5);
    doc.moveTo(cx + 20, lineYPos).lineTo(cx + colW - 20, lineYPos).stroke();

    if (cells[i].name) {
      doc.font('Poppins-Bold').fontSize(9).fillColor(Color.text);
      doc.text(cells[i].name as string, cx + 10, lineYPos + 5, { width: colW - 20, align: 'center' });
    }
  }

  return y + totalH + 12;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * KG Summary Page helpers
 * ═══════════════════════════════════════════════════════════════════════════════ */

export const ScoreLevel = {
  emerging: { color: '#94a3b8', label: 'Emerging', desc: 'Just beginning to show this skill' },
  developing: { color: '#a78bfa', label: 'Developing', desc: 'Growing — normal & expected!' },
  secure: { color: '#7c3aed', label: 'Secure', desc: 'Meets expectations for their age' },
  exceeding: { color: '#1e1b4b', label: 'Exceeding', desc: 'Going above & beyond' },
} as const;

export function drawProgressBar(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  counts: { emerging: number; developing: number; secure: number; exceeding: number }
): void {
  const total = counts.emerging + counts.developing + counts.secure + counts.exceeding;
  if (total === 0) return;

  const colors = [ScoreLevel.emerging.color, ScoreLevel.developing.color, ScoreLevel.secure.color, ScoreLevel.exceeding.color];
  const values = [counts.emerging, counts.developing, counts.secure, counts.exceeding];
  const radius = height / 2;

  let cx = x;
  for (let i = 0; i < 4; i++) {
    const segW = (values[i] / total) * width;
    if (segW <= 0) continue;

    doc.save();
    if (i === 0 && values.slice(0, i).every((v) => v === 0)) {
      doc.roundedRect(cx, y, segW, height, radius).fill(colors[i]);
    } else if (i === 3 || values.slice(i + 1).every((v) => v === 0)) {
      doc.roundedRect(cx, y, segW, height, radius).fill(colors[i]);
    } else {
      doc.rect(cx, y, segW, height).fill(colors[i]);
    }
    doc.restore();
    cx += segW;
  }

  doc.save();
  doc.roundedRect(x, y, width, height, radius).strokeColor(Color.borderLight).lineWidth(0.3).stroke();
  doc.restore();
}

export function drawScoreBadge(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  label: string,
  bgColor: string
): number {
  doc.font('Poppins-Bold').fontSize(8);
  const textW = doc.widthOfString(label);
  const padH = 10;
  const padV = 4;
  const badgeW = textW + padH * 2;
  const badgeH = 16;
  const radius = badgeH / 2;

  doc.save();
  doc.roundedRect(x, y, badgeW, badgeH, radius).fill(bgColor);
  doc.restore();
  doc.font('Poppins-Bold').fontSize(8).fillColor('#ffffff');
  doc.text(label, x + padH, y + padV, { width: textW + 2, lineBreak: false });

  return badgeW;
}

export function drawCircleStat(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  radius: number,
  mainText: string,
  subText: string
): void {
  const cx = x + radius;
  const cy = y + radius;

  doc.save();
  doc.circle(cx, cy, radius).strokeColor(Color.pu).lineWidth(3).stroke();
  doc.restore();

  doc.font('Poppins-Bold').fontSize(18).fillColor(Color.pu);
  const mainW = doc.widthOfString(mainText);
  doc.text(mainText, cx - mainW / 2, cy - 12, { lineBreak: false });

  doc.font('Poppins').fontSize(8).fillColor(Color.muted);
  const subW = doc.widthOfString(subText);
  doc.text(subText, cx - subW / 2, cy + 8, { lineBreak: false });
}

export function drawRoundedCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  opts?: { borderColor?: string; lineWidth?: number; radius?: number; fill?: string }
): void {
  const r = opts?.radius ?? 8;
  doc.save();
  if (opts?.fill) {
    doc.roundedRect(x, y, w, h, r).fill(opts.fill);
  }
  doc.roundedRect(x, y, w, h, r)
    .strokeColor(opts?.borderColor || Color.borderLight)
    .lineWidth(opts?.lineWidth ?? 0.8)
    .stroke();
  doc.restore();
}

export function drawDotLabel(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  dotColor: string,
  label: string
): number {
  const dotR = 3;
  doc.save();
  doc.circle(x + dotR, y + dotR + 1, dotR).fill(dotColor);
  doc.restore();
  doc.font('Poppins').fontSize(7.5).fillColor(Color.text);
  doc.text(label, x + dotR * 2 + 4, y, { lineBreak: false });
  const w = dotR * 2 + 4 + doc.widthOfString(label) + 8;
  return w;
}

export function drawPillOutline(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  text: string,
  opts?: { borderColor?: string; textColor?: string; fontSize?: number; bold?: boolean }
): number {
  const fontSize = opts?.fontSize ?? 8;
  doc.font(opts?.bold ? 'Poppins-Bold' : 'Poppins').fontSize(fontSize);
  const textW = doc.widthOfString(text);
  const padH = 10;
  const padV = 4;
  const pillW = textW + padH * 2;
  const pillH = fontSize + padV * 2 + 2;
  const radius = pillH / 2;

  doc.save();
  doc.roundedRect(x, y, pillW, pillH, radius)
    .strokeColor(opts?.borderColor || Color.border)
    .lineWidth(0.7)
    .stroke();
  doc.restore();

  doc.font(opts?.bold ? 'Poppins-Bold' : 'Poppins').fontSize(fontSize).fillColor(opts?.textColor || Color.text);
  doc.text(text, x + padH, y + padV + 1, { width: textW + 2, lineBreak: false });

  return pillW;
}
