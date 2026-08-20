import { sql } from '@/lib/db/client';
import {
  PORTAL_MODULES_TTL_SEC,
  portalModulesSchoolKey,
} from '@/lib/cache/portal-modules';
import { cacheGetJson, cacheSetJsonTtl } from '@/lib/cache/upstash-redis';
import {
  buildSchoolModuleActiveMaps,
  type ModuleActiveMap,
  type SchoolModuleActiveMaps,
} from '@/lib/portal/menu-config';

export type AppModule = {
  id: number;
  module_code: string;
  module_name: string;
  is_active: boolean;
};

export type ModuleAccessRow = {
  module_id: number;
  module_code: string;
  school_id: number;
  is_visible: boolean;
};

export async function getAppModules(): Promise<AppModule[]> {
  const rows = await sql`SELECT id, module_code, module_name, is_active FROM core_app_modules ORDER BY id`;
  return rows as AppModule[];
}

async function loadMapsFromDb(schoolIds: number[]): Promise<SchoolModuleActiveMaps> {
  const modules = await getAppModules();
  if (schoolIds.length === 0) {
    return buildSchoolModuleActiveMaps(modules, [], []);
  }

  const access = (await sql`
    SELECT
      ma.module_id,
      m.module_code,
      ma.school_id,
      ma.is_visible
    FROM core_module_access ma
    JOIN core_app_modules m ON m.id = ma.module_id
    WHERE ma.school_id = ANY(${schoolIds}::int[])
      AND ma.level_grade_id IS NULL
  `) as ModuleAccessRow[];

  return buildSchoolModuleActiveMaps(modules, access, schoolIds);
}

/**
 * Load per-school module visibility for the given school IDs.
 * A module is active for a school when core_app_modules.is_active
 * AND a core_module_access row exists with is_visible = true (level_grade ignored).
 * Missing access row => inactive (deny by default).
 *
 * Redis cache-aside per school (`portal:modules:v1:school:{id}`);
 * kreativa_erp invalidates on module-access / app-modules writes.
 */
export async function getSchoolModuleActiveMaps(
  schoolIds: number[],
): Promise<SchoolModuleActiveMaps> {
  const uniqueIds = [...new Set(schoolIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (uniqueIds.length === 0) return {};

  const maps: SchoolModuleActiveMaps = {};
  const missing: number[] = [];

  await Promise.all(
    uniqueIds.map(async (schoolId) => {
      const cached = await cacheGetJson<ModuleActiveMap>(portalModulesSchoolKey(schoolId));
      if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
        maps[schoolId] = cached;
      } else {
        missing.push(schoolId);
      }
    }),
  );

  if (missing.length === 0) return maps;

  const fresh = await loadMapsFromDb(missing);
  await Promise.all(
    missing.map(async (schoolId) => {
      const map = fresh[schoolId] ?? {};
      maps[schoolId] = map;
      await cacheSetJsonTtl(portalModulesSchoolKey(schoolId), map, PORTAL_MODULES_TTL_SEC);
    }),
  );

  return maps;
}
