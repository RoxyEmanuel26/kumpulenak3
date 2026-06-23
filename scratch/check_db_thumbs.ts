import { prisma } from '../lib/db/prisma';

async function main() {
  const video = await prisma.video.findFirst();
  console.log(JSON.stringify(video, null, 2));
}

main().catch(console.error);
