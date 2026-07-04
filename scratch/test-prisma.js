const { Pool, neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;

const connectionString = "postgresql://neondb_owner:npg_D3Yv9HMEPCUA@ep-cool-boat-aoi3pbi8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = await prisma.category.findMany();
  console.log("SUCCESS", categories.length);
}

main().catch(console.error).finally(() => process.exit(0));
