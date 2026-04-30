import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { TuitionReceiptPayload } from '@/lib/data/server/finance-transactions';
import { terbilangRupiahUpper } from '@/lib/utils/terbilang-id';
import { amountInWordsEnUpper } from '@/lib/utils/amount-in-words-en';

function formatRupiahPdf(n: number): string {
  const x = Math.round(n);
  return `Rp. ${x.toLocaleString('id-ID')}`;
}

function formatDateHeader(iso: string | null, en: boolean): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(en ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

type Labels = {
  receiptNo: string;
  date: string;
  method: string;
  title: string;
  nis: string;
  name: string;
  vaNo: string;
  program: string;
  rombel: string;
  no: string;
  paymentName: string;
  nominal: string;
  total: string;
  amountInWordsLabel: string;
  notes: string;
  depositor: string;
  officer: string;
  systemNote: string;
};

const ID_LABELS: Labels = {
  receiptNo: 'NO KWITANSI',
  date: 'TANGGAL',
  method: 'METODE',
  title: 'BUKTI PEMBAYARAN',
  nis: 'NIS',
  name: 'NAMA',
  vaNo: 'NO VA',
  program: 'PROGRAM',
  rombel: 'ROMBEL',
  no: 'NO.',
  paymentName: 'NAMA PEMBAYARAN',
  nominal: 'NOMINAL',
  total: 'TOTAL',
  amountInWordsLabel: 'TERBILANG',
  notes: 'KETERANGAN',
  depositor: 'PENYETOR',
  officer: 'PETUGAS',
  systemNote: 'SYSTEM / BANK',
};

const EN_LABELS: Labels = {
  receiptNo: 'RECEIPT NO',
  date: 'DATE',
  method: 'METHOD',
  title: 'PAYMENT RECEIPT',
  nis: 'NIS',
  name: 'NAME',
  vaNo: 'VA NO',
  program: 'PROGRAM',
  rombel: 'CLASS',
  no: 'NO.',
  paymentName: 'PAYMENT DESCRIPTION',
  nominal: 'AMOUNT',
  total: 'TOTAL',
  amountInWordsLabel: 'AMOUNT IN WORDS',
  notes: 'NOTES',
  depositor: 'DEPOSITOR',
  officer: 'OFFICER',
  systemNote: 'SYSTEM / BANK',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 36,
    paddingBottom: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111',
  },
  headerBrandRow: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 8 },
  brandBlock: { flexDirection: 'row', alignItems: 'flex-start', flexGrow: 1, width: '100%' },
  brandTextCol: { flexGrow: 1, flexShrink: 1, paddingRight: 12, maxWidth: '100%' },
  logo: { width: 52, height: 52, marginRight: 14, objectFit: 'contain', flexShrink: 0 },
  schoolName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0d6e7a', marginBottom: 4 },
  schoolAddress: { fontSize: 8, color: '#444', lineHeight: 1.45 },
  headerMetaRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  metaBlock: { alignItems: 'flex-end', fontSize: 8, maxWidth: '85%' },
  metaLine: { marginBottom: 2 },
  metaBold: { fontFamily: 'Helvetica-Bold' },
  title: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 6,
    marginBottom: 14,
  },
  twoCol: { flexDirection: 'row', marginBottom: 12 },
  colLeft: { width: '50%', paddingRight: 8 },
  colRight: { width: '50%', paddingLeft: 8 },
  labelRow: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 72, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  value: { flex: 1, fontSize: 8 },
  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
    paddingVertical: 4,
    marginTop: 4,
  },
  thNo: { width: '8%', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  thName: { width: '62%', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  thAmt: { width: '30%', fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'right' },
  tr: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#ccc' },
  tdNo: { width: '8%', fontSize: 8 },
  tdName: { width: '62%', fontSize: 8 },
  tdAmt: { width: '30%', fontSize: 8, textAlign: 'right' },
  totalBlock: { marginTop: 8, alignItems: 'flex-end' },
  totalLine: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  totalLabel: { width: 120, fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'right', marginRight: 8 },
  totalVal: { width: 100, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  terbilang: { marginTop: 6, fontSize: 8, textAlign: 'right', maxWidth: '100%' },
  signRow: { flexDirection: 'row', marginTop: 36, justifyContent: 'space-between' },
  signCol: { width: '30%', fontSize: 8 },
  signTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 36 },
  systemNote: { marginTop: 16, fontSize: 7, textAlign: 'right', color: '#555' },
});

export function TuitionReceiptPdfDoc({ data }: { data: TuitionReceiptPayload }) {
  const en = data.themeId === 1;
  const l = en ? EN_LABELS : ID_LABELS;
  const amountWords = en ? amountInWordsEnUpper(data.total) : terbilangRupiahUpper(data.total);
  const lines = data.lines.length > 0 ? data.lines : [{ label: en ? 'Payment' : 'Pembayaran', amount: data.total }];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBrandRow}>
          <View style={styles.brandBlock}>
            {data.schoolLogoDataUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.schoolLogoDataUrl} style={styles.logo} />
            ) : (
              <View style={[styles.logo, { backgroundColor: '#e8f4f5' }]} />
            )}
            <View style={styles.brandTextCol}>
              <Text style={styles.schoolName}>{data.schoolName}</Text>
              {data.schoolAddress ? (
                <Text style={styles.schoolAddress}>{data.schoolAddress}</Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.headerMetaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>
              <Text style={styles.metaBold}>{l.receiptNo}: </Text>
              {data.referenceNo}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaBold}>{l.date}: </Text>
              {formatDateHeader(data.paymentDate, en)}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaBold}>{l.method}: </Text>
              {data.paymentMethodLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{l.title}</Text>

        <View style={styles.twoCol}>
          <View style={styles.colLeft}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{l.nis}</Text>
              <Text style={styles.value}>{data.studentNis ?? '—'}</Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{l.name}</Text>
              <Text style={styles.value}>{data.studentName}</Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{l.vaNo}</Text>
              <Text style={styles.value}>{data.vaNo ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.colRight}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{l.program}</Text>
              <Text style={styles.value}>{data.programClass ?? '—'}</Text>
            </View>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{l.rombel}</Text>
              <Text style={styles.value}>{data.rombelLabel ?? '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.thNo}>{l.no}</Text>
          <Text style={styles.thName}>{l.paymentName}</Text>
          <Text style={styles.thAmt}>{l.nominal}</Text>
        </View>
        {lines.map((line, i) => (
          <View key={`${i}-${line.label}`} style={styles.tr} wrap={false}>
            <Text style={styles.tdNo}>{i + 1}</Text>
            <Text style={styles.tdName}>{line.label}</Text>
            <Text style={styles.tdAmt}>{formatRupiahPdf(line.amount)}</Text>
          </View>
        ))}

        <View style={styles.totalBlock}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>{l.total}</Text>
            <Text style={styles.totalVal}>{formatRupiahPdf(data.total).toUpperCase()}</Text>
          </View>
          <Text style={styles.terbilang}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{l.amountInWordsLabel}: </Text>
            {amountWords}
          </Text>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signCol}>
            <Text style={styles.signTitle}>{l.notes}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signTitle}>{l.depositor}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signTitle}>{l.officer}</Text>
          </View>
        </View>
        <Text style={styles.systemNote}>{l.systemNote}</Text>
      </Page>
    </Document>
  );
}
