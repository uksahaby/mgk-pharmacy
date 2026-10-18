/**
 * Store identity and contact details used across the site.
 * Values marked PLACEHOLDER must be replaced with the pharmacy's real details before launch.
 */
export const site = {
  name: "MGK Pharmacy",
  shortName: "MGK",
  tagline: "Genuine medicines, checked by real pharmacists",
  description:
    "Licensed online pharmacy in Kano, Nigeria. Order genuine medicines and health products, upload prescriptions for pharmacist review, and get fast delivery across Nigeria.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  address: {
    line1: "Plot 53, Karkasara",
    line2: "Behind AKTH Exit Gate",
    city: "Kano",
    state: "Kano State",
    country: "Nigeria",
  },
  hours: [
    { days: "Monday – Saturday", time: "8:00am – 10:00pm" },
    { days: "Sunday", time: "12:00pm – 8:00pm" },
  ],
  /** Same hours as numbers (24h, Nigerian time) for "open now". Keep in sync with `hours`. Day 0 = Sunday. */
  openingHours: { 0: [12, 20], 1: [8, 22], 2: [8, 22], 3: [8, 22], 4: [8, 22], 5: [8, 22], 6: [8, 22] } as Record<number, [number, number]>,
  phone: "+234 800 000 0000", // PLACEHOLDER
  phoneHref: "tel:+2348000000000", // PLACEHOLDER
  whatsapp: "https://wa.me/2348000000000", // PLACEHOLDER
  email: "care@example.com", // PLACEHOLDER
  pcnPremisesNumber: "PCN/PR/000000", // PLACEHOLDER
  superintendent: "Pharm. [Name], MPCN", // PLACEHOLDER
  social: {
    instagram: "https://instagram.com/", // PLACEHOLDER
    x: "https://x.com/", // PLACEHOLDER
    facebook: "https://facebook.com/", // PLACEHOLDER
  },
};

const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

/** Whether the store is open right now in Nigeria (UTC+1, no daylight saving), with a short label. */
export function openStatus(now = new Date()) {
  const wat = new Date(now.getTime() + 3600_000);
  const day = wat.getUTCDay();
  const hour = wat.getUTCHours() + wat.getUTCMinutes() / 60;
  const [open, close] = site.openingHours[day];
  if (hour >= open && hour < close) return { open: true, label: `Open now · until ${hourLabel(close)}` };
  const opensToday = hour < open;
  const next = opensToday ? open : site.openingHours[(day + 1) % 7][0];
  return { open: false, label: `Closed · opens ${opensToday ? "" : "tomorrow "}${hourLabel(next)}` };
}
