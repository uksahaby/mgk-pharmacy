/**
 * Creates the first administrator on a fresh (e.g. production) database, instead of the test accounts from the seed.
 *
 *   npm run create-admin -w apps/api -- --email you@example.com --first Ukashah --last Sahabi
 *
 * A one-time password is printed once, in this terminal only. The admin must choose their own at first sign-in.
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1]?.trim() : undefined;
}

async function main() {
  const email = arg("email")?.toLowerCase();
  const firstName = arg("first");
  const lastName = arg("last");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !firstName || !lastName) {
    console.error("Usage: npm run create-admin -w apps/api -- --email you@example.com --first First --last Last");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    if (await prisma.user.findUnique({ where: { email } })) {
      console.error(`An account for ${email} already exists. Change its role in Staff & roles instead.`);
      process.exit(1);
    }
    // 4 groups of 4 from an unambiguous alphabet, e.g. "k7mp-2xqr-9fdt-hw3c".
    const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
    const password = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("")).join("-");
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
        verificationStatus: "APPROVED",
      },
    });
    console.log(`\nAdministrator created: ${email}`);
    console.log(`One-time password:     ${password}`);
    console.log("Sign in with it, then choose your own password. It won't be shown again.\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
