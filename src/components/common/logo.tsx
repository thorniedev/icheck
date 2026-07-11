import { cn } from "@/lib/utils";

/**
 * Brand assets — Cloudinary-hosted, swap URLs here and every surface updates.
 *  - LOGO_URL          : square mark only (favicon, avatar, splash).
 *  - LOGO_WORDMARK_URL : logo + text lock-up for the sidebar header.
 */
export const LOGO_URL =
  "https://res.cloudinary.com/dsmqsivcj/image/upload/v1779342444/erdgqkwvh2mfuprw2yfk.svg";

export const LOGO_WORDMARK_URL =
  "https://res.cloudinary.com/dsmqsivcj/image/upload/v1779733974/lwg6puq41ne1bpp9jywj.png";

/** ISTAD institutional logo — used on official exports (report PDFs).
 *  Served locally from /public/assets so the PDF embed never depends on a
 *  remote host (no CORS, always available offline). */
export const ISTAD_LOGO_URL = "/assets/istad-logo.png";

interface LogoProps {
  /** Pixel size of the square logo. */
  size?: number;
  /** Extra Tailwind classes (margin / sizing overrides). */
  className?: string;
}

/** Square brand mark — used for favicon, avatar, splash. */
export function Logo({ size = 32, className }: LogoProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={LOGO_WORDMARK_URL}
      alt="i-Check"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

interface LogoWordmarkProps {
  /** Pixel height; width auto-scales. */
  height?: number;
  className?: string;
}

/** Full lock-up: logo + "i-Check" text. Used in the sidebar header. */
export function LogoWordmark({ height = 28, className }: LogoWordmarkProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={LOGO_WORDMARK_URL}
      alt="i-Check"
      height={height}
      className={cn("object-contain w-auto", className)}
      style={{ height }}
    />
  );
}
