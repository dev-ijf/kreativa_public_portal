/** Shared TTQ progress formulas — must stay identical to ERP admin. */

export function tilawahScore(jilid: number, halaman: number): number {
  return jilid * 1000 + halaman;
}

export function tilawahPct(
  jilid: number,
  halaman: number,
  targetJilid: number,
  targetHalaman: number
): number {
  const target = tilawahScore(targetJilid, targetHalaman);
  if (target <= 0) return 0;
  return Math.min(100, Math.round((tilawahScore(jilid, halaman) / target) * 100));
}

export function tahfidzPct(surahNo: number, targetSurahNo: number): number {
  const totalJourney = 114 - targetSurahNo;
  if (totalJourney <= 0) return surahNo <= targetSurahNo ? 100 : 0;
  const studentProgress = 114 - surahNo;
  return Math.min(100, Math.round((studentProgress / totalJourney) * 100));
}

export function avgPct(tilawah: number, tahfidz: number): number {
  return Math.round((tilawah + tahfidz) / 2);
}

export function isTilawahAchieved(
  jilid: number,
  halaman: number,
  targetJilid: number,
  targetHalaman: number
): boolean {
  return tilawahScore(jilid, halaman) >= tilawahScore(targetJilid, targetHalaman);
}

export function isTahfidzAchieved(surahNo: number, targetSurahNo: number): boolean {
  return surahNo <= targetSurahNo;
}
