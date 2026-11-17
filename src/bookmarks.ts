import { CATEGORY_COLORS, makeBoard, makeCategory, makeItem, normalizeUrl, type Board, type Item } from "./model";

export interface ImportResult {
  boards: Board[];
  imported: number;
  /** Links whose URL was not http(s), such as javascript: bookmarklets or place: queries. */
  skipped: number;
}

/**
 * Converts a browser bookmark export (Netscape bookmark file, produced by
 * Chrome, Firefox, Safari and Edge) into boards. Each top-level folder becomes
 * a board; the rest of a link's folder path names its category ("General" for
 * links directly in the top folder). Links outside any folder go to a board
 * named `boardName`, category "Unsorted".
 */
export function importBookmarksHtml(html: string, boardName: string): ImportResult {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // board name -> category name -> items (Maps keep insertion order)
  const groups = new Map<string, Map<string, Item[]>>();
  let imported = 0;
  let skipped = 0;

  const add = (path: string[], item: Item) => {
    const [boardKey = boardName, ...rest] = path;
    const categoryKey = path.length === 0 ? "Unsorted" : rest.length === 0 ? "General" : rest.join(" / ");
    const categories = groups.get(boardKey) ?? new Map<string, Item[]>();
    const items = categories.get(categoryKey) ?? [];
    items.push(item);
    categories.set(categoryKey, items);
    groups.set(boardKey, categories);
    imported += 1;
  };

  const visit = (list: Element, path: string[]) => {
    for (const dt of directChildren(list, "DT")) {
      const folder = firstChild(dt, "H3");
      const link = firstChild(dt, "A");
      if (folder !== null) {
        const nested = firstChild(dt, "DL") ?? nextElement(dt, "DL");
        if (nested !== null) visit(nested, [...path, folder.textContent?.trim() || "Folder"]);
      } else if (link !== null) {
        const url = normalizeUrl(link.getAttribute("href") ?? "");
        if (url === null) {
          skipped += 1;
          continue;
        }
        const note = nextElement(dt, "DD")?.textContent?.trim() ?? "";
        add(path, makeItem(link.textContent?.trim() || url, url, note));
      }
    }
  };

  const root = doc.querySelector("dl");
  if (root !== null) visit(root, []);

  const boards = [...groups].map(([name, categories]) =>
    makeBoard(
      name,
      [...categories].map(([categoryName, items], index) =>
        makeCategory(categoryName, CATEGORY_COLORS[index % CATEGORY_COLORS.length]!, items),
      ),
    ),
  );
  return { boards, imported, skipped };
}

/** DT elements of a DL, looking through the <p> wrappers browsers emit. */
function directChildren(list: Element, tag: string): Element[] {
  const result: Element[] = [];
  for (const child of Array.from(list.children)) {
    if (child.tagName === tag) result.push(child);
    else if (child.tagName === "P") result.push(...directChildren(child, tag));
  }
  return result;
}

function firstChild(element: Element, tag: string): Element | null {
  return Array.from(element.children).find((child) => child.tagName === tag) ?? null;
}

/** The next sibling element, if it is a `tag` (skipping <p> separators). */
function nextElement(element: Element, tag: string): Element | null {
  let next = element.nextElementSibling;
  while (next !== null && next.tagName === "P") next = next.nextElementSibling;
  return next !== null && next.tagName === tag ? next : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Writes boards as a Netscape bookmark file any browser can import. */
export function exportBookmarksHtml(boards: readonly Board[]): string {
  const lines = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>",
    "<H1>Bookmarks</H1>",
    "<DL><p>",
  ];
  for (const board of boards) {
    lines.push(`    <DT><H3>${escapeHtml(board.name)}</H3>`, "    <DL><p>");
    for (const category of board.categories) {
      lines.push(`        <DT><H3>${escapeHtml(category.name)}</H3>`, "        <DL><p>");
      for (const item of category.items) {
        lines.push(`            <DT><A HREF="${escapeHtml(item.url)}">${escapeHtml(item.name)}</A>`);
        if (item.note !== "") lines.push(`            <DD>${escapeHtml(item.note)}`);
      }
      lines.push("        </DL><p>");
    }
    lines.push("    </DL><p>");
  }
  lines.push("</DL><p>", "");
  return lines.join("\n");
}
