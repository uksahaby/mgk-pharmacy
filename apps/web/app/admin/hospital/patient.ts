import type { HospitalPrescription } from "@/lib/types";
import { formatPhone } from "@/lib/format";

const SEX: Record<string, string> = { female: "Female", male: "Male", other: "Other" };

/** "MRN MGK0100001 · Female, 34 · 0700 000 0001" */
export function patientLine(p: Pick<HospitalPrescription, "patient">) {
  const { mrn, sex, age, phone } = p.patient;
  const who = [sex ? SEX[sex] ?? sex : null, age !== null ? `${age} yr${age === 1 ? "" : "s"}` : null].filter(Boolean).join(", ");
  return [`MRN ${mrn}`, who, formatPhone(phone)].filter(Boolean).join(" · ");
}

/** True when the hospital recorded actual allergies, not just "no known allergies". */
export const hasAllergies = (allergies: string | null) => !!allergies && !/^no known/i.test(allergies);

/** "20 tablets", or the prescriber's own wording when it wasn't a number. */
export function prescribedQuantity(i: HospitalPrescription["items"][number]) {
  if (i.quantity) return `${i.quantity}${i.quantityUnit ? ` ${i.quantityUnit}` : ""}`;
  return i.quantityText;
}
