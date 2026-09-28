import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const DEMO_EMAIL = "demo@jobmatch.local";
const DEMO_PASSWORD = "demo-password";

async function main() {
  const { prisma } = await import("../src/server/db");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, name: "Demo User", passwordHash },
    update: { passwordHash },
  });
  await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      headline: "Backend engineer",
      yearsExperience: 5,
      location: "Helsinki, Finland",
      desiredRoles: ["Backend Engineer", "Platform Engineer"],
      preferredLocations: ["Helsinki", "Remote (EU)"],
      workMode: "HYBRID",
      languages: ["English", "Finnish"],
      industries: ["Fintech"],
    },
    update: {},
  });
  console.log(`Seeded demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
