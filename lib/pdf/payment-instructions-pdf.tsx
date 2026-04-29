import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PaymentInstructionsPdfPayload, PdfInstructionLine } from '@/lib/data/server/payment-instructions-pdf';

/** Aksen ungu selaras UI portal (instruksi VA). */
const PRIMARY = '#6d28d9';
const SLATE600 = '#475569';
const SLATE500 = '#64748b';
const BORDER = '#e2e8f0';
const VA_BG = '#f8fafc';

const BODY_FS = 8;
const SEC_TITLE_FS = 8.8;

function formatRupiahPdf(n: number, lang: 'id' | 'en'): string {
  const x = Math.round(n);
  return `Rp ${x.toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID')}`;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
  },
  topSchoolRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  topLogo: { width: 32, height: 32, marginRight: 8, objectFit: 'contain' },
  topSchoolText: { fontSize: 8, color: SLATE600, maxWidth: '82%' },
  pageTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: BORDER,
    padding: 12,
    marginBottom: 8,
  },
  labelMuted: { fontSize: 8, color: SLATE500, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  methodName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  totalLabel: { fontSize: 8, color: SLATE500, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: PRIMARY },
  deadlineLabel: { fontSize: 8, color: SLATE500, fontFamily: 'Helvetica-Bold' },
  deadlineValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  vaBox: {
    backgroundColor: VA_BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 6,
    alignItems: 'center',
  },
  vaDigits: { fontSize: 12, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, color: '#0f172a' },
  caraTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 6 },
  twoCol: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { width: '49%', flexDirection: 'column' },
  colLeft: { paddingRight: 6 },
  secBlock: { marginBottom: 5 },
  secTitle: {
    fontSize: SEC_TITLE_FS,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 3,
  },
  paraLine: { fontSize: BODY_FS, lineHeight: 1.42, color: SLATE600, marginBottom: 2 },
  olRow: { flexDirection: 'row', marginBottom: 1.5, alignItems: 'flex-start' },
  olNum: {
    width: 14,
    fontSize: BODY_FS,
    fontFamily: 'Helvetica-Bold',
    color: SLATE600,
    lineHeight: 1.42,
  },
  olText: { flex: 1, fontSize: BODY_FS, lineHeight: 1.42, color: SLATE600 },
  ulBullet: { width: 10, fontSize: BODY_FS, color: SLATE600, lineHeight: 1.42 },
  footRef: { marginTop: 6, fontSize: 7, color: SLATE500, textAlign: 'center' },
});

function PdfInstructionLineRow({ line }: { line: PdfInstructionLine }) {
  if (line.kind === 'ordered') {
    return (
      <View style={styles.olRow} wrap>
        <Text style={styles.olNum}>{line.n}.</Text>
        <Text style={styles.olText}>{line.text}</Text>
      </View>
    );
  }
  if (line.kind === 'bullet') {
    return (
      <View style={styles.olRow} wrap>
        <Text style={styles.ulBullet}>•</Text>
        <Text style={styles.olText}>{line.text}</Text>
      </View>
    );
  }
  return (
    <Text style={styles.paraLine} wrap>
      {line.text}
    </Text>
  );
}

function PdfSectionBlock({
  title,
  lines,
}: {
  title: string;
  lines: PdfInstructionLine[];
}) {
  return (
    <View style={styles.secBlock} wrap>
      <Text style={styles.secTitle}>{title}</Text>
      {lines.length === 0 ? (
        <Text style={styles.paraLine}>—</Text>
      ) : (
        lines.map((line, j) => <PdfInstructionLineRow key={`${title}-${j}`} line={line} />)
      )}
    </View>
  );
}

export function PaymentInstructionsPdfDoc({ data }: { data: PaymentInstructionsPdfPayload }) {
  const title = data.lang === 'en' ? 'Payment instructions' : 'Instruksi Pembayaran';
  const metode = data.lang === 'en' ? 'Method' : 'Metode';
  const totalL = data.lang === 'en' ? 'Total' : 'Total';
  const batas = data.lang === 'en' ? 'Payment deadline' : 'Batas Waktu';
  const nomorVa = data.lang === 'en' ? 'VA number' : 'Nomor VA';
  const cara = data.lang === 'en' ? 'How to pay' : 'Cara pembayaran';
  const refL = data.lang === 'en' ? 'Reference' : 'No. referensi';

  const secs = data.sections;
  const split = Math.ceil(secs.length / 2);
  const leftSecs = secs.slice(0, split);
  const rightSecs = secs.slice(split);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {data.schoolLogoDataUrl ? (
          <View style={styles.topSchoolRow} wrap={false}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.schoolLogoDataUrl} style={styles.topLogo} />
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.topSchoolText, { fontFamily: 'Helvetica-Bold', marginBottom: 2, color: '#0f172a' }]}>
                {data.schoolName}
              </Text>
              {data.schoolAddress ? <Text style={styles.topSchoolText}>{data.schoolAddress}</Text> : null}
            </View>
          </View>
        ) : (
          <View style={{ marginBottom: 10 }} wrap={false}>
            <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>{data.schoolName}</Text>
            {data.schoolAddress ? <Text style={styles.topSchoolText}>{data.schoolAddress}</Text> : null}
          </View>
        )}

        <Text style={styles.pageTitle}>{title}</Text>

        <View style={styles.card} wrap={false}>
          <Text style={styles.labelMuted}>{metode}</Text>
          <Text style={styles.methodName}>{data.methodName}</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.totalLabel}>{totalL}</Text>
            <Text style={styles.totalValue}>{formatRupiahPdf(data.totalAmount, data.lang)}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={styles.deadlineLabel}>{batas}</Text>
            <Text style={styles.deadlineValue}>{data.deadlineLabel}</Text>
          </View>
        </View>

        {data.vaDisplay ? (
          <View style={styles.card} wrap={false}>
            <Text style={styles.labelMuted}>{nomorVa}</Text>
            <View style={styles.vaBox}>
              <Text style={styles.vaDigits}>{data.vaDisplay}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.caraTitle}>{cara}</Text>
          {secs.length === 0 ? (
            <Text style={styles.paraLine}>—</Text>
          ) : (
            <View style={styles.twoCol}>
              <View style={[styles.col, styles.colLeft]}>
                {leftSecs.map((s, i) => (
                  <PdfSectionBlock key={`L-${i}-${s.title}`} title={s.title} lines={s.lines} />
                ))}
              </View>
              <View style={styles.col}>
                {rightSecs.map((s, i) => (
                  <PdfSectionBlock key={`R-${i}-${s.title}`} title={s.title} lines={s.lines} />
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.footRef}>
          {refL}: {data.referenceNo}
        </Text>
      </Page>
    </Document>
  );
}
