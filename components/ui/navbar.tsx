"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, LayoutDashboard, Library, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/review", label: "Ôn tập", icon: BookOpen },
  { href: "/import", label: "Nhập", icon: Upload },
  { href: "/library", label: "Thư viện", icon: Library },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/review");
    router.prefetch("/import");
    router.prefetch("/library");
  }, [router]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/vocabulary/due")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setDueCount(Number(data.dueCount ?? 0));
      })
      .catch(() => {
        if (mounted) setDueCount(0);
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/90 backdrop-blur-sm animate-fade-up">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-zinc-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white text-xs">
            V
          </span>
          <span className="hidden sm:inline">VocabSRS</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isDue = item.href === "/review" && dueCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-violet-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {isDue && !isActive && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none badge-pulse">
                    {dueCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
