export type KgHabitDefinition = {
  id: number;
  code: string;
  parentCode: string | null;
  nameEn: string;
  nameId: string;
  descriptionEn: string | null;
  descriptionId: string | null;
  sortOrder: number;
  accentColor: string | null;
  bgColor: string | null;
  iconKey: string | null;
};

export type KgHabitTreeItem = KgHabitDefinition & {
  children: KgHabitDefinition[];
};

export type KgHabitDayPayload = {
  items: Record<string, boolean>;
  notes: string;
};

export type KgHabitDayResponse = {
  habitDate: string;
  notes: string;
  items: Record<string, boolean>;
  teacherConfirmed: boolean;
  teacherConfirmedAt: string | null;
  loggedByUserId: number | null;
};

export type KgHabitMonthStat = {
  code: string;
  daysDone: number;
  daysInMonth: number;
};

export function buildHabitTree(defs: KgHabitDefinition[]): KgHabitTreeItem[] {
  const tops = defs
    .filter((d) => !d.parentCode)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return tops.map((t) => ({
    ...t,
    children: defs
      .filter((d) => d.parentCode === t.code)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export function isTopLevelHabitDone(
  def: KgHabitTreeItem,
  doneByCode: Record<string, boolean>,
): boolean {
  if (def.children.length === 0) return doneByCode[def.code] === true;
  return def.children.every((c) => doneByCode[c.code] === true);
}

export function countTopLevelDone(
  tree: KgHabitTreeItem[],
  doneByCode: Record<string, boolean>,
): { done: number; total: number } {
  return {
    total: tree.length,
    done: tree.filter((h) => isTopLevelHabitDone(h, doneByCode)).length,
  };
}

export function toggleableCodes(tree: KgHabitTreeItem[]): string[] {
  const out: string[] = [];
  for (const h of tree) {
    if (h.children.length === 0) out.push(h.code);
    else for (const c of h.children) out.push(c.code);
  }
  return out;
}

export function emptyItems(tree: KgHabitTreeItem[]): Record<string, boolean> {
  const items: Record<string, boolean> = {};
  for (const code of toggleableCodes(tree)) items[code] = false;
  return items;
}

export function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
