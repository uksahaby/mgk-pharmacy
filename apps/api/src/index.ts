import { env } from "./lib/env";
import { createApp } from "./app";
import { expireUnpaidOrders } from "./lib/orders";

const app = createApp();

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

// Housekeeping: cancel stale unpaid bank-transfer orders every 15 minutes.
setInterval(() => expireUnpaidOrders().catch((e) => console.error("[jobs] expireUnpaidOrders failed", e)), 15 * 60 * 1000);
