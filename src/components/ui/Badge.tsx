type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "good" | "warn" | "bad" | "info";
};

export function Badge({ children, tone = "default" }: BadgeProps) {
  const toneClass =
    tone === "good"
      ? "bg-green-100 text-green-800 border-green-200"
      : tone === "warn"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : tone === "bad"
      ? "bg-red-100 text-red-800 border-red-200"
      : tone === "info"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-neutral-100 text-neutral-800 border-neutral-200";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}