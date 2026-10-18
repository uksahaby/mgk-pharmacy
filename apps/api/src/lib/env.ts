import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}. Run \`npm run setup\` first.`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  isProd: process.env.NODE_ENV === "production",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  jwtSecret: required("JWT_SECRET"),
  paystackSecret: process.env.PAYSTACK_SECRET_KEY ?? "",
  bank: {
    name: process.env.BANK_NAME ?? "",
    accountName: process.env.BANK_ACCOUNT_NAME ?? "",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
  },
  unpaidOrderTtlHours: Number(process.env.UNPAID_ORDER_TTL_HOURS ?? 48),
  /** Pharmacy location: where deliveries start. */
  store: {
    lat: Number(process.env.STORE_LAT ?? 11.9976),
    lng: Number(process.env.STORE_LNG ?? 8.5154),
  },
  geocoderUrl: process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search",
  /** Cloudflare R2 bucket for private uploads. Without it, files go to the local uploads/ folder (development only). */
  r2: process.env.R2_BUCKET
    ? {
        accountId: required("R2_ACCOUNT_ID"),
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
        bucket: process.env.R2_BUCKET,
      }
    : null,
  /** Shared with the website, which forwards the visitor's real IP address alongside it (see clientIp in app.ts). */
  proxySecret: process.env.PROXY_SECRET ?? "",
};

if (env.isProd && (env.jwtSecret === "change-me" || env.jwtSecret.length < 32)) {
  throw new Error("JWT_SECRET must be set to a strong random value (32+ characters) in production.");
}
if (env.isProd && !env.r2) {
  throw new Error("R2_BUCKET and the R2_* keys must be set in production: the server disk is not kept between deploys.");
}
