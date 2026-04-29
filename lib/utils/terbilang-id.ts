/** Terbilang Rupiah (bilangan bulat, bahasa Indonesia, huruf besar). */
const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

function sebutRatusan(n: number): string {
  if (n === 0) return '';
  const r = Math.floor(n / 100);
  const p = Math.floor((n % 100) / 10);
  const s = n % 10;
  const parts: string[] = [];
  if (r === 1) parts.push('seratus');
  else if (r > 1) parts.push(`${satuan[r]} ratus`);
  if (p === 1) {
    if (s === 0) parts.push('sepuluh');
    else if (s === 1) parts.push('sebelas');
    else parts.push(`${satuan[s]} belas`);
  } else if (p > 1) {
    parts.push(`${satuan[p]} puluh`);
    if (s > 0) parts.push(satuan[s]);
  } else if (s > 0 && p === 0) {
    parts.push(satuan[s]);
  }
  return parts.join(' ').trim();
}

function sebutGroup(n: number, suffix: string): string {
  if (n === 0) return '';
  const core = sebutRatusan(n);
  return core ? `${core} ${suffix}`.trim() : '';
}

export function terbilangRupiahUpper(n: number): string {
  if (!Number.isFinite(n) || n < 0) return 'NOL RUPIAH';
  const x = Math.min(Math.floor(n), 999_999_999_999_999);
  if (x === 0) return 'NOL RUPIAH';
  const triliun = Math.floor(x / 1_000_000_000_000);
  const miliar = Math.floor((x % 1_000_000_000_000) / 1_000_000_000);
  const juta = Math.floor((x % 1_000_000_000) / 1_000_000);
  const ribu = Math.floor((x % 1_000_000) / 1000);
  const sisa = x % 1000;
  const parts: string[] = [];
  if (triliun > 0) parts.push(sebutGroup(triliun, 'triliun'));
  if (miliar > 0) parts.push(sebutGroup(miliar, 'miliar'));
  if (juta > 0) parts.push(sebutGroup(juta, 'juta'));
  if (ribu > 0) {
    if (ribu === 1) parts.push('seribu');
    else parts.push(sebutGroup(ribu, 'ribu'));
  }
  if (sisa > 0) parts.push(sebutRatusan(sisa));
  return `${parts.join(' ').trim()} rupiah`.toUpperCase();
}
