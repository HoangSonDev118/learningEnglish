"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, LayoutDashboard, Library, Moon, Settings2, Sun, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const REVIEW_ILLUSTRATION_AFTER_ANSWER_KEY = "review-illustration-after-answer";

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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showIllustrationAfterAnswer, setShowIllustrationAfterAnswer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme-mode");
    const storedIllustrationSetting = localStorage.getItem(REVIEW_ILLUSTRATION_AFTER_ANSWER_KEY);
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = stored === "dark" || stored === "light" ? stored : preferredDark ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
    setShowIllustrationAfterAnswer(storedIllustrationSetting === "1");
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!settingsOpen) return;
      if (!window.matchMedia("(min-width: 640px)").matches) return;
      if (!settingsRef.current) return;
      if (!settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [settingsOpen]);

  useEffect(() => {
    setSettingsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!settingsOpen) return;
    if (window.matchMedia("(min-width: 640px)").matches) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [settingsOpen]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme-mode", nextTheme);
    document.documentElement.classList.toggle("theme-dark", nextTheme === "dark");
  }

  function toggleIllustrationAfterAnswer() {
    const next = !showIllustrationAfterAnswer;
    setShowIllustrationAfterAnswer(next);
    localStorage.setItem(REVIEW_ILLUSTRATION_AFTER_ANSWER_KEY, next ? "1" : "0");
    queueMicrotask(() => {
      window.dispatchEvent(new Event("app-settings-change"));
    });
  }

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
    <header
      className={cn(
        "sticky top-0 z-40 backdrop-blur-sm animate-fade-up",
        theme === "dark"
          ? "border-b border-zinc-800 bg-zinc-950/90"
          : "border-b border-zinc-100 bg-white/90"
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 font-bold",
            theme === "dark" ? "text-zinc-100" : "text-zinc-900"
          )}
        >
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
                    : theme === "dark"
                      ? "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
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
          <div className="relative ml-1" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                theme === "dark"
                  ? "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
              aria-label="Mở cài đặt"
              title="Cài đặt"
              aria-expanded={settingsOpen}
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Cài đặt</span>
            </button>

            <div
              className={cn(
                "absolute right-0 top-11 z-50 hidden w-72 origin-top-right rounded-2xl border p-3 shadow-xl transition-all duration-200 sm:block",
                settingsOpen
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-1 scale-95 opacity-0",
                theme === "dark" ? "border-zinc-700 bg-zinc-900" : "border-zinc-200 bg-white"
              )}
            >
              <p className={cn("px-1 pb-2 text-xs font-semibold uppercase tracking-widest", theme === "dark" ? "text-zinc-400" : "text-zinc-500")}>
                Cài đặt
              </p>

              <button
                type="button"
                onClick={toggleTheme}
                className={cn(
                  "mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                  theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                )}
              >
                <span className="flex items-center gap-2">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Giao diện
                </span>
                <span className={cn("text-xs font-semibold", theme === "dark" ? "text-zinc-300" : "text-zinc-600")}>
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
              </button>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-sm",
                  theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                )}
              >
                <input
                  type="checkbox"
                  checked={showIllustrationAfterAnswer}
                  onChange={toggleIllustrationAfterAnswer}
                  className="mt-0.5 h-4 w-4 accent-violet-600"
                />
                <span>
                  <span className="block font-medium">Ảnh minh họa sau đáp án</span>
                  <span className={cn("mt-0.5 block text-xs", theme === "dark" ? "text-zinc-400" : "text-zinc-500")}>
                    Chỉ hiện ảnh sau khi bấm Hiện đáp án trong flashcard.
                  </span>
                </span>
              </label>
            </div>

          </div>
        </nav>
      </div>
      {mounted &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Đóng cài đặt"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSettingsOpen(false);
              }}
              className={cn(
                "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 sm:hidden",
                settingsOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              )}
            />

            <div
              className={cn(
                "fixed right-0 top-0 z-50 flex h-dvh w-80 max-w-[88vw] flex-col border-l p-4 shadow-2xl transition-transform duration-300 sm:hidden",
                settingsOpen ? "translate-x-0" : "translate-x-full",
                theme === "dark" ? "border-zinc-700 bg-zinc-900" : "border-zinc-200 bg-white"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className={cn("text-sm font-semibold uppercase tracking-widest", theme === "dark" ? "text-zinc-400" : "text-zinc-500")}>
                  Cài đặt
                </p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-xs font-medium",
                    theme === "dark" ? "text-zinc-300 hover:bg-zinc-800" : "text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  Đóng
                </button>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className={cn(
                  "mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                  theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                )}
              >
                <span className="flex items-center gap-2">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Giao diện
                </span>
                <span className={cn("text-xs font-semibold", theme === "dark" ? "text-zinc-300" : "text-zinc-600")}>
                  {theme === "dark" ? "Dark" : "Light"}
                </span>
              </button>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-sm",
                  theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
                )}
              >
                <input
                  type="checkbox"
                  checked={showIllustrationAfterAnswer}
                  onChange={toggleIllustrationAfterAnswer}
                  className="mt-0.5 h-4 w-4 accent-violet-600"
                />
                <span>
                  <span className="block font-medium">Ảnh minh họa sau đáp án</span>
                  <span className={cn("mt-0.5 block text-xs", theme === "dark" ? "text-zinc-400" : "text-zinc-500")}>
                    Chỉ hiện ảnh sau khi bấm Hiện đáp án trong flashcard.
                  </span>
                </span>
              </label>
            </div>
          </>,
          document.body
        )}
    </header>
  );
}
