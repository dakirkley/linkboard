import { describe, expect, it } from "vitest";
import { exportBookmarksHtml, importBookmarksHtml } from "./bookmarks";
import { makeBoard, makeCategory, makeItem, sampleState } from "./model";
import { searchItems } from "./search";
import { parseState } from "./storage";

const chromeExport = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://news.ycombinator.com/" ADD_DATE="1">Hacker News</A>
        <DT><H3>Dev</H3>
        <DL><p>
            <DT><A HREF="https://developer.mozilla.org/">MDN</A>
            <DD>Web reference
            <DT><A HREF="javascript:void(0)">Bookmarklet</A>
        </DL><p>
    </DL><p>
    <DT><A HREF="https://example.com/">Loose link</A>
</DL><p>`;

describe("importBookmarksHtml", () => {
  it("turns folders into categories by path, keeps notes, and skips non-web links", () => {
    const result = importBookmarksHtml(chromeExport, "Chrome");
    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.board.name).toBe("Chrome");
    const summary = result.board.categories.map((category) => [
      category.name,
      category.items.map((item) => `${item.name}|${item.url}|${item.note}`),
    ]);
    expect(summary).toEqual([
      ["Bookmarks bar", ["Hacker News|https://news.ycombinator.com/|"]],
      ["Bookmarks bar / Dev", ["MDN|https://developer.mozilla.org/|Web reference"]],
      ["Unsorted", ["Loose link|https://example.com/|"]],
    ]);
  });

  it("round-trips its own export", () => {
    const board = makeBoard("Mine", [
      makeCategory("A & B", "#000", [makeItem('Quote "x" <y>', "https://a.example/?q=1&r=2", "note")]),
    ]);
    const reimported = importBookmarksHtml(exportBookmarksHtml([board]), "Again").board;
    expect(reimported.categories).toHaveLength(1);
    expect(reimported.categories[0]!.name).toBe("Mine / A & B");
    expect(reimported.categories[0]!.items[0]).toMatchObject({
      name: 'Quote "x" <y>',
      url: "https://a.example/?q=1&r=2",
      note: "note",
    });
  });
});

describe("parseState", () => {
  it("accepts saved state and repairs a dangling active board", () => {
    const state = sampleState();
    const restored = parseState(JSON.parse(JSON.stringify({ ...state, activeBoardId: "gone" })));
    expect(restored?.boards).toEqual(state.boards);
    expect(restored?.activeBoardId).toBe(state.boards[0]!.id);
  });

  it.each([null, [], { version: 2, boards: [] }, { version: 1, boards: [] }, { version: 1, boards: [{ id: 1 }] }])(
    "rejects %j",
    (value) => expect(parseState(value)).toBeNull(),
  );
});

describe("searchItems", () => {
  it("matches every term across boards and ranks name matches first", () => {
    const state = sampleState();
    const hits = searchItems(state, "mdn");
    expect(hits.map((hit) => hit.item.name)).toEqual(["MDN Web Docs"]);
    expect(searchItems(state, "news bbc").map((hit) => hit.item.name)).toEqual(["BBC News"]);
    expect(searchItems(state, "   ")).toEqual([]);
  });
});
