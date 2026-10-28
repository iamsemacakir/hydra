import { Geist, Geist_Mono } from "next/font/google";

/**
 * Hydra typefaces. next/font downloads them at build time and serves them from the
 * app's own origin. The root layout puts both variables on <html>, so every page can use them.
 */
export const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
