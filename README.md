# Job Application Copilot

Local-first Chrome extension that turns a resume into a structured profile, fills job application forms, and optionally uses a local Ollama model for ambiguous fields, job analysis, and application answers.

The extension never submits an application. Ollama is optional: if it is offline, Phase 1 autofill still works.

## Privacy model

- Resume parsing runs in the extension popup.
- The structured profile is stored in IndexedDB on the extension origin.
- Job text is extracted in the content script and only sent to **local** Ollama when you click Analyze Job, Generate Answer, or when an ambiguous field is classified.
- There is no analytics SDK, no telemetry, and no cloud AI provider.
- Resume contents, email, phone, addresses, generated answers, and full job descriptions are never written to logs.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the tab you opened the popup on so the extension can scan and fill that page. |
| `host_permissions` for `http://*/*` and `https://*/*` | Content script on job pages, and `fetch` to a local Ollama server (default `http://localhost:11434`). |

No `storage` permission is requested. Profile, settings, and AI cache use IndexedDB.

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

## Production build

```bash
npm run build
npm run typecheck
npm run test
```

## Upload a resume

1. Click the extension icon.
2. Drop a PDF or DOCX, or browse to a file.
3. Review the extraction summary, edit fields, and click **Save Profile**.

Sample resume: `test-pages/sample-resume.pdf`.

## Ollama (optional)

AI features talk only to the Ollama HTTP API you configure. No model is hardcoded.

1. Install [Ollama](https://ollama.com).
2. Start the server (`ollama serve` if it is not already running).
3. Pull a local model, for example `ollama pull qwen3:8b` — use any model you have installed.
4. Open the extension **AI** tab.
5. Confirm the URL (`http://localhost:11434` by default).
6. Click **Test Connection** and select a model.
7. Click **Save**.

If Ollama is disconnected, the popup shows that status and basic autofill remains available.

## Test autofill and AI

```bash
npx --yes serve test-pages -p 4173
```

Open `http://localhost:4173`.

Phase 1:

1. Save a profile.
2. Detect fields, deselect one, **Fill Selected**.
3. Confirm React-like inputs update on `input` events.
4. Wait for dynamic fields, refresh, fill those too.
5. Confirm **Submit application** is never clicked.

Phase 2 (Ollama running):

1. Open **AI**, test connection, select a model.
2. Open **Job** — title/company should come from the test page.
3. Click **Analyze Job** and review profile relevance (not a hiring probability).
4. Generate, edit, and **Use Answer** on a narrative question.
5. Confirm existing textarea content is not overwritten without Replace.
6. Stop Ollama and confirm Apply/autofill still works.

## Architecture

```text
Detected field
      ↓
Deterministic matcher
      ↓
confidence high? ── yes → fill after user confirmation
      ↓ no
Optional Ollama classifier (allowlisted profile sources only)
      ↓
User reviews
      ↓
Form filler (never Submit)
```

Job analysis and answer generation are explicit button clicks. They are not run on page load.

| Area | Path |
| --- | --- |
| Domain types | `types/` |
| Resume parsers | `parser/` |
| IndexedDB | `storage/` |
| Field matching | `matching/` |
| AI provider / Ollama | `ai/` |
| Prompts | `prompts/` |
| Form detect / job extract / fill | `lib/` |
| Content script | `contents/form-scanner.ts` |
| Popup UI | `popup.tsx`, `components/` |

The rest of the app depends on `AIProvider`, not on Ollama types. Model output is JSON that is Zod-validated. Profile sources are allowlisted. The model never receives DOM nodes and never performs fill or navigation.

## Known limitations

- Resume extraction is heuristic.
- Job extraction is generic (title, JSON-LD, headings, main/article). Unusual layouts may miss the company or description.
- Content scripts run in the top frame only. Cross-origin ATS iframes are not filled.
- Checkbox, radio, file, date, and password controls are ignored.
- The extension never clicks Submit, Apply, or Next.
- Ollama quality depends on the local model you install.
- PDF.js needs `assets/pdf.worker.min.mjs` (copied on `npm install`).

## Phase 3 (not implemented)

- Local embeddings / RAG over experience
- Multiple resume versions
- Application tracking
- Cover letter drafts
- Iframe / ATS-specific adapters
