import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Kokob Baby Shop",
    template: "%s | Kokob Baby Shop",
  },
  description:
    "Quality baby products, clothing, toys and essentials for your little one. Shop baby care, feeding, clothing, and more.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://kokob.shop"),
  openGraph: {
    type: "website",
    siteName: "Kokob Baby Shop",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} antialiased`}
      >
        <Providers>
          <div className="bg-background text-foreground flex min-h-screen flex-col">
            <Suspense>
              <SiteHeader />
            </Suspense>
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
