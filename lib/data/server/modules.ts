import { sql } from '@/lib/db/client';

export type AppModule = {
  id: number;
  module_code: string;
  module_name: string;
  is_active: boolean;
};

export async function getAppModules(): Promise<AppModule[]> {
  const rows = await sql`SELECT id, module_code, module_name, is_active FROM core_app_modules ORDER BY id`;
  return rows as AppModule[];
}
