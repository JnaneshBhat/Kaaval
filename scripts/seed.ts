import { PrismaStore, prisma } from "../src/store/prisma-store";
import { seedDemoData } from "../src/lib/seed";

(async () => {
  const r = await seedDemoData(new PrismaStore());
  console.log("Seeded Kaaval demo data:", r);
  await prisma.$disconnect();
})().catch((e) => { console.error("Seed failed. Did you run `npx prisma db push`?\n", e); process.exit(1); });
