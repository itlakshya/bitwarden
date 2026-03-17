import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_NAME } from "@/lib/branding";
import ClientWrapper from "@/components/ClientWrapper";
import "./globals.css";
import "aos/dist/aos.css"; // AOS styles

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A modern, secure project workspace.",
  icons: {
    icon: '/favicon.png',
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
        className={`${inter.variable} antialiased min-h-screen bg-white text-slate-900 font-sans`}
      >
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
