import localFont from "next/font/local";

/*
 * Self-hosted, so the build never needs network access. Both are SIL Open Font License 1.1 (see fonts/OFL.txt).
 * Hydra Sans is a Latin subset of Mona Sans (renamed, as the licence requires for modified versions):
 * one variable file for every weight from 400 to 700 and widths from 100% to 112.5%.
 * JetBrains Mono is used only for real code and file names.
 */
export const sansFont = localFont({
  src: "./fonts/HydraSans-Variable.woff",
  weight: "400 700",
  style: "normal",
  variable: "--font-hydra",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "100% 112.5%" }],
});

export const codeFont = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff",
  weight: "400 600",
  style: "normal",
  variable: "--font-hydra-code",
  display: "swap",
});
