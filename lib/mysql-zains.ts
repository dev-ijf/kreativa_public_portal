import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';

export type ZainsEntity = 'ijf' | 'yaim';

/** Bind values accepted by mysql2 `query` / `execute`. */
export type ZainsSqlParam =
  | string
  | number
  | bigint
  | boolean
  | Date
  | Buffer
  | Uint8Array
  | null;

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

export class ZainsMysqlError extends Error {
  entity: ZainsEntity;
  code?: string;
  constructor(entity: ZainsEntity, message: string, code?: string) {
    super(message);
    this.name = 'ZainsMysqlError';
    this.entity = entity;
    this.code = code;
  }
}

function resolveConfig(entity: ZainsEntity): {
  host: string;
  user: string;
  password: string;
  port: number;
  database: string;
} {
  const host = process.env.HOST_DB?.trim();
  const user = process.env.USER_DB?.trim();
  const password = process.env.PASS_DB ?? '';
  const port = Number(process.env.PORT_DB || '3306');
  const database = dbNameForEntity(entity);

  if (!host || !user || !database) {
    throw new ZainsDbConfigError(
      entity,
      `Missing Zains MySQL env for entity=${entity} (need HOST_DB, USER_DB, DB_${entity === 'ijf' ? 'IJF' : 'YAIM'})`
    );
  }

  return {
    host,
    user,
    password,
    port: Number.isFinite(port) ? port : 3306,
    database,
  };
}

export function getZainsPool(entity: ZainsEntity): Pool {
  const existing = pools.get(entity);
  if (existing) return existing;

  const cfg = resolveConfig(entity);

  const pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 2,
    connectTimeout: 20000,
    enableKeepAlive: true,
    timezone: '+07:00',
  });
  pools.set(entity, pool);
  return pool;
}

function wrapMysqlErr(entity: ZainsEntity, err: unknown): ZainsMysqlError {
  const cfg = (() => {
    try {
      return resolveConfig(entity);
    } catch {
      return null;
    }
  })();
  const target = cfg
    ? `${cfg.host}:${cfg.port}/${cfg.database}`
    : `entity=${entity}`;
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : undefined;
  const base = err instanceof Error ? err.message : String(err);
  return new ZainsMysqlError(
    entity,
    `Zains MySQL failed (${target}): ${base}`,
    code || undefined
  );
}

export async function zainsQuery<T extends RowDataPacket[]>(
  entity: ZainsEntity,
  sqlText: string,
  params: ZainsSqlParam[] = []
): Promise<T> {
  try {
    const pool = getZainsPool(entity);
    const [rows] = await pool.query<T>(sqlText, params);
    return rows;
  } catch (err) {
    if (err instanceof ZainsDbConfigError || err instanceof ZainsMysqlError) throw err;
    throw wrapMysqlErr(entity, err);
  }
}

export async function zainsExecute(
  entity: ZainsEntity,
  sqlText: string,
  params: ZainsSqlParam[] = []
): Promise<ResultSetHeader> {
  try {
    const pool = getZainsPool(entity);
    const [result] = await pool.execute<ResultSetHeader>(sqlText, params);
    return result;
  } catch (err) {
    if (err instanceof ZainsDbConfigError || err instanceof ZainsMysqlError) throw err;
    throw wrapMysqlErr(entity, err);
  }
}

/** Connectivity check for diagnostics (does not leave a pool entry on failure). */
export async function zainsPing(entity: ZainsEntity = 'ijf'): Promise<Record<string, unknown>> {
  const t0 = Date.now();
  let cfg: ReturnType<typeof resolveConfig>;
  try {
    cfg = resolveConfig(entity);
  } catch (e) {
    return {
      ok: false,
      entity,
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
    };
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 15000,
      timezone: '+07:00',
    });
    const [rows] = await conn.query<RowDataPacket[]>('SELECT 1 AS ok, DATABASE() AS db');
    return {
      ok: true,
      entity,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      db: rows[0]?.db ?? null,
      ms: Date.now() - t0,
    };
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: unknown }).code ?? '')
        : null;
    return {
      ok: false,
      entity,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      code,
      error: err instanceof Error ? err.message : String(err),
      ms: Date.now() - t0,
      hint:
        code === 'ETIMEDOUT' || code === 'ECONNREFUSED'
          ? 'Vercel cannot reach this MySQL host:port. Open firewall for Vercel egress, or confirm PORT_DB (3306 vs 8888).'
          : code === 'ER_ACCESS_DENIED_ERROR'
            ? 'Wrong USER_DB / PASS_DB for this host.'
            : undefined,
    };
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch {
        /* ignore */
      }
    }
  }
}
