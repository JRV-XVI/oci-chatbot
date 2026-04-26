import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudForge: Project Management",
  description: "A project management tool for software development teams created by CloudForge.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-screen", "antialiased", "overflow-hidden", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="h-full flex flex-col overflow-hidden">{children}</body>
    </html>
  );
}
