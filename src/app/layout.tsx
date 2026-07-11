import type { Metadata } from "next";
import {
  Inter,
  JetBrains_Mono,
  IBM_Plex_Serif,
  Space_Grotesk,
  Geist,
  Geist_Mono,
  Outfit,
  Bricolage_Grotesque,
} from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { LOGO_URL } from "@/components/common/logo";
import { Toaster } from "@/components/ui/sonner";

// Per-theme fonts — each theme picks a sans face that suits its color palette.
const inter      = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const plexSerif  = IBM_Plex_Serif({ variable: "--font-plex-serif", subsets: ["latin"], display: "swap", weight: ["400","500","600","700"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], display: "swap" });
const geist      = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const outfit     = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });
const bricolage  = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });

const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono-jb", subsets: ["latin"], display: "swap" });
const geistMono     = Geist_Mono({ variable: "--font-mono-geist", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "i-Check — Smart Attendance",
  description: "Smart attendance tracking system",
  icons: {
    icon: LOGO_URL,
    shortcut: LOGO_URL,
    apple: LOGO_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // All font variables exposed on <html>; globals.css maps --font-sans / --font-mono
  // to one of these per [data-theme].
  const fontVars = [
    inter.variable,
    plexSerif.variable,
    spaceGrotesk.variable,
    geist.variable,
    outfit.variable,
    bricolage.variable,
    jetbrainsMono.variable,
    geistMono.variable,
  ].join(" ");

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontVars} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}