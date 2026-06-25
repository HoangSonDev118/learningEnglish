import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VocabProvider } from "@/context/VocabContext";
import { Navbar } from "@/components/ui/navbar";
import { ToastContainer } from "@/components/ui/toast";
import { WebPushManager } from "@/components/notifications/WebPushManager";

const themeInitScript = `(() => {
  try {
    const stored = localStorage.getItem("theme-mode");
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "dark" || stored === "light"
      ? stored
      : (preferredDark ? "dark" : "light");

    if (theme === "dark") {
      document.documentElement.classList.add("theme-dark");
    } else {
      document.documentElement.classList.remove("theme-dark");
    }
  } catch {
    // Ignore storage and media-query errors.
  }
})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VocabSRS - Học từ vựng ngắt quãng",
  description: "Học từ vựng tiếng Anh bằng phương pháp ngắt quãng",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "VocabSRS",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50">
        <VocabProvider>
          <WebPushManager />
          <Navbar />
          <main className="flex-1">{children}</main>
          <ToastContainer />
        </VocabProvider>
      </body>
    </html>
  );
}
