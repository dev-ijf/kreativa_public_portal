import type { PortalAgendaRow } from '@/lib/data/server/agendas';

/** Agenda rows for the active child: same school, and grade when event is grade-specific. */
export function agendaForChild(
  rows: PortalAgendaRow[],
  schoolId: number,
  levelGradeName: string | null,
): PortalAgendaRow[] {
  return rows.filter((row) => {
    if (row.schoolId !== schoolId) return false;
    if (row.targetGrade == null) return true;
    if (levelGradeName == null) return false;
    return row.targetGrade === levelGradeName;
  });
}
