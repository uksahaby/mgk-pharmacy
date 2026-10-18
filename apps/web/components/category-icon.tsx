import {
  Baby,
  Brain,
  Bug,
  Droplets,
  Eye,
  FlaskConical,
  Flower2,
  HeartPulse,
  Leaf,
  type LucideIcon,
  Pill,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  Thermometer,
  Wind,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  thermometer: Thermometer,
  bug: Bug,
  shield: ShieldPlus,
  heart: HeartPulse,
  droplets: Droplets,
  flask: FlaskConical,
  wind: Wind,
  leaf: Leaf,
  baby: Baby,
  sparkles: Sparkles,
  eye: Eye,
  venus: Flower2,
  stethoscope: Stethoscope,
  brain: Brain,
  pill: Pill,
};

/** Soft colour pairs per category, used for icons tiles and product artwork. */
export const CATEGORY_TONES: Record<string, { bg: string; fg: string; from: string; to: string }> = {
  thermometer: { bg: "bg-orange-50", fg: "text-orange-600", from: "#fff7ed", to: "#fed7aa" },
  bug: { bg: "bg-lime-50", fg: "text-lime-700", from: "#f7fee7", to: "#d9f99d" },
  shield: { bg: "bg-sky-50", fg: "text-sky-700", from: "#f0f9ff", to: "#bae6fd" },
  heart: { bg: "bg-rose-50", fg: "text-rose-600", from: "#fff1f2", to: "#fecdd3" },
  droplets: { bg: "bg-blue-50", fg: "text-blue-600", from: "#eff6ff", to: "#bfdbfe" },
  flask: { bg: "bg-teal-50", fg: "text-teal-700", from: "#f0fdfa", to: "#99f6e4" },
  wind: { bg: "bg-cyan-50", fg: "text-cyan-700", from: "#ecfeff", to: "#a5f3fc" },
  leaf: { bg: "bg-emerald-50", fg: "text-emerald-700", from: "#ecfdf5", to: "#a7f3d0" },
  baby: { bg: "bg-pink-50", fg: "text-pink-600", from: "#fdf2f8", to: "#fbcfe8" },
  sparkles: { bg: "bg-amber-50", fg: "text-amber-700", from: "#fffbeb", to: "#fde68a" },
  eye: { bg: "bg-indigo-50", fg: "text-indigo-600", from: "#eef2ff", to: "#c7d2fe" },
  venus: { bg: "bg-fuchsia-50", fg: "text-fuchsia-600", from: "#fdf4ff", to: "#f5d0fe" },
  stethoscope: { bg: "bg-slate-100", fg: "text-slate-700", from: "#f8fafc", to: "#cbd5e1" },
  brain: { bg: "bg-violet-50", fg: "text-violet-600", from: "#f5f3ff", to: "#ddd6fe" },
  pill: { bg: "bg-brand-50", fg: "text-brand-600", from: "#fff1f2", to: "#ffc8cc" },
};

export function toneFor(icon?: string) {
  return CATEGORY_TONES[icon ?? "pill"] ?? CATEGORY_TONES.pill;
}

export function CategoryIcon({ icon, className }: { icon?: string; className?: string }) {
  const Icon = ICONS[icon ?? "pill"] ?? Pill;
  return <Icon className={className} aria-hidden />;
}
