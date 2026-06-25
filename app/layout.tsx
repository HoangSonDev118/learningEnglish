import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VocabProvider } from "@/context/VocabContext";
import { Navbar } from "@/components/ui/navbar";
import { ToastContainer } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VocabSRS — Hoc tu vung ngat quang",
  description: "Hoc tu vung tieng Anh bang phuong phap ngat quang",
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
    >
      <body className="min-h-full flex flex-col bg-zinc-50">
        <VocabProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <ToastContainer />
        </VocabProvider>
      </body>
    </html>
  );
}
