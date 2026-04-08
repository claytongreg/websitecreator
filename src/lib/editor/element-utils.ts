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

export function replaceElementAttribute(html: string, path: string, attr: string, value: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const el = doc.querySelector(path);
  if (!el) return null;
  el.setAttribute(attr, value);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

const CONTAINER_TAGS = new Set([
  "section", "div", "header", "footer", "main", "article", "aside", "nav",
]);

export function insertSnippetHtml(
  html: string,
  snippetHtml: string,
  insertMode: "after" | "inside",
  afterPath?: string
): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  if (afterPath) {
    const target = doc.querySelector(afterPath);
    if (!target) return null;

    if (insertMode === "inside" && CONTAINER_TAGS.has(target.tagName.toLowerCase())) {
      target.insertAdjacentHTML("beforeend", snippetHtml);
    } else {
      target.insertAdjacentHTML("afterend", snippetHtml);
    }
  } else {
    const main = doc.querySelector("main");
    const container = main || doc.body;
    container.insertAdjacentHTML("beforeend", snippetHtml);
  }

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export function replaceElementByPath(html: string, path: string, newElementHtml: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const el = doc.querySelector(path);
  if (!el) return null;
  const temp = doc.createElement("div");
  temp.innerHTML = newElementHtml.trim();
  const newChild = temp.firstElementChild;
  if (!newChild) return null;
  el.replaceWith(newChild);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export function replaceElementContent(html: string, path: string, newContent: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const el = doc.querySelector(path);
  if (!el) return null;
  el.textContent = newContent;
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
