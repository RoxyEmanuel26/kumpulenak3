import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/crypto";


async function main() {
  const email = process.env.ADMIN_EMAIL || "REDACTED_EMAIL";
  const defaultPassword = process.env.ADMIN_PASSWORD || "REDACTED_PASSWORD";
  
  if (!process.env.ADMIN_EMAIL) {
    console.warn("[Seed] WARNING: ADMIN_EMAIL environment variable is not defined. Using fallback email.");
  }
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("[Seed] WARNING: ADMIN_PASSWORD environment variable is not defined. Using fallback default password.");
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
