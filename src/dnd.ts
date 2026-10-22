import type { DragEvent } from "react";

export const ITEM_MIME = "application/x-linkboard-item";
export const CATEGORY_MIME = "application/x-linkboard-category";
export const URI_MIME = "text/uri-list";

export function hasType(event: DragEvent, type: string): boolean {
  return Array.from(event.dataTransfer.types).includes(type);
}

/** Whether the pointer is in the lower half of the element under it. */
export function isLowerHalf(event: DragEvent<HTMLElement>): boolean {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

/** First http(s) URL of a text/uri-list payload (lines starting with # are comments). */
export function firstUri(uriList: string): string | null {
  return (
    uriList
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line !== "" && !line.startsWith("#")) ?? null
  );
}
