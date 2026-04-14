import { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel h-full p-6 md:p-7 ${className}`}>
      <div className="flex flex-col gap-2 border-b border-[var(--border)] pb-5">
        <h3 className="text-xl font-semibold tracking-[-0.04em] text-stone-950">{title}</h3>
        {description ? <p className="text-sm leading-6 text-stone-600">{description}</p> : null}
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-[var(--surface-muted)] text-stone-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`inline-flex rounded-none px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
