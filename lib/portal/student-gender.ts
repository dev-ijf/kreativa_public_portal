/** True when core_students.gender indicates female (P / perempuan / female). */
export function isFemaleStudent(gender: string | null | undefined): boolean {
  if (!gender) return false;
  const g = gender.trim().toLowerCase();
  return g === 'p' || g === 'f' || g === 'female' || g === 'perempuan';
}
