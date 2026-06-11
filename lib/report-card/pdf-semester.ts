import type PDFKit from 'pdfkit';
import type { SemesterReportFull } from './queries';
import {
  Color,
  drawSchoolHeader,
  drawProgressHeader,
  drawStudentInfo,
  drawAttendanceInline,
  drawTable,
  drawSignaturesGrid,
  drawSectionHeading,
  drawTextBlock,
  drawFooter,
  formatReportDate,
} from './pdf-layout';

const margin = 40;

function ensureRoom(doc: PDFKit.PDFDocument, y: number, need: number): number {
  if (y + need > doc.page.height - 60) {
    doc.addPage();
    return margin;
  }
  return y;
}

/** Cover letter page for semester reports. */
async function drawSemesterCoverLetter(
  doc: PDFKit.PDFDocument,
  data: SemesterReportFull,
  requestUrl: string
): Promise<void> {
  const pageW = doc.page.width;
  const contentW = pageW - margin * 2;

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
    titleLine2: `${data.context.term_name} · Semester ${data.context.semester_number}`,
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

  // Signature block
  const sigCells: Array<{ label: string; name?: string }> = [
    { label: 'Principal', name: data.context.principal_name ?? undefined },
    { label: 'Homeroom Teacher', name: data.context.homeroom_teacher ?? undefined },
  ];
  const pageH = doc.page.height;
  const sigY = Math.max(y, pageH - margin - 130);
  drawSignaturesGrid(doc, sigY, sigCells);
}

export async function drawSemesterReportPdf(
  doc: PDFKit.PDFDocument,
  data: SemesterReportFull,
  requestUrl: string
): Promise<void> {
  // ── Cover Letter page (if configured for this school/term)
  if (data.context.cover_letter_body) {
    await drawSemesterCoverLetter(doc, data, requestUrl);
    doc.addPage();
  }

  // Detect numeric vs letter output: if any grade is configured as 'number', use numeric column.
  const isNumeric = data.grades.some((g) => g.grade_output === 'number');

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
    titleLine2: `${data.context.term_name} · Semester ${data.context.semester_number}`,
    titleLine3: formatReportDate(data.card.report_date),
  });
  y = drawProgressHeader(doc, {
    titleLine1: 'Subject Grades',
    titleLine2: `Semester ${data.context.semester_number} — ${data.context.term_name}`,
    date: formatReportDate(data.card.report_date),
    startY: y,
  });

  // ── Student info
  y = drawStudentInfo(doc, y, [
    { label: 'Name', value: data.context.student_name },
    { label: 'NIS', value: data.context.student_nis },
    { label: 'Class', value: data.context.class_name },
    { label: 'Level', value: data.context.level_name },
    { label: 'Homeroom Teacher', value: '—' },
    { label: 'Status', value: (data.card.status || 'draft').toUpperCase() },
  ]);

  // ── Combined Subject / Grade / Remarks table (standard + special inline)
  const contentW = doc.page.width - margin * 2;
  const widths = [contentW * 0.34, contentW * 0.18, contentW - contentW * 0.34 - contentW * 0.18];

  type Row = Array<{ text: string; color?: string; bold?: boolean; align?: 'left' | 'center' | 'right' }>;
  const rows: Row[] = [];

  const fmtGrade = (g: SemesterReportFull['grades'][number]): string => {
    if (isNumeric) {
      return g.final_grade_numeric == null ? '—' : g.final_grade_numeric.toFixed(1);
    }
    return g.final_grade_letter || '—';
  };

  for (const g of data.grades) {
    const remarks = g.remarks_en || g.remarks_id || '—';
    rows.push([
      { text: g.subject_name, bold: true },
      { text: fmtGrade(g), align: 'center', bold: true, color: Color.accent },
      { text: remarks },
    ]);
  }

  // Inline special subjects
  const specialFilled = data.special.filter((s) => s.jilid || s.page || s.shield || s.grade || s.remarks);
  for (const s of specialFilled) {
    let gradeCell = s.grade || '—';
    if (s.jilid || s.page) {
      gradeCell = `${s.jilid || '—'} / ${s.page || '—'}`;
    } else if (s.shield) {
      gradeCell = s.shield;
    }
    rows.push([
      { text: s.subject_name, bold: true },
      { text: gradeCell, align: 'center', bold: true, color: Color.accent },
      { text: s.remarks || '—' },
    ]);
  }

  if (rows.length === 0) {
    doc.font('Poppins').fontSize(9).fillColor(Color.muted);
    doc.text('Belum ada nilai.', margin, y, { width: contentW });
    y += 16;
  } else {
    y = drawTable(
      doc,
      y,
      [{ label: 'Subject' }, { label: 'Grade', align: 'center' }, { label: 'Remarks' }],
      widths,
      rows
    );
  }

  // ── Year Overall (numeric only)
  if (isNumeric && data.grades.some((g) => g.year_overall != null)) {
    y = ensureRoom(doc, y, 60);
    y = drawSectionHeading(doc, y, 'Year Overall');
    const yoRows: Row[] = data.grades
      .filter((g) => g.year_overall != null)
      .map((g) => [
        { text: g.subject_name, bold: true },
        {
          text: g.year_overall != null ? g.year_overall.toFixed(1) : '—',
          align: 'center',
          bold: true,
          color: Color.ok,
        },
      ]);
    y = drawTable(
      doc,
      y,
      [{ label: 'Subject' }, { label: 'Year Overall', align: 'center' }],
      [contentW * 0.7, contentW * 0.3],
      yoRows
    );
  }

  // ── Co-curricular paragraph
  if (data.card.cocurricular_remarks && data.card.cocurricular_remarks.trim()) {
    y = ensureRoom(doc, y, 80);
    y = drawSectionHeading(doc, y, 'Co-Curricular');
    y = drawTextBlock(doc, y, 'Co-curricular', data.card.cocurricular_remarks);
  }

  // ── Homeroom note
  if (data.card.homeroom_comment && data.card.homeroom_comment.trim()) {
    y = ensureRoom(doc, y, 80);
    y = drawSectionHeading(doc, y, "Homeroom's Note");
    y = drawTextBlock(doc, y, 'Note', data.card.homeroom_comment);
  }

  // ── Attendance inline (with Late)
  y = ensureRoom(doc, y, 60);
  const total = Number(data.card.total_school_days || 0);
  const present = Number(data.card.days_present || 0);
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  y = drawAttendanceInline(doc, y, [
    { label: 'Attendance', value: `${pct}%` },
    { label: 'Sick', value: String(data.card.days_sick ?? 0) },
    { label: 'Permission', value: String(data.card.days_permitted ?? 0) },
    { label: 'Absent', value: String(data.card.days_absent ?? 0) },
    { label: 'Late', value: String(data.card.days_late ?? 0) },
  ]);

  // ── Signatures: Principal + Homeroom (no parent signatures on Primary semester per ref)
  y = ensureRoom(doc, y, 110);
  y += 10;
  drawSignaturesGrid(doc, y, [{ label: 'Principal' }, { label: 'Homeroom Teacher' }]);

  drawFooter(doc);
}
