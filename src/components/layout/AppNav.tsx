import Link from "next/link";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/decision-engine", label: "Decision Engine" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/invest-now", label: "Invest Now" },
];

export function AppNav() {
  return (
    <nav className="flex gap-4">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}