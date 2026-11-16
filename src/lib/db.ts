import "server-only";
import { neon, Pool, type PoolClient } from "@neondatabase/serverless";
import { env } from "./env";

let pool: Pool | undefined;
const getPool = () => (pool ??= new Pool({ connectionString: env().DATABASE_URL, max: 5 }));
// Requêtes simples : HTTPS (une requête = un appel, pas de connexion à maintenir ; adapté au serverless et aux réseaux instables).
// Transactions : connexion WebSocket du Pool (tx ci-dessous).
let http: ReturnType<typeof neon> | undefined;
const getHttp = () => (http ??= neon(env().DATABASE_URL));

type Param = string | number | boolean | null | Date | string[] | Record<string, unknown> | unknown[];

/** Requête paramétrée ($1, $2…) : jamais de concaténation de données externes. */
export async function q<T = Record<string, unknown>>(text: string, params: Param[] = []): Promise<T[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return (await getHttp().query(text, params)) as T[];
    } catch (e) {
      if (attempt >= 4 || !retryable(e, text)) throw e;
      await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1))); // 0,5 s, 1 s, 2 s : le temps qu'un DNS capricieux réponde
    }
  }
}

const CONNECT = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT|ENETUNREACH/;
/** Réseau instable : on réessaie si la connexion n'a pas pu s'établir (requête jamais exécutée), ou pour une simple lecture. */
export function retryable(e: unknown, text: string): boolean {
  const err = e as { message?: string; sourceError?: { cause?: { code?: string } }; cause?: { code?: string } };
  const code = err.sourceError?.cause?.code ?? err.cause?.code ?? "";
  if (CONNECT.test(code)) return true;
  const network = /fetch failed|Error connecting to database/i.test(err.message ?? "");
  return network && /^\s*(SELECT|WITH)\b/i.test(text) && !/\b(INSERT|UPDATE|DELETE)\b/i.test(text);
}

export async function one<T = Record<string, unknown>>(text: string, params: Param[] = []): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}

export type Tx = {
  q: <T = Record<string, unknown>>(text: string, params?: Param[]) => Promise<T[]>;
  one: <T = Record<string, unknown>>(text: string, params?: Param[]) => Promise<T | undefined>;
};

/** Transaction interactive : COMMIT si tout réussit, ROLLBACK sinon. */
export async function tx<R>(fn: (t: Tx) => Promise<R>): Promise<R> {
  const client: PoolClient = await getPool().connect();
  const t: Tx = {
    q: async <T,>(text: string, params: Param[] = []) => (await client.query(text, params)).rows as T[],
    one: async <T,>(text: string, params: Param[] = []) => (await client.query(text, params)).rows[0] as T | undefined,
  };
  try {
    await client.query("BEGIN");
    const result = await fn(t);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
