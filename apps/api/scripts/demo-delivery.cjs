// Dev helper: creates a delivery order, dispatches it to the seed rider and starts the simulated drive.
const fs = require("fs");
const path = require("path");
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
const API = "http://localhost:4000";
const call = async (p, { method = "GET", body, cookie } = {}) => {
  const r = await fetch(API + p, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await r.json();
  if (!r.ok) throw new Error(`${p}: ${json.error}`);
  return { json, cookie: (r.headers.get("set-cookie") || "").split(";")[0] };
};
(async () => {
  const { json: list } = await call("/products?q=coartem&inStock=true&pageSize=1");
  const { json: order } = await call("/orders", { method: "POST", body: {
    items: [{ productId: list.products[0].id, quantity: 1 }], fulfilment: "DELIVERY",
    contact: { firstName: "Demo", lastName: "Customer", email: "demo.customer@example.com", phone: "08031112222" },
    address: { line1: "15 Zoo Road", city: "Kano", state: "Kano", landmark: "Near Kano Zoo", lat: 11.9668, lng: 8.5491 },
    paymentMethod: "BANK_TRANSFER", notes: "Live tracking demo",
  } });
  const staff = (await call("/auth/login", { method: "POST", body: { email: env.SEED_PHARMACIST_EMAIL, password: env.SEED_PHARMACIST_PASSWORD } })).cookie;
  await call(`/admin/orders/${order.number}/mark-paid`, { method: "POST", body: {}, cookie: staff });
  const { json: r } = await call("/admin/riders", { cookie: staff });
  await call(`/admin/orders/${order.number}/status`, { method: "POST", body: { status: "DISPATCHED", riderId: r.riders[0].id }, cookie: staff });
  const rider = (await call("/auth/login", { method: "POST", body: { email: env.SEED_RIDER_EMAIL, password: env.SEED_RIDER_PASSWORD } })).cookie;
  await call(`/rider/deliveries/${order.number}/simulate`, { method: "POST", cookie: rider });
  console.log(`http://localhost:3000/order/${order.number}?key=${order.accessKey}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
