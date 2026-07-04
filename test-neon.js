const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
neonConfig.webSocketConstructor = ws;

const connectionString = "postgresql://neondb_owner:npg_D3Yv9HMEPCUA@ep-cool-boat-aoi3pbi8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString });
pool.query('SELECT 1').then(res => {
  console.log("SUCCESS", res.rows);
  process.exit(0);
}).catch(err => {
  console.error("ERROR", err);
  process.exit(1);
});
