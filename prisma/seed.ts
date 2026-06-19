import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/crypto";


async function main() {
  const email = process.env.ADMIN_EMAIL;
  const defaultPassword = process.env.ADMIN_PASSWORD;
  
  if (!email || !defaultPassword) {
    throw new Error("[Seed] ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be defined in your local .env file. Seeding aborted.");
  }
  
  const hashedPassword = hashPassword(defaultPassword);

  console.log("Seeding admin user...");
  
  await prisma.adminUser.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name: "Super Admin",
    },
    create: {
      email,
      password: hashedPassword,
      name: "Super Admin",
    },
  });

  console.log("Admin user seeded successfully.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${defaultPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
