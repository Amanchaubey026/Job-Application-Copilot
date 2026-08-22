# Job Application Copilot

Local-first Chrome extension that turns a resume into a structured profile and fills job application forms in the browser.

Phase 1 is a working MVP: upload a PDF/DOCX resume, review the extracted profile, detect form fields on the current page, match them deterministically, and fill selected fields. Nothing is uploaded. There is no account, no cloud API, and the extension never submits an application.

## Privacy model

- Resume parsing runs in the extension popup.
- The structured profile is stored in IndexedDB on the extension origin.
- Form filling sends only the values you confirm to the current tab’s content script.
- There is no analytics SDK, no telemetry, and no `fetch` of resume or profile data to an external server.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the tab you opened the popup on so the extension can scan and fill that page. |
| `host_permissions` for `http://*/*` and `https://*/*` | Run a content script that detects form fields and fills values on arbitrary job application pages. The script does not scan until you open the popup or a previous scan started a MutationObserver on that tab. |

No `storage` permission is requested. Profile data uses IndexedDB, not `chrome.storage`.

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Plasmo writes a live-reloading unpacked extension to `build/chrome-mv3-dev`.

### Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `build/chrome-mv3-dev` (development) or `build/chrome-mv3-prod` (production).

Pin the extension for easier access.

## Production build

```bash
npm run build
```

The production bundle is written to `build/chrome-mv3-prod`.

```bash
npm run typecheck
npm run test
```

## Upload a resume

1. Click the extension icon.
2. Drop a PDF or DOCX, or browse to a file.
3. Review the extraction summary.
4. Edit any field.
5. Click **Save Profile**.

A sample resume is included at `test-pages/sample-resume.pdf` (generated) and `test-pages/sample-resume.txt`.

```bash
node scripts/generate-sample-pdf.cjs
```

## Test autofill

Serve the local test application:

```bash
npx --yes serve test-pages -p 4173
```

Open `http://localhost:4173`, then:

1. Make sure a profile is saved.
2. Open the extension on that page.
3. Confirm detected fields and confidence.
4. Deselect one field.
5. Click **Fill Selected**.
6. Confirm the React-like section updates its visible state (it only listens for `input` events).
7. Wait for the dynamic fields (or click **Add fields now**), then **Refresh Detection** and fill those too.
8. Confirm the page **Submit application** button was not clicked.

## Project architecture

```text
Resume PDF/DOCX
    → parser/ (PDF.js / Mammoth)
    → parser/profile-extractor.ts (deterministic)
    → storage/profile-repository.ts (IndexedDB)
    → popup (review / edit)
    → contents/form-scanner.ts (detect fields, MutationObserver)
    → matching/rule-based-matcher.ts
    → lib/form-filler.ts (native setters + input/change events)
```

| Area | Path |
| --- | --- |
| Domain types | `types/` |
| Resume parsers | `parser/` |
| IndexedDB | `storage/` |
| Field matching | `matching/` |
| Form detect/fill | `lib/` |
| Content script | `contents/form-scanner.ts` |
| Background SW | `background/index.ts` |
| Popup UI | `popup.tsx`, `components/` |
| Tests | `*.test.ts`, `test-pages/` |

Matching is isolated behind a `FieldMatcher` interface. Phase 1 uses `RuleBasedFieldMatcher` inside `CompositeFieldMatcher`. Phase 2 can add an Ollama matcher as the fallback without changing detection or filling.

## Known limitations

- Extraction is heuristic. Unusual resume layouts will miss fields rather than guess.
- Matching is deterministic synonym/autocomplete matching, not an LLM.
- Content scripts run in the top frame only. Application forms inside cross-origin iframes (some ATS widgets) are not filled in Phase 1.
- Checkbox, radio, file, date, and password controls are ignored.
- The extension never clicks Submit or Next.
- PDF.js needs its worker file (`assets/pdf.worker.min.mjs`, copied on `npm install`).
- Chrome pages (`chrome://`, the Web Store) cannot be scanned.

## Phase 2 (not implemented)

- Optional local Ollama matcher for low-confidence fields
- Job description extraction
- Personalized long-answer suggestions
- Iframe / ATS-specific adapters if still needed after the generic detector

## Scripts

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies and copy the PDF.js worker |
| `npm run dev` | Plasmo development build with live reload |
| `npm run build` | Production extension |
| `npm run test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
