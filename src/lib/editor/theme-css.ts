import type { ThemeSettings } from "@/types";

export const DEFAULT_THEME: ThemeSettings = {
  fonts: { heading: "Inter", body: "Inter" },
  headingSizes: {
    h1: { size: "48px", weight: "700", lineHeight: "1.2" },
    h2: { size: "36px", weight: "700", lineHeight: "1.2" },
    h3: { size: "28px", weight: "600", lineHeight: "1.3" },
    h4: { size: "24px", weight: "600", lineHeight: "1.3" },
    h5: { size: "20px", weight: "600", lineHeight: "1.4" },
    h6: { size: "18px", weight: "600", lineHeight: "1.4" },
  },
  baseFontSize: "16px",
};

export const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Playfair Display",
  "Merriweather",
  "Source Sans 3",
  "Nunito",
  "PT Sans",
  "Work Sans",
  "DM Sans",
  "Libre Baskerville",
  "Crimson Text",
  "Josefin Sans",
  "Outfit",
  "Space Grotesk",
  "Bitter",
];

export const FONT_WEIGHT_OPTIONS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

function googleFontsUrl(fonts: { heading: string; body: string }): string {
  const families = new Set([fonts.heading, fonts.body]);
  const params = Array.from(families)
    .map(
      (f) =>
        `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900`
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export function generateThemeCss(theme: ThemeSettings): string {
  const levels = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

  const headingRules = levels
    .map((tag) => {
      const s = theme.headingSizes[tag];
      return `${tag} { font-family: '${theme.fonts.heading}', sans-serif; font-size: ${s.size}; font-weight: ${s.weight}; line-height: ${s.lineHeight}; }`;
    })
    .join("\n");

  return `body { font-family: '${theme.fonts.body}', sans-serif; font-size: ${theme.baseFontSize}; }
${headingRules}`;
}

export { googleFontsUrl };
