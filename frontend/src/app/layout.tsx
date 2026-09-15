import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AssistantChat } from "@/components/AssistantChat";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FoundIt — AI-Powered Lost & Found Matching Platform",
  description: "Multimodal AI matching platform connecting lost and found items with visual, text, and contextual confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="font-body bg-[#FAF8F5] text-[#1E2022] antialiased selection:bg-[#2E4A3E] selection:text-white min-h-screen flex flex-col">
        {children}
        <AssistantChat />
      </body>
    </html>
  );
}
