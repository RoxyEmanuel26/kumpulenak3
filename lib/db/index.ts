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
    // Allow 10s (was 5s) so Neon Serverless scale-to-zero cold wake-ups (4-7s)
    // succeed reliably while still failing fast when Neon is genuinely unreachable.
    connect_timeout: 10,
  });

globalForSql.sql = sql;

