import type { HospitalPrescription } from "@/lib/types";
import { formatDate, formatPhone } from "@/lib/format";

const SEX: Record<string, string> = { female: "Female", male: "Male", other: "Other" };

/** "MRN MGK0100001 · Female, 34 · 0700 000 0001" */
export function patientLine(p: Pick<HospitalPrescription, "patient">) {
  const { mrn, sex, age, phone } = p.patient;
  const who = [sex ? SEX[sex] ?? sex : null, age !== null ? `${age} yr${age === 1 ? "" : "s"}` : null].filter(Boolean).join(", ");
  return [`MRN ${mrn}`, who, formatPhone(phone)].filter(Boolean).join(" · ");
}

/** "Pregnant, about 18 weeks" or "Not pregnant". */
export function pregnancyText(p: NonNullable<HospitalPrescription["pregnancy"]>) {
  if (p.status === "NOT_PREGNANT") return "Not pregnant";
  return p.weeks !== null ? `Pregnant, about ${p.weeks} week${p.weeks === 1 ? "" : "s"}` : "Pregnant";
}

/** "18.5 kg (30 Oct 2026)" */
export function weightText(w: NonNullable<HospitalPrescription["weight"]>) {
  return `${w.kg} kg${w.recordedAt ? ` (${formatDate(w.recordedAt)})` : ""}`;
}

/** True when the hospital recorded actual allergies, not just "no known allergies". */
export const hasAllergies = (allergies: string | null) => !!allergies && !/^no known/i.test(allergies);

/** "20 tablets", or the prescriber's own wording when it wasn't a number. */
export function prescribedQuantity(i: HospitalPrescription["items"][number]) {
  if (i.quantity) return `${i.quantity}${i.quantityUnit ? ` ${i.quantityUnit}` : ""}`;
  return i.quantityText;
}
