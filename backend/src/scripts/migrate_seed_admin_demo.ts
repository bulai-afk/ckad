import "dotenv/config";
import { prisma } from "../prisma";
import { hashPassword } from "../lib/password";

async function main() {
  const username = "demo";
  const plainPassword = "demo";
  const passwordHash = await hashPassword(plainPassword);

  const user = await prisma.user.upsert({
    where: { email: username },
    update: {
      password: passwordHash,
      role: "ADMIN",
      name: "Demo Admin",
    },
    create: {
      email: username,
      password: passwordHash,
      role: "ADMIN",
      name: "Demo Admin",
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log("[migrate_seed_admin_demo] done", user);
}

void main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[migrate_seed_admin_demo] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

