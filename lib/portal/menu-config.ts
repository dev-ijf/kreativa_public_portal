import type { ReactNode } from 'react';

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
 */
export const MENU_CONFIG: MenuItemConfig[] = [
  { moduleCode: 'financial', href: '/finance', labelKey: 'tuition', color: 'bg-indigo-100', iconColor: 'text-primary' },
  { moduleCode: 'schedules', href: '/schedules', labelKey: 'schedules', color: 'bg-blue-100', iconColor: 'text-blue-600' },
  { moduleCode: 'attendance', href: '/attendance', labelKey: 'attendance', color: 'bg-orange-100', iconColor: 'text-orange-600' },
  { moduleCode: 'report', href: '/report', labelKey: 'report', color: 'bg-purple-100', iconColor: 'text-purple-600' },
  { moduleCode: 'agenda', href: '/agenda', labelKey: 'agenda', color: 'bg-red-100', iconColor: 'text-red-600' },
  { moduleCode: 'updates', href: '/updates', labelKey: 'updates', color: 'bg-teal-100', iconColor: 'text-teal-600' },
  { moduleCode: 'adaptive-learning', href: '/adaptive-learning', labelKey: 'adaptiveLearning', color: 'bg-pink-100', iconColor: 'text-pink-600' },
  { moduleCode: 'habits', href: '/habits', labelKey: 'habits', color: 'bg-emerald-100', iconColor: 'text-emerald-600' },
];

export type ModuleActiveMap = Record<string, boolean>;

/**
 * Build a lookup map from module_code -> is_active.
 * Modules not found in DB default to active (true).
 */
export function buildModuleActiveMap(modules: { module_code: string; is_active: boolean }[]): ModuleActiveMap {
  const map: ModuleActiveMap = {};
  for (const m of modules) {
    map[m.module_code] = m.is_active;
  }
  return map;
}

/**
 * Check if a menu item is active based on the module map.
 * If the module_code is not in the map, default to active.
 */
export function isModuleActive(map: ModuleActiveMap, moduleCode: string): boolean {
  return map[moduleCode] ?? true;
}
