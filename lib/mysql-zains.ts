import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';

export type ZainsEntity = 'ijf' | 'yaim';

const pools = new Map<ZainsEntity, Pool>();

function dbNameForEntity(entity: ZainsEntity): string | null {
  const name =
    entity === 'ijf'
      ? process.env.DB_IJF?.trim()
      : process.env.DB_YAIM?.trim();
  return name || null;
}

export class ZainsDbConfigError extends Error {
  entity: ZainsEntity;
  constructor(entity: ZainsEntity, message: string) {
    super(message);
    this.name = 'ZainsDbConfigError';
    this.entity = entity;
  }
}

export function getZainsPool(entity: ZainsEntity): Pool {
  const existing = pools.get(entity);
  if (existing) return existing;

  const host = process.env.HOST_DB?.trim();
  const user = process.env.USER_DB?.trim();
  const password = process.env.PASS_DB ?? '';
  const port = Number(process.env.PORT_DB || '3306');
  const database = dbNameForEntity(entity);

  if (!host || !user || !database) {
    throw new ZainsDbConfigError(
      entity,
      `Missing Zains MySQL env for entity=${entity}`
    );
  }

  const pool = mysql.createPool({
    host,
    port: Number.isFinite(port) ? port : 3306,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 10000,
    enableKeepAlive: true,
    timezone: '+07:00',
  });
  pools.set(entity, pool);
  return pool;
}

export async function zainsQuery<T extends RowDataPacket[]>(
  entity: ZainsEntity,
  sqlText: string,
  params: unknown[] = []
): Promise<T> {
  const pool = getZainsPool(entity);
  const [rows] = await pool.query<T>(sqlText, params);
  return rows;
}

export async function zainsExecute(
  entity: ZainsEntity,
  sqlText: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const pool = getZainsPool(entity);
  const [result] = await pool.execute<ResultSetHeader>(sqlText, params);
  return result;
}
