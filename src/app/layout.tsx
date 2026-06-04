import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppWrapper from "@/components/AppWrapper";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "INT Portal",
  description: "Advanced Student Directory and Network Tracker",
  icons: {
    icon: "/palantint.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-zinc-950 text-zinc-200 font-sans`}
      >
        <AppWrapper>
          {children}
          <Toaster />
        </AppWrapper>
      </body>
    </html>
  );
}
