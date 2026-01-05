# 같이보기 타이머 (Watch Together Timer) Extension

**Chrome extension for displaying a stable video playback timestamp for watch-together synchronization.**

> [!NOTE]
> This repository contains **only the TypeScript source code** for the 같이보기 타이머 Chrome extension.  
> The Chrome Web Store upload uses **built (minified) artifacts**, while this repository remains source-first.

📄 **Other languages**
- [🇰🇷 한국어 문서](./docs/README.KO.md)

---

## Overview

같이보기 타이머 is a lightweight **Manifest V3** Chrome extension designed for watch-together scenarios where  
on-screen timestamps cannot be streamed or shared.

- A **content script** runs in **all frames** and extracts playback state from `<video>` elements.
- The **background service worker** queries every frame, selects the most plausible “main” media source,
  and maintains a **last-known-good cache**.
- The **timer popup** polls once per second and intentionally displays cached (stale) values when detection fails,
  preventing UI flicker.

---

## Features

- Popup timer showing **current / total** playback time
- Works across **iframes** (`all_frames: true`)
- Heuristic selection of the most plausible “main” media element
- **Stale cache fallback** to keep the UI stable during intermittent detection failures
- Client-side only (no backend required)

---

## Scope of This Repository

This repository includes:

- Chrome Extension (Manifest V3) TypeScript source code
- Background service worker (`src/background.ts`)
- Content script (`src/content.ts`)
- Timer popup UI (`src/timer.html`, `src/timer.ts`, `src/timer.css`)
- Unit tests (Vitest + `chrome` mock)

This repository does **NOT** include:

- Any server-side components (backend APIs, databases, web services)
- Chrome Web Store packaging artifacts (the store upload is built/minified output)

---

## Permissions

The extension requires the following permissions:

- `tabs` — identify and query the target tab
- `storage` — store session-scoped state (popup window id, target tab id, last known time)
- `webNavigation` — enumerate frames for the active tab
- `scripting` — force-inject content scripts into existing frames when needed

---

## Project Structure

```text
.
├─ src/
│  ├─ background.ts
│  ├─ content.ts
│  ├─ timer.html
│  ├─ timer.ts
│  ├─ timer.css
│  └─ types/
│     ├─ messages.ts
│     └─ playback.ts
├─ public/                         # Icons
├─ scripts/
│  └─ copy-extension-assets.mjs    # Copies manifest/icons/html/css into dist
├─ tests/
│  ├─ chromeMock.ts
│  ├─ vitest.setup.ts
│  └─ *.test.ts
├─ manifest.json
├─ tsup.config.ts
└─ vitest.config.ts
```

---

## Build

This repository uses **tsup** for bundling.

```bash
npm install
npm run build
```

Build output will be generated in:

```text
dist/extension/
```

---

## Testing

Tests run with **Vitest** using a lightweight `chrome` mock.

```bash
npm run test
npm run coverage
```

CI runs on every push/PR via GitHub Actions (see `.github/workflows/ci.yml`).

---

## Installation (Unpacked)

1. Build the extension:

   ```bash
   npm run build
   ```

2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select:

   ```text
   dist/extension/
   ```

---

## Chrome Web Store

The Chrome Web Store package is uploaded as **built/minified** artifacts.  
This repository remains source-first for review and development.

> https://chromewebstore.google.com/detail/fdpkgdifpopbchlcdjomlbpdoilkkpbn

---

## License

MIT License  
© selentia
