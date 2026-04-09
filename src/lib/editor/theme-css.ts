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

// Sans-serif — clean, modern
const SANS_SERIF_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Nunito",
  "PT Sans",
  "Work Sans",
  "DM Sans",
  "Source Sans 3",
  "Josefin Sans",
  "Outfit",
  "Space Grotesk",
  "Figtree",
  "Manrope",
  "Sora",
  "Plus Jakarta Sans",
  "Albert Sans",
  "Lexend",
  "Onest",
];

// Serif — elegant, editorial
const SERIF_FONTS = [
  "Playfair Display",
  "Merriweather",
  "Libre Baskerville",
  "Crimson Text",
  "Bitter",
  "Lora",
  "EB Garamond",
  "Cormorant Garamond",
  "Noto Serif",
  "Spectral",
  "Fraunces",
  "Instrument Serif",
];

// Display — creative, bold
const DISPLAY_FONTS = [
  "Bebas Neue",
  "Archivo Black",
  "Righteous",
  "Titan One",
  "Fredoka",
  "Dela Gothic One",
];

// Handwriting — casual, personal
const HANDWRITING_FONTS = [
  "Caveat",
  "Dancing Script",
  "Pacifico",
  "Satisfy",
  "Kalam",
];

// Monospace — code, technical
const MONOSPACE_FONTS = [
  "JetBrains Mono",
  "Fira Code",
  "IBM Plex Mono",
  "Source Code Pro",
];

export const FONT_CATEGORIES = [
  { label: "Sans Serif", fonts: SANS_SERIF_FONTS },
  { label: "Serif", fonts: SERIF_FONTS },
  { label: "Display", fonts: DISPLAY_FONTS },
  { label: "Handwriting", fonts: HANDWRITING_FONTS },
  { label: "Monospace", fonts: MONOSPACE_FONTS },
] as const;

export const FONT_OPTIONS = [
  ...SANS_SERIF_FONTS,
  ...SERIF_FONTS,
  ...DISPLAY_FONTS,
  ...HANDWRITING_FONTS,
  ...MONOSPACE_FONTS,
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

  // Use :where() for zero specificity so inline styles always win
  const headingRules = levels
    .map((tag) => {
      const s = theme.headingSizes[tag];
      return `:where(${tag}) { font-family: '${theme.fonts.heading}', sans-serif; font-size: ${s.size}; font-weight: ${s.weight}; line-height: ${s.lineHeight}; }`;
    })
    .join("\n");

  return `:where(body) { font-family: '${theme.fonts.body}', sans-serif; font-size: ${theme.baseFontSize}; }
${headingRules}`;
}

export { googleFontsUrl };
