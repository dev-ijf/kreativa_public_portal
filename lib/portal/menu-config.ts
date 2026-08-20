export type MenuItemConfig = {
  moduleCode: string;
  href: string;
  labelKey: string;
  color: string;
  iconColor: string;
};

/**
 * Static mapping from module_code to UI properties.
 * Icons are provided separately at render time (since they are JSX elements).
 * 11 tiles (Messages replaces Izin; Profile removed from Quick Menus).
 */
export const MENU_CONFIG: MenuItemConfig[] = [
  { moduleCode: 'financial', href: '/finance', labelKey: 'tuition', color: 'bg-indigo-100', iconColor: 'text-primary' },
  { moduleCode: 'schedules', href: '/schedules', labelKey: 'schedules', color: 'bg-blue-100', iconColor: 'text-blue-600' },
  { moduleCode: 'attendance', href: '/attendance', labelKey: 'attendance', color: 'bg-orange-100', iconColor: 'text-orange-600' },
  { moduleCode: 'report', href: '/report', labelKey: 'report', color: 'bg-purple-100', iconColor: 'text-purple-600' },
  { moduleCode: 'agenda', href: '/updates?tab=agenda', labelKey: 'agenda', color: 'bg-sky-100', iconColor: 'text-sky-600' },
  { moduleCode: 'updates', href: '/updates', labelKey: 'updates', color: 'bg-teal-100', iconColor: 'text-teal-600' },
  { moduleCode: 'adaptive-learning', href: '/adaptive-learning', labelKey: 'adaptiveLearning', color: 'bg-pink-100', iconColor: 'text-pink-600' },
  { moduleCode: 'habits', href: '/habits', labelKey: 'habits', color: 'bg-emerald-100', iconColor: 'text-emerald-600' },
  { moduleCode: 'kg-habits', href: '/7-habits', labelKey: 'kgHabits', color: 'bg-fuchsia-100', iconColor: 'text-fuchsia-700' },
  { moduleCode: 'ttq', href: '/ttq', labelKey: 'ttq', color: 'bg-violet-100', iconColor: 'text-violet-700' },
  { moduleCode: 'dr-messages', href: '/messages', labelKey: 'drMessages', color: 'bg-amber-100', iconColor: 'text-amber-700' },
];

export type ModuleActiveMap = Record<string, boolean>;

/** schoolId -> module_code -> visible */
export type SchoolModuleActiveMaps = Record<number, ModuleActiveMap>;

type AccessInput = {
  module_code: string;
  school_id: number;
  is_visible: boolean;
};

/**
 * Build per-school visibility maps.
 * Module must be globally active AND have a school access row with is_visible.
 * Missing school access => false (deny by default).
 */
export function buildSchoolModuleActiveMaps(
  modules: { module_code: string; is_active: boolean }[],
  access: AccessInput[],
  schoolIds: number[],
): SchoolModuleActiveMaps {
  const globalActive = new Map(modules.map((m) => [m.module_code, m.is_active]));
  const maps: SchoolModuleActiveMaps = {};

  for (const schoolId of schoolIds) {
    const map: ModuleActiveMap = {};
    for (const m of modules) {
      map[m.module_code] = false;
    }
    maps[schoolId] = map;
  }

  for (const row of access) {
    const schoolMap = maps[row.school_id];
    if (!schoolMap) continue;
    const globallyOn = globalActive.get(row.module_code) ?? false;
    schoolMap[row.module_code] = globallyOn && row.is_visible === true;
  }

  return maps;
}

/**
 * @deprecated Prefer school-scoped maps via buildSchoolModuleActiveMaps.
 * Kept for any legacy callers — defaults missing codes to inactive.
 */
export function buildModuleActiveMap(modules: { module_code: string; is_active: boolean }[]): ModuleActiveMap {
  const map: ModuleActiveMap = {};
  for (const m of modules) {
    map[m.module_code] = m.is_active;
  }
  return map;
}

/**
 * Check if a menu item is active for a school map.
 * Missing module_code defaults to inactive.
 */
export function isModuleActive(map: ModuleActiveMap | undefined, moduleCode: string): boolean {
  if (!map) return false;
  return map[moduleCode] ?? false;
}

export function isModuleActiveForSchool(
  maps: SchoolModuleActiveMaps,
  schoolId: number | null | undefined,
  moduleCode: string,
): boolean {
  if (schoolId == null || !Number.isFinite(schoolId)) return false;
  return isModuleActive(maps[schoolId], moduleCode);
}
