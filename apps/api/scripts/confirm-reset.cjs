// Runs before `npm run setup`, which wipes the database and creates the test accounts.
// If the database already holds data, ask before wiping it, so the production database isn't reset by accident.
require("dotenv/config");
const readline = require("readline");

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to reset the database with NODE_ENV=production.");
    process.exit(1);
  }
  let counts;
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    counts = { users: await prisma.user.count(), orders: await prisma.order.count() };
    await prisma.$disconnect();
  } catch {
    return; // no tables yet (fresh database): nothing to lose
  }
  if (counts.users === 0 && counts.orders === 0) return;

  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").replace(/[/?].*$/, "");
  console.log(`\nThis will DELETE everything in the database at ${host || "(unknown host)"}:`);
  console.log(`  ${counts.users} accounts and ${counts.orders} orders, then load test data.`);
  console.log("Never run this against the production database.\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question('Type RESET to continue: ', r));
  rl.close();
  if (answer.trim() !== "RESET") {
    console.log("Cancelled. Nothing was changed.");
    process.exit(1);
  }
}

main();
