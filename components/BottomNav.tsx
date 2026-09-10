"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/", label: "学习", icon: "⌂" },
  { href: "/plan", label: "计划", icon: "▣" },
  { href: "/oc", label: "OC", icon: "✦" },
  { href: "/user", label: "我的", icon: "♡" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--app-border)] bg-[var(--app-page-background)]/95 px-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(74,48,43,0.06)] backdrop-blur"
      aria-label="主导航"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-20 flex-col items-center justify-center gap-1 rounded-2xl px-4 text-xs font-medium transition-colors ${
                isActive
                  ? "text-[var(--app-accent)]"
                  : "text-[var(--app-muted-text)] hover:text-[var(--app-primary-hover)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={`flex h-7 w-10 items-center justify-center rounded-full text-lg leading-none ${
                  isActive ? "bg-[var(--app-soft-background)]" : ""
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
