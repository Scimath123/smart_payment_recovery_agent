"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "◆" },
  { href: "/transactions", label: "Transactions", icon: "☰" },
  { href: "/agent", label: "Agent Activity", icon: "◈" },
  { href: "/health", label: "System Health", icon: "♥" },
  { href: "/analytics", label: "Analytics", icon: "▤" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="relative z-10 flex w-14 shrink-0 flex-col gap-1 border-r border-panel-border bg-panel px-2 py-6 lg:w-52 lg:px-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors lg:px-3",
              active
                ? "bg-teal/10 text-teal"
                : "text-muted hover:bg-panel-border/40 hover:text-foreground"
            )}
          >
            <span className="w-4 text-center">{item.icon}</span>
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}