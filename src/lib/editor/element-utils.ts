import type { ElementSelection } from "@/types";

export type ElementType = "text" | "image" | "section" | "generic";

const TEXT_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "span", "a", "li", "label", "blockquote", "figcaption", "cite",
]);

const SECTION_TAGS = new Set([
  "section", "div", "header", "footer", "main", "article", "aside", "nav",
]);

export function getElementType(selection: ElementSelection): ElementType {
  const tag = selection.tagName.toLowerCase();

  if (tag === "img") return "image";
  if (selection.computedStyle?.backgroundImage && selection.computedStyle.backgroundImage !== "none") {
    return "image";
  }

  if (TEXT_TAGS.has(tag)) return "text";

  if (SECTION_TAGS.has(tag)) return "section";

  return "generic";
}

export function deleteElement(html: string, path: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const el = doc.querySelector(path);
  if (!el) return null;
  el.remove();
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export function duplicateElement(html: string, path: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const el = doc.querySelector(path);
  if (!el || !el.parentElement) return null;
  const clone = el.cloneNode(true) as Element;
  el.parentElement.insertBefore(clone, el.nextSibling);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
