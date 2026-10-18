/** Delivery zones and fees (kobo). Used by the seed (local) and by `npm run init:store` (production). */
export const SHIPPING_ZONES = [
  { code: "KANO", name: "Kano", description: "Kano metropolis and Kano State", states: "Kano", feeKobo: 1000_00, etaLabel: "Same or next working day", sortOrder: 0 },
  { code: "NORTH", name: "Northern neighbours", description: "Jigawa, Katsina, Kaduna, Bauchi, Zamfara, Sokoto, Kebbi, Gombe, Yobe", states: "Jigawa,Katsina,Kaduna,Bauchi,Zamfara,Sokoto,Kebbi,Gombe,Yobe", feeKobo: 2000_00, etaLabel: "2–3 working days", sortOrder: 1 },
  { code: "CENTRAL", name: "Abuja & North Central", description: "FCT, Niger, Plateau, Nasarawa, Kogi, Kwara, Benue, Adamawa, Taraba, Borno", states: "FCT - Abuja,Niger,Plateau,Nasarawa,Kogi,Kwara,Benue,Adamawa,Taraba,Borno", feeKobo: 2500_00, etaLabel: "2–4 working days", sortOrder: 2 },
  { code: "REST", name: "Rest of Nigeria", description: "All other states", states: "*", feeKobo: 3500_00, etaLabel: "3–5 working days", sortOrder: 3 },
];
