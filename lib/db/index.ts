import postgres from "postgres";

const globalForSql = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

export const sql =
  globalForSql.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    // Fail fast (default 30s) so pages fall back to Eporner/JSON quickly
    // when Neon is suspended, over quota, or unreachable.
    connect_timeout: 5,
  });

if (process.env.NODE_ENV !== "production") globalForSql.sql = sql;

