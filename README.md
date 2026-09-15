# Code Recall

Code Recall is a local-first Chrome extension that turns completed NeetCode
problems into a spaced repetition queue. It combines a user-controlled daily
new/review split with per-problem scheduling from FSRS.

Code Recall is an independent project and is not affiliated with NeetCode or
LeetCode.

## What works in v0.1.0

- A daily goal with a fixed new/review split.
- Stable daily plans drawn from the NeetCode 150 roadmap order.
- Automatic completion detection after a NeetCode **Submit** action reports an
  accepted result.
- A popup-based manual completion fallback.
- Pending ratings that survive closing the page or popup.
- Three ratings: **Needed help**, **Solved**, and **Easy**.
- Local persistence through `chrome.storage.local`; no account or backend.

## Development setup

Requirements: Node.js 24+, npm, and Google Chrome or Chromium.

```sh
npm install
npm run dev
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
and select the generated `dist` directory. Keep the Vite process running while
developing. If you install or reload the extension while a NeetCode problem is
already open, refresh that problem tab so Chrome injects the content script.

For a production-style build:

```sh
npm run build
```

Then load the same `dist` directory as an unpacked extension.

## Verification

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser test loads the built extension in Chromium and exercises onboarding
through the real popup page. Unit tests cover scheduling, daily planning, state
validation, settings, and semantic NeetCode result detection.

## Architecture

- `src/background` is the only writer to extension state. It validates typed
  messages, creates frozen daily plans, and applies ratings.
- `src/content` is a narrow NeetCode adapter. Detection is armed by a Submit
  click and then looks for a semantic accepted-result signal for two minutes.
- `src/domain` contains browser-independent FSRS and planning logic.
- `src/storage` owns schema validation, migrations, and serialized writes.
- `src/popup` contains onboarding, the queue, pending ratings, and the manual
  fallback.
- `src/catalog/neetcode150.json` is a versioned, runtime-independent catalog.

The detector intentionally does not trust NeetCode’s roadmap solved toggle. If
NeetCode changes its accepted-result text or markup, update
`neetcodeAdapter.ts` and its sanitized fixture instead of touching scheduling
code.

## Scheduling behavior

The daily review capacity is `daily total - requested new`. Due reviews fill
those slots oldest-first. Excess due work remains visible as backlog. If there
are too few reviews, unused slots become additional new problems; reviews are
never pulled forward.

Completed problems are scheduled with `ts-fsrs` at 90% desired retention, with
minute-scale same-day steps disabled and a one-year maximum interval. Ratings
map to FSRS as follows:

| Code Recall | FSRS  |
| ----------- | ----- |
| Needed help | Again |
| Solved      | Good  |
| Easy        | Easy  |

Settings changes apply when the next daily plan is created. Existing plans stay
frozen so reopening the popup never reshuffles the day.

## Manual smoke test

1. Load `dist` as an unpacked extension and complete onboarding.
2. Open one of the queued NeetCode problems.
3. Submit a correct solution and confirm the Code Recall rating card appears.
4. Dismiss it, open the popup, and confirm the pending rating is still present.
5. Choose a rating and confirm the queue item remains complete.
6. On another problem page, use **Mark done** to verify the fallback path.

Automatic detection is semantic rather than coupled to one generated CSS class.
Before publishing, repeat this smoke test against a signed-in NeetCode account
and update `tests/fixtures/accepted-result.html` if the live result wording has
changed.
