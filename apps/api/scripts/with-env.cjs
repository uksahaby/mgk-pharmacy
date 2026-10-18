// Runs a command with the variables from a specific env file, e.g. the production database, without touching .env.
//   node scripts/with-env.cjs .env.production npm run db:migrate
// Variables from the file win over .env (Prisma and dotenv never override variables that are already set).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

const [file, ...cmd] = process.argv.slice(2);
if (!file || !cmd.length) {
  console.error("Usage: node scripts/with-env.cjs <env-file> <command...>");
  process.exit(1);
}
const full = path.resolve(file);
if (!fs.existsSync(full)) {
  console.error(`No such file: ${full}`);
  process.exit(1);
}
const vars = dotenv.parse(fs.readFileSync(full));
const host = (vars.DATABASE_URL || "").replace(/^.*@/, "").replace(/[/?].*$/, "");
console.log(`Using ${path.basename(full)} (database: ${host || "not set"})`);
const r = spawnSync(cmd.join(" "), { stdio: "inherit", shell: true, env: { ...process.env, ...vars } });
process.exit(r.status ?? 1);
