import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { SessionProvider } from "@/components/session-provider";
import { SettingsApplier } from "@/components/settings-applier";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShiftTracker — Shift & Payment Tracker",
  description: "Track your work shifts and payments with a premium, minimalist interface. Built with Next.js, Supabase, and shadcn/ui.",
  keywords: ["shift tracker", "payment tracker", "work shifts", "earnings", "Next.js", "Supabase"],
  authors: [{ name: "ShiftTracker" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ShiftTracker",
  },
  openGraph: {
    title: "ShiftTracker",
    description: "Track shifts and payments beautifully",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <SessionProvider>
          <SettingsApplier />
          {children}
        </SessionProvider>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}