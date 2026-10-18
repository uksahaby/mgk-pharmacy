import { CategoryIcon, toneFor } from "./category-icon";

/**
 * Clean, consistent product artwork drawn as a medicine pack.
 * Used until real product photography is available, and far better than a repeated logo placeholder.
 */
export function ProductArt({
  name,
  strength,
  form,
  icon,
  size = "md",
}: {
  name: string;
  strength?: string | null;
  form?: string;
  icon?: string;
  size?: "sm" | "md" | "lg";
}) {
  const tone = toneFor(icon);
  const big = size === "lg";
  const small = size === "sm";
  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden"
      style={{ background: `radial-gradient(120% 90% at 20% 10%, ${tone.from} 0%, ${tone.to} 100%)` }}
      aria-hidden
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/30 blur-xl" />
      <div
        className={`relative flex flex-col justify-between rounded-xl bg-white shadow-lift ring-1 ring-black/5 ${
          big ? "h-[62%] w-[54%] p-5" : small ? "h-[64%] w-[58%] p-2" : "h-[62%] w-[56%] p-3.5"
        }`}
        style={{ transform: "rotate(-4deg)" }}
      >
        <div className="flex items-center justify-between">
          <span className={`rounded-md ${tone.bg} ${tone.fg} ${small ? "p-1" : "p-1.5"}`}>
            <CategoryIcon icon={icon} className={big ? "h-6 w-6" : small ? "h-3 w-3" : "h-4 w-4"} />
          </span>
          {!small && <span className="h-1.5 w-8 rounded-full bg-slate-200" />}
        </div>
        <div className="min-w-0">
          <p
            className={`truncate font-display font-bold leading-tight text-ink ${
              big ? "text-2xl" : small ? "text-[9px]" : "text-sm"
            }`}
          >
            {name}
          </p>
          {strength && !small && (
            <p className={`truncate font-semibold ${tone.fg} ${big ? "text-base" : "text-[11px]"}`}>{strength}</p>
          )}
          {form && big && <p className="mt-1 truncate text-xs uppercase tracking-wider text-ink-muted">{form}</p>}
        </div>
        <div className={`h-1 w-full rounded-full ${tone.bg}`} />
      </div>
    </div>
  );
}
