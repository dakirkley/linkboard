import type { AppState, Board, Category, Item } from "./model";

export interface SearchHit {
  board: Board;
  category: Category;
  item: Item;
  score: number;
}

/**
 * Searches every board. Each whitespace-separated term must match the link's
 * name, URL, note, or category name; name matches rank first, then clicks.
 */
export function searchItems(state: AppState, query: string, limit = 12): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const board of state.boards) {
    for (const category of board.categories) {
      for (const item of category.items) {
        const name = item.name.toLowerCase();
        const rest = `${item.url} ${item.note} ${category.name}`.toLowerCase();
        let score = 0;
        let matched = true;
        for (const term of terms) {
          if (name.startsWith(term)) score += 3;
          else if (name.includes(term)) score += 2;
          else if (rest.includes(term)) score += 1;
          else {
            matched = false;
            break;
          }
        }
        if (matched) hits.push({ board, category, item, score });
      }
    }
  }
  return hits
    .sort((a, b) => b.score - a.score || b.item.clicks - a.item.clicks)
    .slice(0, limit);
}
