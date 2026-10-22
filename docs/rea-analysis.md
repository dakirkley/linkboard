# How papaly.com works: REA analysis

Linkboard's feature set comes from an analysis of
[papaly.com](https://papaly.com/) with [REA](https://github.com/morluto/rea)
(`rea-agents` 6.7.0, run from source) on 2026-10-22. This document records what
was observed, what was derived from it, and what remains unknown. Linkboard
contains no Papaly code, markup, images, or branding; it is an independent
implementation of the same product idea.

## Method

REA attached over the Chrome DevTools Protocol to a headless Chromium 141
session and captured these Evidence records:

| Step | REA operation | Evidence ID |
| --- | --- | --- |
| Find the page | `list_browser_targets` | `ev_2e3d514d…52967f` |
| Landing page structure, resources, storage keys | `inspect_web_page` | `ev_e3208cf8…1c43` |
| Landing page bundle | `analyze_web_bundle` | `ev_13a86b26…60e6` |
| Landing page scripts exported for reading | `export_web_scripts` | `ev_700f6c13…6bc` |
| Public board `/papaly/1Rlpt/Shortcuts` with script sources | `inspect_web_page` | `ev_5c8b1a69…42a8` |
| Board scripts exported for reading | `export_web_scripts` | `ev_1cfab21b…4b6525` |
| Board screenshot (PNG sha256 `0126b305…fe24`) | `capture_web_screenshot` | `ev_8b8d556b…82cf` |
| Board bundle | `analyze_web_bundle` | `ev_a30c5700…6096` |

The raw captures stayed in the analysis session and are not committed here.

## Observations

These come directly from captured DOM, accessibility tree, scripts, and
screenshots.

- **Product pitch** (landing accessibility text): "Your ultimate link manager
  in the cloud"; "Import & manage your bookmarks in a simple 2D layout. Export
  whenever you want"; use cases are a new-tab page, education, co-working and
  general browsing; clients exist for iOS, Chrome and Firefox.
- **Stack**: a server-rendered Rails app (`authenticity_token` form fields,
  fingerprinted `/assets/application_*.js` bundles) with jQuery handlers
  (`$.ajax`, `$("form…").bind("submit")`). The board page loads
  `application_shared_board_01a-….js` (181,677 bytes).
- **Data hierarchy**: user → board → category → item. Public boards live at
  `/<user>/<boardId>/<Board-Name>` (for example `/papaly/1Rlpt/Shortcuts`).
- **Category attributes** present in board markup: `category-index` (32-hex
  id), `category-name`, `color` (hex, drawn as the card's left border),
  `category-position` (fractional, for example `0.5`), `category-type`,
  `category-url` (empty here; see Unknowns), `collapse-category`,
  `hide-excess-links`, `pinned`, `frequency`, `item-notes-status`,
  `category-version`, and a `toggle-child-category` control.
- **Item attributes**: `item-index`, `item-position` (fractional), `url`,
  `frequency`, `note-status`, a favicon, a name, a hidden `keywords` element
  holding the domain, and an `item-hot-icon` slot.
- **Layout**: categories are cards in a five-column grid
  (`category-slot-5`); long categories show "+ N more" (for example "+ 4
  more").
- **Board chrome**: board title, Share button, follower count with Follow,
  comments ("43 Comments"), "Boards you may like" and "Discover more" rails,
  and a global "Type to search" box.
- **Client endpoints** named as string literals in the board script:
  `/items/search`, `/items/click`, `/boards/click`, `/boards/follow`,
  `/boards/comment`, `/boards/suggestion`, `/boards/accept_owner_invite`,
  `/authentications/share`, `/feeds/feed`, `/users/notifications`,
  `/users/notifications/new`, `/users/account_header`, `/roundtrip`,
  `/browser_info`, `/logout`, plus an external `get_rss_feed` scraper.
- **Drag and drop**: the board script references jQuery UI `sortable`.
- **Guest mode**: "Try Papaly" submits `POST /guest.json`. On 2026-10-22 it
  returned HTTP 500 with `{"status":"error","message":{"email":"nickname has
  already been taken"}}`, so the signed-in editor could not be observed.
- **Logged-out boards** show the first links of each category, then an overlay:
  "You must be logged in to view the contents of this board."

## Derivations and inferences

- `/items/click` and `/boards/click`, together with the `frequency`
  attributes, indicate that Papaly counts opens and uses them to mark "hot"
  links. Linkboard counts clicks locally and marks up to three items per
  category with at least three opens.
- Fractional `*-position` values suggest ordering by midpoint insertion.
  Linkboard is local-only, so plain array order gives the same behavior.
- `hide-excess-links` and "+ N more" mean a per-category link limit with
  expansion. Linkboard shows six links, then "+ N more" / "Show less".
- `/items/search` is a server-side search over the user's links. Linkboard
  searches all local boards by name, URL, note and category.
- Import/export of browser bookmarks is advertised. Linkboard reads and writes
  the Netscape bookmark file format that browsers use.

## Deliberately left out

These depend on a server, accounts, or third parties: following, comments,
board recommendations, social-network feeds, notifications, co-owner invites,
public sharing links, mobile apps and the browser extension. Linkboard
replaces sharing with a per-board JSON export that another Linkboard can
import.

## Unknowns

- The signed-in editor (how editing, dragging, pinning, nested child
  categories and RSS-backed categories behave) was not observed, because guest
  login failed and no account was used.
- `category-type` was only seen as `category`, and `category-url` only empty;
  RSS-feed categories (`/feeds/feed`) are inferred from names alone.
- Request and response shapes of the endpoints above were not captured; only
  their URL literals were read from the source.

## REA notes

- `analyze_web_bundle` reported zero routes and one low-confidence endpoint
  candidate on both pages. Its detectors did not recognize jQuery's
  `$.ajax({ url: "/path" })` object form, so the endpoint list above came from
  searching the scripts exported with `export_web_scripts`.
- `export_web_scripts` rejected the `{ ok, data }` envelope printed by
  `inspect-web-page --full-output`. It accepted the inner Evidence object.
