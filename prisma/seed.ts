import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/crypto";


async function main() {
  const email = "REDACTED_EMAIL";
  const defaultPassword = "REDACTED_PASSWORD";
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
