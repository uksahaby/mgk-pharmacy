// Creates apps/api/.env from .env.example on first setup, with a random JWT secret.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (!fs.existsSync(envPath)) {
  const example = fs.readFileSync(examplePath, "utf8");
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(envPath, example.replace("JWT_SECRET=change-me", `JWT_SECRET=${secret}`));
  console.log("Created apps/api/.env from .env.example");
}

fs.mkdirSync(path.join(root, "uploads"), { recursive: true });
