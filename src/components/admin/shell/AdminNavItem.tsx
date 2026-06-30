import Link from "next/link";
import { createElement } from "react";
import type { LucideIcon } from "lucide-react";

export function AdminNavItem({
  href,
  label,
  icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 border px-4 py-3 text-[13px] font-bold uppercase tracking-[0.12em] transition-colors ${
        isActive
          ? "border-brand-text bg-brand-text text-brand-surface"
          : "border-transparent text-brand-text hover:bg-brand-page"
      }`}
    >
      {createElement(icon, { className: "h-5 w-5" })}
      <span>{label}</span>
    </Link>
  );
}
