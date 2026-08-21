import type { RowDataPacket } from 'mysql2';
import { sql } from '@/lib/db/client';
import {
  ZainsDbConfigError,
  ZainsMysqlError,
  zainsExecute,
  zainsQuery,
  type ZainsEntity,
} from '@/lib/mysql-zains';

export type ZainsPenerimaanJobBody = {
  transactionId: string | number;
  transactionCreatedAt?: string;
};

const JAKARTA_TZ = 'Asia/Jakarta';

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

/** Calendar/time parts in Asia/Jakarta (never server UTC local). */
function jakartaParts(d: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** yyMMdd in Asia/Jakarta — used for id_exre / noresi. */
function yymmddJakarta(d: Date): string {
  const p = jakartaParts(d);
  return `${String(p.year).slice(-2)}${pad(p.month, 2)}${pad(p.day, 2)}`;
}

/** YYYY-MM-DD in Asia/Jakarta. */
function dateYmdJakarta(d: Date): string {
  const p = jakartaParts(d);
  return `${p.year}-${pad(p.month, 2)}-${pad(p.day, 2)}`;
}

/** MySQL DATETIME string in Asia/Jakarta (no Z / no UTC shift). */
function formatMysqlDatetimeJakarta(d: Date): string {
  const p = jakartaParts(d);
  return `${p.year}-${pad(p.month, 2)}-${pad(p.day, 2)} ${pad(p.hour, 2)}:${pad(p.minute, 2)}:${pad(p.second, 2)}`;
}

async function nextIdExre(
  entity: ZainsEntity,
  idKantor: number,
  tgl: Date
): Promise<string> {
  const curdate = dateYmdJakarta(tgl);
  const rows = await zainsQuery<RowDataPacket[]>(
    entity,
    `SELECT RIGHT(id_exre, 4) AS id
     FROM fins_trans
     WHERE id_kantor = ?
       AND DATE(tgl_exre) = ?
       AND jenis = 'r'
       AND LENGTH(id_exre) = 17
     ORDER BY RIGHT(id_exre, 4) DESC
     LIMIT 1`,
    [idKantor, curdate]
  );
  const next = rows[0]?.id ? Number(rows[0].id) + 1 : 1;
  const ymd = yymmddJakarta(tgl);
  return `R${pad(idKantor, 3)}${ymd}${pad(next, 3)}${pad(next, 4)}`;
}

async function nextNoresi(
  entity: ZainsEntity,
  mutasi: string,
  idKantor: number,
  tgl: Date
): Promise<string> {
  const ymd = yymmddJakarta(tgl);
  const base = `${mutasi}${ymd}${pad(idKantor, 3)}`;
  const rows = await zainsQuery<RowDataPacket[]>(
    entity,
    `SELECT RIGHT(noresi, 5) AS id
     FROM fins_trans
     WHERE noresi LIKE ?
     ORDER BY RIGHT(noresi, 5) DESC
     LIMIT 1`,
    [`${base}%`]
  );
  const next = rows[0]?.id ? Number(rows[0].id) + 1 : 1;
  return `${base}${pad(next, 5)}`;
}

async function lookupKaryawan(
  entity: ZainsEntity,
  nik: string
): Promise<{ id_jabatan: number; nik_input_atasan: string }> {
  const rows = await zainsQuery<RowDataPacket[]>(
    entity,
    `SELECT id_jabatan, id_karyawan_parent
     FROM hcm_karyawan
     WHERE id_karyawan = ?
     LIMIT 1`,
    [nik]
  );
  const row = rows[0];
  return {
    id_jabatan: row?.id_jabatan != null ? Number(row.id_jabatan) : 0,
    nik_input_atasan: row?.id_karyawan_parent ? String(row.id_karyawan_parent) : '',
  };
}

type NeonTx = {
  id: number;
  created_at: Date | string;
  payment_date: Date | string | null;
  total_amount: string | number;
  status: string;
  payment_method_id: number | null;
  student_id: number;
  school_id: number;
  zains_sync_status: string | null;
  student_name: string | null;
  academic_year_name: string | null;
};

type NeonLine = {
  bill_id: number;
  product_id: number;
  amount_paid: string | number;
  product_name: string;
  bill_month: number | null;
  bill_year: number | null;
  bill_title: string | null;
};

function monthNameId(month: number | null | undefined): string {
  const names = [
    '',
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  if (!month || month < 1 || month > 12) return '';
  return names[month];
}

/**
 * Insert FINS penerimaan for a settled tuition transaction.
 * Talenta SPP → zains_ijf only for now. Idempotent on success.
 */
export async function processZainsPenerimaanJob(
  body: ZainsPenerimaanJobBody
): Promise<{ outcome: 'synced' | 'skipped' | 'failed'; error?: string }> {
  const tid = Number(body.transactionId);
  if (!Number.isFinite(tid)) {
    return { outcome: 'failed', error: 'invalid transactionId' };
  }

  try {
    const txRows = (await sql`
      SELECT
        t.id,
        t.created_at,
        t.payment_date,
        t.total_amount,
        t.status,
        t.payment_method_id,
        t.student_id,
        t.zains_sync_status,
        st.school_id,
        st.full_name AS student_name,
        ay.name AS academic_year_name
      FROM tuition_transactions t
      JOIN core_students st ON st.id = t.student_id
      LEFT JOIN core_academic_years ay ON ay.id = t.academic_year_id
      WHERE t.id = ${tid}
      ORDER BY t.created_at DESC
      LIMIT 1
    `) as NeonTx[];

    const tx = txRows[0];
    if (!tx) {
      await writeLog({
        transactionId: tid,
        createdAt: new Date(),
        entity: 'unknown',
        status: 'failed',
        errorMessage: 'transaction not found',
      });
      return { outcome: 'failed', error: 'transaction not found' };
    }

    const status = String(tx.status || '').toLowerCase();
    if (status !== 'success' && status !== 'paid') {
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity: 'unknown',
        status: 'skipped',
        errorMessage: `transaction not settled (status=${tx.status})`,
      });
      return { outcome: 'skipped', error: 'transaction not settled' };
    }

    if (String(tx.zains_sync_status || '').toLowerCase() === 'synced') {
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity: 'unknown',
        status: 'skipped',
        errorMessage: 'already synced',
        requestPayload: { zains_sync_status: tx.zains_sync_status },
      });
      return { outcome: 'synced' };
    }

    const mapRows = (await sql`
      SELECT *
      FROM finance_zains_school_map
      WHERE school_id = ${tx.school_id}
        AND is_active = true
      LIMIT 1
    `) as Record<string, unknown>[];

    const schoolMap = mapRows[0];
    if (!schoolMap) {
      await markSync(tid, 'skipped', null);
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity: 'unknown',
        status: 'skipped',
        errorMessage: `no school map (school_id=${tx.school_id})`,
      });
      return { outcome: 'skipped', error: 'no school map' };
    }

    const entity = String(schoolMap.entity || '').toLowerCase() as ZainsEntity;
    if (entity !== 'ijf') {
      await markSync(tid, 'skipped', null);
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity,
        status: 'skipped',
        errorMessage: `entity not ijf (phase 1): ${entity}`,
      });
      return { outcome: 'skipped', error: 'entity not ijf (phase 1)' };
    }

    const idKantor = schoolMap.id_kantor != null ? Number(schoolMap.id_kantor) : NaN;
    const nikInput = schoolMap.nik_input ? String(schoolMap.nik_input) : '';
    const nikApprove = schoolMap.nik_approve ? String(schoolMap.nik_approve) : '';
    if (!Number.isFinite(idKantor) || !nikInput) {
      await markSync(tid, 'failed', null);
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity,
        status: 'failed',
        errorMessage: 'school map missing id_kantor or nik_input',
        requestPayload: { schoolMap },
      });
      return { outcome: 'failed', error: 'incomplete school map' };
    }

    const lines = (await sql`
      SELECT
        td.bill_id,
        td.product_id,
        td.amount_paid,
        p.name AS product_name,
        b.bill_month,
        b.bill_year,
        b.title AS bill_title
      FROM tuition_transaction_details td
      INNER JOIN tuition_transactions t
        ON t.id = td.transaction_id
       AND t.created_at = td.transaction_created_at
      INNER JOIN tuition_products p ON p.id = td.product_id
      INNER JOIN tuition_bills b ON b.id = td.bill_id
      WHERE t.id = ${tid}
    `) as NeonLine[];

    const sppLines = lines.filter((l) => /spp/i.test(String(l.product_name || '')));
    if (sppLines.length === 0) {
      await markSync(tid, 'skipped', null);
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity,
        status: 'skipped',
        errorMessage: 'no SPP lines',
        requestPayload: {
          lineCount: lines.length,
          products: lines.map((l) => l.product_name),
        },
      });
      return { outcome: 'skipped', error: 'no SPP lines' };
    }

    // Product map for first SPP product (same coa for all SPP in phase 1)
    const productId = sppLines[0].product_id;
    const prodMaps = (await sql`
      SELECT *
      FROM finance_zains_product_map
      WHERE product_id = ${productId}
        AND entity = ${entity}
      LIMIT 1
    `) as Record<string, unknown>[];
    const prodMap = prodMaps[0];
    if (!prodMap?.coa_kredit) {
      await markSync(tid, 'failed', null);
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity,
        status: 'failed',
        errorMessage: 'missing product map / coa_kredit',
        requestPayload: { productId },
      });
      return { outcome: 'failed', error: 'missing product map' };
    }

    let coaDebet = '';
    let idViaBayar = 2;
    if (tx.payment_method_id != null) {
      const pmRows = (await sql`
        SELECT zains_coa_debet, zains_id_via_bayar, category
        FROM tuition_payment_methods
        WHERE id = ${tx.payment_method_id}
        LIMIT 1
      `) as {
        zains_coa_debet: string | null;
        zains_id_via_bayar: number | null;
        category: string | null;
      }[];
      const pm = pmRows[0];
      if (pm?.zains_coa_debet) coaDebet = String(pm.zains_coa_debet);
      if (pm?.zains_id_via_bayar != null) idViaBayar = Number(pm.zains_id_via_bayar);
      else if (String(pm?.category || '').toLowerCase() === 'cash') idViaBayar = 1;
    }
    if (!coaDebet) {
      coaDebet =
        idViaBayar === 1
          ? String(schoolMap.coa_kas || '')
          : String(schoolMap.coa_bank || schoolMap.coa_kas || '');
    }
    if (!coaDebet) {
      await markSync(tid, 'failed', null);
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity,
        status: 'failed',
        errorMessage: 'missing coa_debet',
      });
      return { outcome: 'failed', error: 'missing coa_debet' };
    }

    const coaKredit = String(prodMap.coa_kredit);
    const idProgram = Number(prodMap.id_program) || 0;
    const paymentTotal = Number(tx.total_amount) || 0;
    // Settlement instant — format all FINS date fields in Asia/Jakarta (not UTC).
    const payRaw =
      tx.payment_date != null ? new Date(tx.payment_date) : new Date();
    const tgl = Number.isNaN(payRaw.getTime()) ? new Date() : payRaw;
    const tglExreJakarta = formatMysqlDatetimeJakarta(tgl);
    const mutasi = '1';
    const noresi = await nextNoresi(entity, mutasi, idKantor, tgl);
    const kary = await lookupKaryawan(entity, nikInput);

    const inserted: { id_exre: string; nominal: number }[] = [];
    let lineIndex = 0;

    for (const line of sppLines) {
      const nominal = Number(line.amount_paid) || 0;
      if (nominal <= 0) continue;
      lineIndex += 1;

      // Increment id_exre per line: reuse generator then adjust middle seq
      let idExre = await nextIdExre(entity, idKantor, tgl);
      if (lineIndex > 1) {
        // After first insert, nextIdExre already advances; regenerate each time is fine
        idExre = await nextIdExre(entity, idKantor, tgl);
      }

      const bulan = monthNameId(line.bill_month);
      const ta = tx.academic_year_name || '';
      const keteranganSuffix = ' : otomatis via app';
      const keteranganBase = [
        'Penerimaan SPP',
        bulan ? `Bulan ${bulan}` : null,
        tx.student_name || null,
        line.bill_title || null,
        ta ? `TA.${ta}` : null,
      ]
        .filter(Boolean)
        .join(' : ');
      const keterangan = (
        keteranganBase.slice(0, Math.max(0, 500 - keteranganSuffix.length)) + keteranganSuffix
      ).slice(0, 500);

      await zainsExecute(
        entity,
        `INSERT INTO fins_trans (
          id_trans, id_transaksi, id_exre, coa_ca, coa_debet, coa_kredit, nominal, keterangan,
          tgl_exre, fdt, coa, id_kantor, id_via_bayar, jenis, id_program, noresi, total, quantity,
          realisasi, dtu, approve, nik_input, id_jabatan, nik_input_atasan, mutasi,
          nik_approve, note, id_contact, nik_cair, kinerja
        ) VALUES (
          '', ?, ?, '', ?, ?, ?, ?,
          ?, NOW(), ?, ?, ?, 'r', ?, ?, ?, 1,
          0, NOW(), 'a', ?, ?, ?, ?,
          ?, ?, '', '', 'Komersil'
        )`,
        [
          idExre,
          idExre,
          coaDebet,
          coaKredit,
          nominal,
          keterangan,
          tglExreJakarta,
          coaDebet,
          idKantor,
          idViaBayar,
          idProgram,
          noresi,
          paymentTotal,
          nikInput,
          kary.id_jabatan,
          kary.nik_input_atasan,
          mutasi,
          nikApprove,
          `<id_tag>PaymentGateway</id_tag>#TX${tid}`,
        ]
      );
      inserted.push({ id_exre: idExre, nominal });
    }

    if (inserted.length === 0) {
      await markSync(tid, 'skipped', null);
      await writeLog({
        transactionId: tid,
        createdAt: tx.created_at,
        entity,
        status: 'skipped',
        errorMessage: 'no positive SPP amounts',
      });
      return { outcome: 'skipped', error: 'no positive SPP amounts' };
    }

    // Re-select real id_trans for first line
    const verify = await zainsQuery<RowDataPacket[]>(
      entity,
      `SELECT id_trans, id_exre, noresi FROM fins_trans WHERE noresi = ? ORDER BY id_exre LIMIT 1`,
      [noresi]
    );

    await markSync(tid, 'synced', noresi);
    await writeLog({
      transactionId: tid,
      createdAt: tx.created_at,
      entity,
      status: 'success',
      process: 'fins_receipt',
      idExre: String(verify[0]?.id_exre || inserted[0].id_exre),
      noresi,
      idTrans: verify[0]?.id_trans ? String(verify[0].id_trans) : null,
      requestPayload: {
        id_kantor: idKantor,
        coa_debet: coaDebet,
        coa_kredit: coaKredit,
        lines: inserted,
        total: paymentTotal,
      },
      responsePayload: verify[0] || inserted,
    });

    return { outcome: 'synced' };
  } catch (err) {
    const message = formatZainsJobError(err);
    console.error('zains_penerimaan_failed', { transactionId: tid, err: message, raw: err });
    try {
      await sql`
        UPDATE tuition_transactions
        SET zains_sync_status = 'failed'
        WHERE id = ${tid}
      `;
      await writeLog({
        transactionId: tid,
        createdAt: new Date(),
        entity: 'ijf',
        status: 'failed',
        errorMessage: message,
      });
    } catch (logErr) {
      console.error('zains_penerimaan_log_failed', logErr);
    }
    return { outcome: 'failed', error: message };
  }
}

function formatZainsJobError(err: unknown): string {
  if (err instanceof ZainsMysqlError || err instanceof ZainsDbConfigError) {
    return err.message;
  }
  const msg = err instanceof Error ? err.message : String(err);
  // Neon HTTP driver classic message — not MySQL.
  if (/fetch failed/i.test(msg) || /Error connecting to database/i.test(msg)) {
    return `Neon Postgres failed (not Zains MySQL yet): ${msg}`;
  }
  return msg.slice(0, 500);
}

async function markSync(
  transactionId: number,
  status: string,
  noresi: string | null
) {
  await sql`
    UPDATE tuition_transactions
    SET
      zains_sync_status = ${status},
      zains_synced_at = CASE WHEN ${status} = 'synced' THEN now() ELSE zains_synced_at END,
      zains_noresi = COALESCE(${noresi}, zains_noresi)
    WHERE id = ${transactionId}
  `;
}

async function writeLog(opts: {
  transactionId: number;
  createdAt: Date | string;
  entity: string;
  status: string;
  process?: string;
  idExre?: string | null;
  noresi?: string | null;
  idTrans?: string | null;
  errorMessage?: string | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
}) {
  await sql`
    INSERT INTO tuition_zains_log (
      transaction_id,
      transaction_created_at,
      request_payload,
      response_payload,
      url,
      process,
      status,
      entity,
      id_exre,
      noresi,
      id_trans,
      error_message,
      attempt_no
    ) VALUES (
      ${opts.transactionId},
      ${opts.createdAt},
      ${opts.requestPayload ? JSON.stringify(opts.requestPayload).slice(0, 8000) : null},
      ${opts.responsePayload ? JSON.stringify(opts.responsePayload).slice(0, 8000) : null},
      ${'mysql://zains/' + opts.entity},
      ${opts.process || 'fins_receipt'},
      ${opts.status},
      ${opts.entity},
      ${opts.idExre ?? null},
      ${opts.noresi ?? null},
      ${opts.idTrans ?? null},
      ${opts.errorMessage ?? null},
      1
    )
  `;
}
