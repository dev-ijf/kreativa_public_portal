/**
 * VA 16 digit BMI (Muamalat): 4 digit BIN + 2 digit kode produk/sekolah + 10 digit id transaksi.
 * Input string sudah dinormalisasi di layer checkout (digit saja, panjang tepat).
 */

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Ambil hingga `len` digit pertama dari string (setelah strip non-digit). */
export function leadingDigits(s: string, len: number): string {
  const d = digitsOnly(s);
  if (d.length >= len) return d.slice(0, len);
  return d.padStart(len, '0').slice(0, len);
}

/** Dua digit terakhir dari angka school code (pad kiri). */
export function twoDigitSchoolCode(schoolCodeRaw: string): string {
  const d = digitsOnly(schoolCodeRaw);
  const padded = d.padStart(2, '0');
  return padded.slice(-2);
}

/** 10 digit kanan dari id transaksi (unik selama sequence id unik). */
export function tenDigitTransactionSuffix(transactionId: number | bigint): string {
  const n = typeof transactionId === 'bigint' ? Number(transactionId) : Math.floor(Number(transactionId));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('buildBmiVa16: transactionId tidak valid');
  }
  return String(n).padStart(10, '0').slice(-10);
}

/**
 * Bangun nomor VA numerik 16 digit.
 * @throws jika hasil bukan 16 digit numerik
 */
export function buildBmiVa16(params: {
  bankChannelCode: string;
  schoolCode: string;
  transactionId: number | bigint;
}): string {
  const part4 = leadingDigits(params.bankChannelCode, 4);
  const part2 = twoDigitSchoolCode(params.schoolCode);
  const part10 = tenDigitTransactionSuffix(params.transactionId);
  const va = `${part4}${part2}${part10}`;
  if (!/^\d{16}$/.test(va)) {
    throw new Error(`buildBmiVa16: hasil bukan 16 digit (dapat "${va}")`);
  }
  return va;
}

/** Tampilan dengan spasi per 4 digit. */
export function formatVaDisplay(va16: string): string {
  const d = digitsOnly(va16);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
