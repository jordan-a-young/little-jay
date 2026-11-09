---
"@littlejay/ui": minor
---

Replace the Radix-backed Dialog with the existing React Aria foundation, removing the redundant Dialog dependency. Retain Dialog/Trigger/Content/Close names, controlled and uncontrolled state, visible titles/descriptions/Close, sheets and themed portal destinations.

Breaking migration: replace vendor dismissal callbacks with `dismissOnEscape` and `dismissOnOutsidePress` (both default true); keep application-owned controlled pending guards. Content refs now target a section (`HTMLElement`) rather than a div. Vendor lifecycle props and internal markup/data attributes are no longer contracts. Normal focus restoration uses the previously focused control; a surviving application owner handles lost-focus fallback if that origin disappears, rather than `onCloseAutoFocus`. Closing unmounts content; lift drafts that must survive reopening.

Restrictive CSP applications must supply a fresh response-bound style nonce through the `csp-nonce` meta property before mounting React Aria and authorize that nonce in `style-src`. Scripts may remain self-only. This is not literal `style-src 'self'` compatibility. The increment targets Chromium; iOS/Safari/WebKit are unsupported. See the installed Dialog guide for setup and migration details.
