import { Geist, Geist_Mono } from "next/font/google";

/**
 * Landing page typefaces. next/font downloads them at build time and serves them
 * from the app's own origin. They are only imported by the landing page, so the
 * rest of the application keeps its existing font stack.
 */
export const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
