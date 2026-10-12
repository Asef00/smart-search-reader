# Verification

Validated on 2026-10-06 with Node.js 24.19.0 and Chromium 153.

| Check | Result |
| --- | --- |
| ESLint | Passed |
| Strict TypeScript + production build | Passed |
| Unit tests (Vitest) | 11 passed |
| Browser tests: desktop Chromium | 7 passed |
| Browser tests: Pixel 7 emulation in Chromium | 7 passed |
| Offline reload, search, suggestions and local font | Passed in both browser profiles |
| Widths 320, 390, 768 and 1280 px | No horizontal page overflow |
| Manifest and local PNG installation icons | Passed |

The browser suite runs against the production build, not the development server. The validation environment used a locally supplied Chromium executable with the committed Playwright test suite. Default setup instructions in README use Playwright's browser installer.

Real-device installation on iOS and Android has not been tested. Mobile browser emulation is not a substitute for Safari or a physical device. The update prompt is implemented, but a two-version update cycle has not been exercised by the automated suite.

Screenshots: `desktop.png`, `mobile.png`, `search.png`.
