import type { PageNode, FlatPage } from "@/types";

// ── Preset pages (the original 10 options) ──────────────────────────────────

export const PRESET_PAGES: { title: string; slug: string }[] = [
  { title: "Home", slug: "home" },
  { title: "About", slug: "about" },
  { title: "Services", slug: "services" },
  { title: "Portfolio", slug: "portfolio" },
  { title: "Blog", slug: "blog" },
  { title: "Contact", slug: "contact" },
  { title: "Pricing", slug: "pricing" },
  { title: "FAQ", slug: "faq" },
  { title: "Testimonials", slug: "testimonials" },
  { title: "Team", slug: "team" },
];

// ── Slug generation ─────────────────────────────────────────────────────────

export function generateSlug(title: string, existingSlugs: string[]): string {
  let base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!base) base = "page";
  let slug = base;
  let i = 2;
  while (existingSlugs.includes(slug)) {
    slug = `${base}-${i}`;
    i++;
  }
  return slug;
}

// ── Collect all slugs in a tree ─────────────────────────────────────────────

export function collectSlugs(nodes: PageNode[]): string[] {
  const slugs: string[] = [];
  for (const n of nodes) {
    slugs.push(n.slug);
    slugs.push(...collectSlugs(n.children));
  }
  return slugs;
}

// ── Factory ─────────────────────────────────────────────────────────────────

export function createPageNode(
  title: string,
  existingSlugs: string[]
): PageNode {
  return {
    id: crypto.randomUUID(),
    title,
    slug: generateSlug(title, existingSlugs),
    children: [],
  };
}

// ── Default pages ───────────────────────────────────────────────────────────

export function getDefaultPages(): PageNode[] {
  return [
    { id: crypto.randomUUID(), title: "Home", slug: "home", children: [] },
    { id: crypto.randomUUID(), title: "About", slug: "about", children: [] },
    {
      id: crypto.randomUUID(),
      title: "Contact",
      slug: "contact",
      children: [],
    },
  ];
}

// ── Flatten tree → FlatPage[] for API ───────────────────────────────────────

export function flattenTree(nodes: PageNode[]): FlatPage[] {
  const result: FlatPage[] = [];
  let order = 0;

  function walk(items: PageNode[], parentSlug: string | null) {
    for (const node of items) {
      result.push({
        slug: parentSlug ? `${parentSlug}/${node.slug}` : node.slug,
        title: node.title,
        parentSlug,
        order: order++,
      });
      walk(node.children, node.slug);
    }
  }

  walk(nodes, null);
  return result;
}

// ── Flatten tree → string[] of titles (for GeneratingView) ──────────────────

export function flattenToTitles(nodes: PageNode[]): string[] {
  const result: string[] = [];
  function walk(items: PageNode[]) {
    for (const node of items) {
      result.push(node.title);
      walk(node.children);
    }
  }
  walk(nodes);
  return result;
}

// ── Remove a node by id ─────────────────────────────────────────────────────

export function removeNode(nodes: PageNode[], id: string): PageNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNode(n.children, id) }));
}

// ── Find a node by id ───────────────────────────────────────────────────────

export function findNode(
  nodes: PageNode[],
  id: string
): PageNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

// ── Get depth of a node ─────────────────────────────────────────────────────

export function getNodeDepth(nodes: PageNode[], id: string): number {
  function walk(items: PageNode[], depth: number): number {
    for (const n of items) {
      if (n.id === id) return depth;
      const found = walk(n.children, depth + 1);
      if (found >= 0) return found;
    }
    return -1;
  }
  return walk(nodes, 0);
}

// ── Flatten for display (id + depth pairs) ──────────────────────────────────

export interface FlatDisplayItem {
  id: string;
  depth: number;
  node: PageNode;
  parentId: string | null;
}

export function flattenForDisplay(nodes: PageNode[]): FlatDisplayItem[] {
  const result: FlatDisplayItem[] = [];
  function walk(items: PageNode[], depth: number, parentId: string | null) {
    for (const node of items) {
      result.push({ id: node.id, depth, node, parentId });
      walk(node.children, depth + 1, node.id);
    }
  }
  walk(nodes, 0, null);
  return result;
}

// ── Extract a node from tree (returns [remaining tree, extracted node]) ─────

function extractNode(
  nodes: PageNode[],
  id: string
): [PageNode[], PageNode | null] {
  let extracted: PageNode | null = null;
  const remaining = nodes.reduce<PageNode[]>((acc, n) => {
    if (n.id === id) {
      extracted = n;
      return acc;
    }
    const [childRemaining, childExtracted] = extractNode(n.children, id);
    if (childExtracted) extracted = childExtracted;
    acc.push({ ...n, children: childRemaining });
    return acc;
  }, []);
  return [remaining, extracted];
}

// ── Insert a node at a position relative to a target ────────────────────────

function insertNode(
  nodes: PageNode[],
  targetId: string,
  nodeToInsert: PageNode,
  position: "before" | "after" | "child"
): PageNode[] {
  if (position === "child") {
    return nodes.map((n) => {
      if (n.id === targetId) {
        return { ...n, children: [...n.children, nodeToInsert] };
      }
      return { ...n, children: insertNode(n.children, targetId, nodeToInsert, position) };
    });
  }

  const result: PageNode[] = [];
  for (const n of nodes) {
    if (n.id === targetId) {
      if (position === "before") {
        result.push(nodeToInsert, n);
      } else {
        result.push(n, nodeToInsert);
      }
    } else {
      result.push({
        ...n,
        children: insertNode(n.children, targetId, nodeToInsert, position),
      });
    }
  }
  return result;
}

// ── Move node (the core drag-and-drop operation) ────────────────────────────

export function moveNode(
  nodes: PageNode[],
  activeId: string,
  overId: string,
  position: "before" | "after" | "child"
): PageNode[] {
  if (activeId === overId) return nodes;

  const [treeWithout, extracted] = extractNode(nodes, activeId);
  if (!extracted) return nodes;

  // Prevent nesting beyond depth 1 (max 2 levels)
  if (position === "child") {
    const overDepth = getNodeDepth(treeWithout, overId);
    if (overDepth >= 1) return nodes; // target is already a child
    if (extracted.children.length > 0) return nodes; // can't nest a node that has children
  }

  return insertNode(treeWithout, overId, extracted, position);
}

// ── Update node title ───────────────────────────────────────────────────────

export function updateNodeTitle(
  nodes: PageNode[],
  id: string,
  title: string,
  existingSlugs: string[]
): PageNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      const filteredSlugs = existingSlugs.filter((s) => s !== n.slug);
      return { ...n, title, slug: generateSlug(title, filteredSlugs) };
    }
    return { ...n, children: updateNodeTitle(n.children, id, title, existingSlugs) };
  });
}
