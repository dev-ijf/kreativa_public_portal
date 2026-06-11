import type PDFKit from 'pdfkit';
import type { TermReportFull } from './queries';
import {
  Color,
  ScoreLevel,
  drawSchoolHeader,
  drawStudentInfo,
  drawStudentInfoPlain,
  drawThemeUnitTable,
  drawAttendanceInline,
  drawTable,
  drawSignaturesGrid,
  drawSignaturesGrid2x2,
  drawSectionHeading,
  drawTextBlock,
  drawBoxedNarrative,
  drawFooter,
  formatReportDate,
  drawProgressBar,
  drawScoreBadge,
  drawCircleStat,
  drawRoundedCard,
  drawDotLabel,
  drawPillOutline,
} from './pdf-layout';
import { isKgLevelName } from './grading';

const margin = 40;

function newPage(doc: PDFKit.PDFDocument): number {
  doc.addPage();
  return margin;
}

function ensureRoom(doc: PDFKit.PDFDocument, y: number, need: number): number {
  if (y + need > doc.page.height - 60) return newPage(doc);
  return y;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * KG Summary / "Learning Areas at a Glance" page
 * ═══════════════════════════════════════════════════════════════════════════════ */

type AreaSummary = {
  name: string;
  total: number;
  counts: { emerging: number; developing: number; secure: number; exceeding: number };
  overallLevel: string;
};

function aggregateAreaSummaries(data: TermReportFull): AreaSummary[] {
  const map = new Map<string, AreaSummary>();
  for (const ind of data.indicators) {
    const name = ind.area_name || 'Unknown';
    if (!map.has(name)) {
      map.set(name, { name, total: 0, counts: { emerging: 0, developing: 0, secure: 0, exceeding: 0 }, overallLevel: 'Secure' });
    }
    const entry = map.get(name)!;
    entry.total++;
    const s = (ind.score || '').toLowerCase().trim();
    if (s === 'emerging' || s === 'improving') entry.counts.emerging++;
    else if (s === 'developing' || s === 'good') entry.counts.developing++;
    else if (s === 'secure' || s === 'very good') entry.counts.secure++;
    else if (s === 'exceeding' || s === 'excellent') entry.counts.exceeding++;
  }
  for (const entry of map.values()) {
    const { counts } = entry;
    let maxCount = 0;
    let maxLevel = 'Secure';
    if (counts.exceeding > maxCount) { maxCount = counts.exceeding; maxLevel = 'Exceeding'; }
    if (counts.secure > maxCount) { maxCount = counts.secure; maxLevel = 'Secure'; }
    if (counts.developing > maxCount) { maxCount = counts.developing; maxLevel = 'Developing'; }
    if (counts.emerging > maxCount) { maxCount = counts.emerging; maxLevel = 'Emerging'; }
    entry.overallLevel = maxLevel;
  }
  return Array.from(map.values());
}

function scoreLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'emerging': return ScoreLevel.emerging.color;
    case 'developing': return ScoreLevel.developing.color;
    case 'secure': return ScoreLevel.secure.color;
    case 'exceeding': return ScoreLevel.exceeding.color;
    default: return ScoreLevel.secure.color;
  }
}

async function drawKgSummaryPage(
  doc: PDFKit.PDFDocument,
  data: TermReportFull,
  requestUrl: string
): Promise<void> {
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  const semester = Math.ceil(data.context.term_number / 2);
  const isKg = isKgLevelName(data.context.level_name);

  // ── School header (same as other pages)
  let y = await drawSchoolHeader(doc, {
    requestUrl,
    schoolName: data.context.school_name || 'Kreativa Global School',
    schoolLogoUrl: data.context.school_logo_url,
    schoolAddress: data.context.school_address,
    schoolTagline: data.context.school_tagline,
    schoolPhone: data.context.school_phone,
    schoolEmail: data.context.school_email,
    schoolWebsite: data.context.school_website,
    titleLine1: `Progress Report ${data.context.academic_year_name}`,
    titleLine2: `${data.context.term_name} · Semester ${semester}`,
    titleLine3: formatReportDate(data.card.report_date),
  });

  // ── 1. Student header with photo placeholder, name, and badges
  const photoRadius = 35;
  const photoCx = margin + photoRadius;
  const photoCy = y + photoRadius;

  // Gray circle placeholder
  doc.save();
  doc.circle(photoCx, photoCy, photoRadius).fill('#e2e8f0');
  doc.restore();
  doc.font('Poppins').fontSize(7).fillColor(Color.muted);
  doc.text('Student', photoCx - 18, photoCy - 6, { width: 36, align: 'center' });
  doc.text('Photo', photoCx - 18, photoCy + 3, { width: 36, align: 'center' });

  // Name area (to the right of photo)
  const nameX = margin + photoRadius * 2 + 16;
  const nameW = contentW - photoRadius * 2 - 16;
  doc.font('Poppins').fontSize(9).fillColor(Color.muted);
  doc.text('LEARNING PROGRESS FOR', nameX, y + 4, { width: nameW });
  doc.font('Poppins-Bold').fontSize(18).fillColor(Color.text);
  doc.text(data.context.student_name, nameX, y + 18, { width: nameW });
  const nameH = doc.heightOfString(data.context.student_name, { width: nameW });

  // Badges row
  const badgeY = y + 18 + nameH + 8;
  let bx = nameX;
  const gap = 8;

  bx += drawPillOutline(doc, bx, badgeY, data.context.class_name) + gap;
  if (data.context.level_fase) {
    bx += drawPillOutline(doc, bx, badgeY, `${data.context.level_fase} Phase`) + gap;
  }
  bx += drawPillOutline(doc, bx, badgeY, `A.Y. ${data.context.academic_year_name}`) + gap;
  if (data.theme_units.length > 0) {
    const themeLabel = `Theme: ${data.theme_units[0].theme}`;
    drawPillOutline(doc, bx, badgeY, themeLabel, { borderColor: Color.err, textColor: Color.err });
  }

  y = Math.max(photoCy + photoRadius, badgeY + 22) + 16;

  // ── 2. "How to Read This Report" legend card
  const legendCardH = 80;
  drawRoundedCard(doc, margin, y, contentW, legendCardH, { fill: '#fafbfd' });

  const legendPad = 14;
  doc.font('Poppins-Bold').fontSize(9).fillColor(Color.muted);
  doc.text('HOW TO READ THIS REPORT', margin + legendPad, y + legendPad, { width: contentW - legendPad * 2 });

  // Gradient-style bar
  const barY = y + legendPad + 16;
  const barW = contentW - legendPad * 2;
  const barH = 8;
  const segW = barW / 4;
  const barColors = [ScoreLevel.emerging.color, ScoreLevel.developing.color, ScoreLevel.secure.color, ScoreLevel.exceeding.color];
  for (let i = 0; i < 4; i++) {
    doc.save();
    doc.rect(margin + legendPad + i * segW, barY, segW, barH).fill(barColors[i]);
    doc.restore();
  }

  // Labels below bar
  const labelY = barY + barH + 8;
  const legendLabels = isKg
    ? [ScoreLevel.emerging, ScoreLevel.developing, ScoreLevel.secure, ScoreLevel.exceeding]
    : [
        { ...ScoreLevel.emerging, label: 'Improving', desc: 'Needs more practice & support' },
        { ...ScoreLevel.developing, label: 'Good', desc: 'Meeting some expectations' },
        { ...ScoreLevel.secure, label: 'Very Good', desc: 'Consistently meeting expectations' },
        { ...ScoreLevel.exceeding, label: 'Excellent', desc: 'Exceeding expectations' },
      ];
  for (let i = 0; i < 4; i++) {
    const lx = margin + legendPad + i * segW;
    doc.save();
    doc.circle(lx + 4, labelY + 4, 4).fill(barColors[i]);
    doc.restore();
    doc.font('Poppins-Bold').fontSize(8).fillColor(Color.text);
    doc.text(legendLabels[i].label, lx + 12, labelY, { width: segW - 16, lineBreak: false });
    doc.font('Poppins').fontSize(6.5).fillColor(Color.muted);
    doc.text(legendLabels[i].desc, lx + 12, labelY + 11, { width: segW - 16 });
  }

  y += legendCardH + 16;

  // ── 3. "Learning Areas at a Glance" section
  doc.font('Poppins-Bold').fontSize(10).fillColor(Color.text);
  doc.text('LEARNING AREAS AT A GLANCE', margin, y, { width: contentW });
  y += 18;

  const areas = aggregateAreaSummaries(data);
  const cols = 2;
  const cardGap = 10;
  const cardW = (contentW - cardGap) / cols;
  const cardH = 90;

  const drawHeaderOnNewPage = async () => {
    doc.addPage();
    const hy = await drawSchoolHeader(doc, {
      requestUrl,
      schoolName: data.context.school_name || 'Kreativa Global School',
      schoolLogoUrl: data.context.school_logo_url,
      schoolAddress: data.context.school_address,
      schoolTagline: data.context.school_tagline,
      schoolPhone: data.context.school_phone,
      schoolEmail: data.context.school_email,
      schoolWebsite: data.context.school_website,
      titleLine1: `Progress Report ${data.context.academic_year_name}`,
      titleLine2: `${data.context.term_name} · Semester ${semester}`,
      titleLine3: formatReportDate(data.card.report_date),
    });
    return hy;
  };

  let cardStartY = y;
  for (let i = 0; i < areas.length; i++) {
    const col = i % cols;
    if (col === 0 && i > 0) {
      cardStartY += cardH + cardGap;
    }
    // Page break check at start of each new row
    if (col === 0 && cardStartY + cardH > doc.page.height - 110) {
      cardStartY = await drawHeaderOnNewPage();
    }
    const cx = margin + col * (cardW + cardGap);
    drawAreaCard(doc, cx, cardStartY, cardW, cardH, areas[i], isKg);
  }
  y = cardStartY + cardH + cardGap;

  // ── 4. Bottom row: Attendance + Full Indicator Report
  if (y + 110 > doc.page.height - 60) {
    y = await drawHeaderOnNewPage();
  }
  const bottomCardH = 95;
  const attCardW = contentW * 0.38;
  const reportCardW = contentW - attCardW - cardGap;

  // Attendance card
  drawRoundedCard(doc, margin, y, attCardW, bottomCardH);
  const total = Number(data.card.total_school_days || 0);
  const present = Number(data.card.days_present || 0);
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  drawCircleStat(doc, margin + 12, y + 12, 28, String(present), `/${total} days`);

  const attTextX = margin + 80;
  doc.font('Poppins-Bold').fontSize(8).fillColor(Color.pu);
  doc.text('ATTENDANCE', attTextX, y + 10, { width: attCardW - 90 });
  doc.font('Poppins-Bold').fontSize(14).fillColor(Color.text);
  doc.text(`${pct}% present`, attTextX, y + 22, { width: attCardW - 90 });
  doc.font('Poppins').fontSize(8).fillColor(Color.muted);
  doc.text(`Sick: ${data.card.days_sick ?? 0} days`, attTextX, y + 44, { width: attCardW - 90 });
  doc.text(`Permission: ${data.card.days_permitted ?? 0} days`, attTextX, y + 56, { width: attCardW - 90 });
  doc.text(`Unexcused: ${data.card.days_absent ?? 0}`, attTextX, y + 68, { width: attCardW - 90 });

  // Full Indicator Report card
  const repX = margin + attCardW + cardGap;
  drawRoundedCard(doc, repX, y, reportCardW, bottomCardH);
  doc.font('Poppins-Bold').fontSize(10).fillColor(Color.text);
  doc.text('Full Indicator Report', repX + 14, y + 14, { width: reportCardW - 28 });
  doc.font('Poppins').fontSize(8).fillColor(Color.muted);
  doc.text(
    `Detailed learning indicators for each area are available on the following pages. Each skill has been observed across classroom activities, play, and daily routines throughout ${data.context.term_name} · Semester ${semester}.`,
    repX + 14, y + 30, { width: reportCardW - 28 }
  );
  doc.font('Poppins-Bold').fontSize(9).fillColor(Color.err);
  doc.text('See full details on next page', repX + 14, y + 72, { width: reportCardW - 28 });
}

function drawAreaCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  area: AreaSummary,
  useKgLabels = true
): void {
  drawRoundedCard(doc, x, y, w, h);

  const pad = 10;
  const innerW = w - pad * 2;

  // Area name + badge
  doc.font('Poppins-Bold').fontSize(8.5).fillColor(Color.text);
  const badgeW = 60;
  doc.text(area.name, x + pad, y + pad, { width: innerW - badgeW - 4 });

  const badgeLabel = useKgLabels ? area.overallLevel : primaryLabel(area.overallLevel);
  drawScoreBadge(doc, x + w - pad - badgeW, y + pad - 1, badgeLabel, scoreLevelColor(area.overallLevel));

  // Progress bar
  const barY = y + pad + 22;
  doc.font('Poppins').fontSize(7).fillColor(Color.muted);
  doc.text('Progress', x + pad, barY, { width: 36, lineBreak: false });
  drawProgressBar(doc, x + pad + 40, barY + 1, innerW - 40, 10, area.counts);

  // Score position indicator on bar
  const scoreIdx = ['emerging', 'developing', 'secure', 'exceeding'].indexOf(area.overallLevel.toLowerCase());
  if (scoreIdx >= 0) {
    const barStartX = x + pad + 40;
    const barTotalW = innerW - 40;
    const indicatorX = barStartX + ((scoreIdx + 0.5) / 4) * barTotalW;
    doc.save();
    doc.circle(indicatorX, barY + 6, 6).fill('#ffffff').strokeColor(scoreLevelColor(area.overallLevel)).lineWidth(2).stroke();
    doc.restore();
    doc.font('Poppins-Bold').fontSize(6).fillColor(scoreLevelColor(area.overallLevel));
    const initial = badgeLabel.charAt(0).toUpperCase();
    doc.text(initial, indicatorX - 3, barY + 3, { width: 6, align: 'center', lineBreak: false });
  }

  // E/D/S/X markers below bar
  const markerY = barY + 14;
  const barStartX = x + pad + 40;
  const barTotalW = innerW - 40;
  const markerLabels = useKgLabels ? ['E', 'D', 'S', 'X'] : ['I', 'G', 'VG', 'E'];
  doc.font('Poppins').fontSize(6).fillColor(Color.muted);
  for (let m = 0; m < 4; m++) {
    doc.text(markerLabels[m], barStartX + (m / 4) * barTotalW, markerY, { width: barTotalW / 4, align: 'center', lineBreak: false });
  }

  // Dot legend row
  const dotY = y + h - pad - 10;
  let dx = x + pad;
  const { counts } = area;
  const lbl = useKgLabels
    ? { exc: 'Exceeding', sec: 'Secure', dev: 'Developing', emg: 'Emerging' }
    : { exc: 'Excellent', sec: 'Very Good', dev: 'Good', emg: 'Improving' };
  if (counts.exceeding > 0) {
    dx += drawDotLabel(doc, dx, dotY, ScoreLevel.exceeding.color, `${counts.exceeding} ${lbl.exc}`);
  }
  if (counts.secure > 0) {
    dx += drawDotLabel(doc, dx, dotY, ScoreLevel.secure.color, `${counts.secure} ${lbl.sec}`);
  }
  if (counts.developing > 0) {
    dx += drawDotLabel(doc, dx, dotY, ScoreLevel.developing.color, `${counts.developing} ${lbl.dev}`);
  }
  if (counts.emerging > 0) {
    drawDotLabel(doc, dx, dotY, ScoreLevel.emerging.color, `${counts.emerging} ${lbl.emg}`);
  }
}

function primaryLabel(level: string): string {
  switch (level.toLowerCase()) {
    case 'exceeding': return 'Excellent';
    case 'secure': return 'Very Good';
    case 'developing': return 'Good';
    case 'emerging': return 'Improving';
    default: return level;
  }
}

/** First-page cover letter for KG (dynamic per school per term). */
async function drawKgCoverLetter(
  doc: PDFKit.PDFDocument,
  data: TermReportFull,
  requestUrl: string
): Promise<void> {
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;

  // School header on the cover page
  let y = await drawSchoolHeader(doc, {
    requestUrl,
    schoolName: data.context.school_name || 'Kreativa Global School',
    schoolLogoUrl: data.context.school_logo_url,
    schoolAddress: data.context.school_address,
    schoolTagline: data.context.school_tagline,
    schoolPhone: data.context.school_phone,
    schoolEmail: data.context.school_email,
    schoolWebsite: data.context.school_website,
    titleLine1: `Progress Report ${data.context.academic_year_name}`,
    titleLine2: `${data.context.term_name} · Semester ${Math.ceil(data.context.term_number / 2)}`,
    titleLine3: formatReportDate(data.card.report_date),
  });

  y += 10;
  doc.font('Poppins-Bold').fontSize(12).fillColor(Color.text);
  doc.text('Dear Parents,', margin, y, { width: contentW });
  y += 20;

  doc.font('Poppins').fontSize(10).fillColor(Color.text);
  const body = data.context.cover_letter_body || '';
  doc.text(body, margin, y, { width: contentW, align: 'justify' });
  y += doc.heightOfString(body, { width: contentW }) + 30;

  // Signature block: Principal + Homeroom teachers
  const teachers = data.context.homeroom_teachers;
  const sigCells: Array<{ label: string; name?: string }> = [
    { label: 'Principal', name: data.context.principal_name ?? undefined },
  ];
  if (teachers.length === 0) {
    sigCells.push({ label: 'Homeroom 1' });
    sigCells.push({ label: 'Homeroom 2' });
  } else if (teachers.length === 1) {
    sigCells.push({ label: 'Homeroom 1', name: teachers[0] });
    sigCells.push({ label: 'Homeroom 2' });
  } else {
    teachers.slice(0, 2).forEach((t, i) => {
      sigCells.push({ label: `Homeroom ${i + 1}`, name: t });
    });
  }
  const pageH = doc.page.height;
  const sigY = Math.max(y, pageH - margin - 130);
  drawSignaturesGrid(doc, sigY, sigCells);
}

/** Last-page scale legend for KG. */
function drawKgScaleLegend(doc: PDFKit.PDFDocument): void {
  newPage(doc);
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;
  let y = margin + 10;
  doc.font('Poppins-Bold').fontSize(14).fillColor(Color.text);
  doc.text('Assessment Scale', margin, y, { width: contentW, align: 'center' });
  y += 26;
  const items = [
    ['Emerging', 'The child shows early awareness of the indicator and benefits from significant adult support to engage with it.'],
    ['Developing', 'The child shows some understanding of the indicator and can demonstrate it with adult guidance or scaffolding.'],
    ['Secure', 'The child consistently demonstrates the indicator independently in a range of familiar contexts.'],
    ['Exceeding', 'The child demonstrates the indicator with confidence, depth, and is able to apply it to new and unfamiliar contexts.'],
  ];
  for (const [k, v] of items) {
    doc.font('Poppins-Bold').fontSize(11).fillColor(Color.text);
    doc.text(k, margin, y, { width: contentW });
    y += 14;
    doc.font('Poppins').fontSize(10).fillColor(Color.text);
    doc.text(v, margin, y, { width: contentW });
    y += doc.heightOfString(v, { width: contentW }) + 10;
  }
}

/** Build 3-column indicator table: Learning Area | Assessment Indicator | Level */
function buildIndicatorTable(data: TermReportFull, contentW: number) {
  type Row = Array<{ text: string; color?: string; bold?: boolean; align?: 'left' | 'center' | 'right' }>;
  const rows: Row[] = [];
  const groupHeaders: Array<{ rowIdx: number; label: string }> = [];
  let prevSection: string | null | undefined = '___NONE___';

  for (const ind of data.indicators) {
    const sec = ind.section_name || '';
    if (sec !== prevSection) {
      if (sec) groupHeaders.push({ rowIdx: rows.length, label: sec });
      prevSection = sec;
    }
    rows.push([
      { text: ind.area_name || '—' },
      { text: ind.indicator_text },
      { text: ind.score || '—', align: 'center', bold: true },
    ]);
  }

  const areaW = contentW * 0.22;
  const levelW = 90;
  const indicatorW = contentW - areaW - levelW;
  const widths = [areaW, indicatorW, levelW];

  return { rows, groupHeaders, widths };
}

export async function drawTermReportPdf(
  doc: PDFKit.PDFDocument,
  data: TermReportFull,
  requestUrl: string
): Promise<void> {
  const isKg = isKgLevelName(data.context.level_name);
  const termNum = data.context.term_number;
  const isPatternB = data.context.indicator_pattern === 2;
  const semester = Math.ceil(termNum / 2);
  const formattedDate = formatReportDate(data.card.report_date);

  // ── Cover letter (shows for all schools/terms when content available)
  if (data.context.cover_letter_body) {
    await drawKgCoverLetter(doc, data, requestUrl);
    newPage(doc);
  }

  // ── Summary / "Learning Areas at a Glance" page (KG and Primary)
  if (data.indicators.length > 0) {
    await drawKgSummaryPage(doc, data, requestUrl);
    newPage(doc);
  }

  // ── Page header (reference layout: logo+name+address left | period info right)
  let y = await drawSchoolHeader(doc, {
    requestUrl,
    schoolName: data.context.school_name || 'Kreativa Global School',
    schoolLogoUrl: data.context.school_logo_url,
    schoolAddress: data.context.school_address,
    schoolTagline: data.context.school_tagline,
    schoolPhone: data.context.school_phone,
    schoolEmail: data.context.school_email,
    schoolWebsite: data.context.school_website,
    titleLine1: `Progress Report ${data.context.academic_year_name}`,
    titleLine2: `${data.context.term_name} · Semester ${semester}`,
    titleLine3: formattedDate,
  });

  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;

  if (isKg && isPatternB) {
    // ═══════════════════════════════════════════════════════════════════════
    // KG Pattern B (Term 2/4): Same as Term 1/3 + bilingual narratives
    // ═══════════════════════════════════════════════════════════════════════

    // ── Section title
    doc.font('Poppins-Bold').fontSize(13).fillColor(Color.text);
    doc.text('LAPORAN CAPAIAN PEMBELAJARAN', margin, y, { width: contentW, align: 'center', underline: true });
    y += 24;

    // ── Student info: 6 fields, 2 columns, Indonesian labels (no borders)
    const semLabel = semester === 1 ? '1 (Ganjil)' : '2 (Genap)';
    const heightStr = data.card.height_cm != null ? `${data.card.height_cm} cm` : '—';
    const weightStr = data.card.weight_kg != null ? `${data.card.weight_kg} kg` : '—';
    y = drawStudentInfoPlain(doc, y, [
      { label: 'Nama', value: data.context.student_name },
      { label: 'Semester', value: semLabel },
      { label: 'Kelas', value: data.context.class_name },
      { label: 'Tinggi Badan', value: heightStr },
      { label: 'Fase', value: data.context.level_fase || '—' },
      { label: 'Berat Badan', value: weightStr },
    ]);

    // ── Theme / Unit table (same as Term 1/3)
    if (data.theme_units.length > 0) {
      y = ensureRoom(doc, y, 40);
      y = drawThemeUnitTable(doc, y, data.theme_units);
    }

    // ── Learning Progress indicator table (same as Term 1/3)
    y = ensureRoom(doc, y, 40);
    y = drawSectionHeading(doc, y, 'Learning Progress Report');
    const { rows: rowsB, groupHeaders: ghB, widths: wB } = buildIndicatorTable(data, contentW);
    if (rowsB.length === 0) {
      doc.font('Poppins').fontSize(9).fillColor(Color.muted);
      doc.text('No indicators configured for this pattern.', margin, y, { width: contentW });
      y += 16;
    } else {
      y = drawTable(
        doc,
        y,
        [
          { label: 'Learning Area' },
          { label: 'Assessment Indicator' },
          { label: 'Level', align: 'center' },
        ],
        wB,
        rowsB,
        { groupHeaders: ghB }
      );
    }

    // ── Narrative sections (boxed, bilingual)
    y = drawBoxedNarrative(doc, y, 'Nilai Agama dan Budi Pekerti', data.card.narrative_religion);
    y = drawBoxedNarrative(doc, y, 'Jati Diri', data.card.narrative_identity);
    y = drawBoxedNarrative(doc, y, 'Dasar-Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa, dan Seni', data.card.narrative_literacy_stem);
    y = drawBoxedNarrative(doc, y, 'Kokurikuler', data.card.narrative_cocurricular);

    // ── Refleksi Orang Tua
    y = drawBoxedNarrative(doc, y, 'Refleksi Orang Tua', data.card.parent_reflection);

    // ── Attendance (bold label : value format)
    y = ensureRoom(doc, y, 60);
    const totalB = Number(data.card.total_school_days || 0);
    const presentB = Number(data.card.days_present || 0);
    doc.font('Poppins-Bold').fontSize(11).fillColor(Color.text);
    doc.text(`Attendance : ${presentB} / ${totalB}`, margin, y, { width: contentW });
    y += 18;
    y = drawAttendanceInline(doc, y, [
      { label: 'Sick', value: String(data.card.days_sick ?? 0) },
      { label: 'Permission', value: String(data.card.days_permitted ?? 0) },
      { label: 'Absent', value: String(data.card.days_absent ?? 0) },
    ]);

    // ── Signatures: 2x2 grid with names (Principal | Homeroom | Father | Mother)
    y = ensureRoom(doc, y, 220);
    y += 10;
    const homeroomNames = data.context.homeroom_teachers.join('  & ') || '—';
    y = drawSignaturesGrid2x2(doc, y, [
      { label: "Principal's Signature", name: data.context.principal_name ?? undefined },
      { label: "Homeroom's Signature", name: homeroomNames },
      { label: "Father's Signature" },
      { label: "Mother's Signature" },
    ]);

  } else {
    // ═══════════════════════════════════════════════════════════════════════
    // KG Pattern A (Term 1/3) & All Primary: Indicator-table layout
    // ═══════════════════════════════════════════════════════════════════════

    // ── "Learning Progress Report" centered section title
    doc.font('Poppins-Bold').fontSize(13).fillColor(Color.text);
    doc.text('Learning Progress Report', margin, y, { width: contentW, align: 'center' });
    y += 20;

    // ── Student info: 4-column box (Name | Student ID | Class | Form Teacher)
    y = drawStudentInfo(
      doc,
      y,
      [
        { label: 'Name', value: data.context.student_name },
        { label: 'Student ID', value: data.context.student_nis },
        { label: 'Class', value: data.context.class_name },
        { label: 'Form Teacher', value: data.context.homeroom_teacher || '—' },
      ],
      4
    );

    // ── Theme / Unit table (KG and Primary — show when data is available)
    if (data.theme_units.length > 0) {
      y = ensureRoom(doc, y, 40);
      y = drawThemeUnitTable(doc, y, data.theme_units);
    }

    // ── Learning Progress indicator table (3 columns)
    y = ensureRoom(doc, y, 40);
    y = drawSectionHeading(doc, y, 'Learning Progress Report');
    const { rows, groupHeaders, widths } = buildIndicatorTable(data, contentW);
    if (rows.length === 0) {
      doc.font('Poppins').fontSize(9).fillColor(Color.muted);
      doc.text('No indicators configured for this pattern.', margin, y, { width: contentW });
      y += 16;
    } else {
      y = drawTable(
        doc,
        y,
        [
          { label: 'Learning Area' },
          { label: 'Assessment Indicator' },
          { label: 'Level', align: 'center' },
        ],
        widths,
        rows,
        { groupHeaders }
      );
    }

    // ── Teacher Remarks / Goals
    y = ensureRoom(doc, y, 80);
    y = drawSectionHeading(doc, y, isKg ? "Teacher's Remark and Goals" : 'Teacher Remarks');
    if (isKg) {
      const blocks = (data.card.teacher_remarks || '').split(/\n\n+/).filter((b) => b.trim());
      const labels = ["Teacher's Remark", 'Goals at School', 'At Home'];
      blocks.forEach((b, i) => {
        y = drawTextBlock(doc, y, labels[i] || `Remark ${i + 1}`, b);
      });
      if (blocks.length === 0) {
        y = drawTextBlock(doc, y, "Teacher's Remark", data.card.teacher_remarks);
      }
    } else {
      const finalRemarks =
        data.card.teacher_remarks_final ||
        [data.card.teacher_remarks_strength, data.card.teacher_remarks_improve, data.card.teacher_remarks_en]
          .filter((s) => s && s.trim())
          .join('\n\n');
      y = drawTextBlock(doc, y, 'Remarks', finalRemarks);
      if (data.card.cocurricular_remarks) {
        y = drawTextBlock(doc, y, 'Co-curricular', data.card.cocurricular_remarks);
      }
    }

    // ── Attendance inline
    y = ensureRoom(doc, y, 60);
    const total = Number(data.card.total_school_days || 0);
    const present = Number(data.card.days_present || 0);
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    const att = [
      { label: 'Attendance', value: `${pct}%` },
      { label: 'Sick', value: String(data.card.days_sick ?? 0) },
      { label: 'Permission', value: String(data.card.days_permitted ?? 0) },
      { label: 'Absent', value: String(data.card.days_absent ?? 0) },
    ];
    if (!isKg) att.push({ label: 'Late', value: String(data.card.days_late ?? 0) });
    y = drawAttendanceInline(doc, y, att);

    if (isKg && (data.card.weight_kg != null || data.card.height_cm != null)) {
      y = drawAttendanceInline(doc, y, [
        { label: 'Weight (kg)', value: data.card.weight_kg != null ? String(data.card.weight_kg) : '—' },
        { label: 'Height (cm)', value: data.card.height_cm != null ? String(data.card.height_cm) : '—' },
      ]);
    }

    // ── Signatures
    y = ensureRoom(doc, y, 110);
    y += 10;
    if (isKg) {
      drawSignaturesGrid(doc, y, [
        { label: 'Principal' },
        { label: 'Homeroom Teacher 1' },
        { label: 'Homeroom Teacher 2' },
        { label: 'Father' },
        { label: 'Mother' },
      ]);
    } else {
      drawSignaturesGrid(doc, y, [
        { label: 'Principal' },
        { label: 'Homeroom Teacher', name: data.context.homeroom_teacher || undefined },
        { label: 'Father' },
        { label: 'Mother' },
      ]);
    }
  }

  // ── KG: scale legend on last page
  if (isKg) {
    drawKgScaleLegend(doc);
  }

  drawFooter(doc);
}
