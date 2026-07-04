const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL || "postgresql://neondb_owner:npg_D3Yv9HMEPCUA@ep-cool-boat-aoi3pbi8-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function run() {
  const categories = await sql`
    SELECT c.name, COUNT(vc."videoId") as count
    FROM "Category" c
    LEFT JOIN "VideoCategory" vc ON c.id = vc."categoryId"
    GROUP BY c.id
    ORDER BY c.name ASC
  `;
  console.log(categories);
}
run();
