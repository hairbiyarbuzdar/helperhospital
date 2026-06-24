import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = "admin";
  // Default credentials — CHANGE THE PASSWORD AFTER FIRST LOGIN.
  const password = "admin123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      email: "admin@helperhospital.local",
      name: "System Administrator",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log(`✔ Admin user ready: "${admin.username}" (id: ${admin.id})`);
  console.log(`  Login with username "admin" / password "admin123".`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
