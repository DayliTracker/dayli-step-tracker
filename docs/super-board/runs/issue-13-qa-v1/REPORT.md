# QA report — issue #13 · load Nunito and Lexend per visual system · v1

Branch `issue-13-load-nunito-and-lexend-per-visual-system` @ `c2ae04e` (PR #32).
Device: iPhone 17 simulator, iOS 27.0 (UDID `77EC52AC-8FB5-4CE2-B248-A27A071541EE`).
Build: `CI=1 npx expo run:ios --configuration Release --device 77EC52AC-…` (the project's
own Expo tooling, `package.json` script `ios`); launched with
`xcrun simctl launch booted com.anonymous.dayli-step-tracker`.

## AC verdicts

| AC | Verdict | Evidence |
|---|---|---|
| Today, Progress, and Settings render in Nunito and Lexend in the simulator | ✅ pass | `ac1-today-nunito-lexend.png`, `ac1-progress-nunito-lexend.png`, `ac1-settings-nunito-lexend.png` — letterforms are Nunito (display: eyebrow, screen titles, cheer) and Lexend (body, labels, numerals), not the iOS system font, on all three screens |
| Fonts load before first render or fall back gracefully with no unstyled flash | ✅ pass | six weight files passed to `useFonts` at `App.tsx:35-40`; `App.tsx:57` returns `null` until `fontsLoaded || fontsError`, so the launch screen holds (caught in `ac2-launch-first-paint.png` — white launch frame, no unstyled app content); on error the app still renders and unloaded names fall back to the system font. Font TTFs are bundled in the release `.app` (verified: `Lexend_400Regular.ttf` … `Nunito_800ExtraBold.ttf` present in the container), so loading is local, not network |
| Larger Dynamic Type sizes reflow without clipping on the Today card | ✅ pass | `ac3-today-xxxl.png` (XXXL) and `ac3-today-ax3.png` + `ac3-today-ax3-scrolled.png` (accessibility-XXL): text wraps and the card grows; summary reflows across five lines fully readable; no truncation or ellipsis on the Today card; count numeral scales via `adjustsFontSizeToFit` (`App.tsx:127`) |
| `npm run typecheck` and `npm test` pass | ✅ pass | `npm run typecheck` → exit 0; `npm test` (`node --experimental-strip-types --test tests/*.test.mjs`) → 28/28 pass, exit 0 |

## Notes (not AC failures)

- At accessibility-XXL the ring's `steps` label sits over the decorative ring segments and the
  `Progress` tab label wraps mid-word (`ac3-today-ax3.png`) — readable, outside the Today-card
  scope of AC3, cosmetic at extreme sizes only.
- Release build boots cleanly; the Builder's risk note about Metro reload survival applies to
  dev builds and was not exercised here.

## Test-gap ledger (AC → asserting file:line)

| AC | Unit | Component | Visual/e2e |
|---|---|---|---|
| 1 | `tests/tokens.test.mjs:27-33` pins `typeFace` values; `tests/tokens.test.mjs:36-39` bans literal `fontFamily`/`fontVariant` in `App.tsx` | none — repo has no RN component-test runner | this run's simulator screenshots |
| 2 | none — `useFonts` gate (`App.tsx:57`) and error branch have no automated test (no RN harness) | none | launch + boot screenshots this run |
| 3 | none | none | simctl `content_size` screenshots this run |
| 4 | the suite itself | — | the commands |

## Test gaps (not written)

- **Medium** — no test links the names passed to `useFonts` (`App.tsx:35-40`) to the `typeFace`
  token values; a weight dropped from `useFonts` but kept in `typeFace` would silently fall back
  to the system font and only visual evidence would catch it. Rung: unit (parse the `useFonts`
  call against `typeFace`).
- **Low** — the `fontsError` fallback branch is untestable without a component harness; the repo
  has none. Acceptable for a shell phase.

No High gaps: no auth, money, security, or data-loss surface in this diff.
