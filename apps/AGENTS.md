# Applications

- These are consumers and examples, not shared libraries. Import workspace packages through their public exports; do not reach into another package's source or dist files. The existing development-only UI CSS alias is intentional.
- Keep routes, domain validation, Query caching, logging policy, process lifecycle, and demo state application-owned. Shared components must not import application code.
- Read `playground/AGENTS.md` or `api/AGENTS.md` for the selected app. Tests run from the root with `pnpm test apps/<app>/src`; build workspace dependencies first on a fresh checkout.

## Isolated development

- For an already-running development session, follow the [fast development loop](../AGENTS.md#fast-development-loop): playground and UI component source/styles hot-reload without manual builds or restarts. The setup commands below are for starting a session, not steps to repeat after every edit. API app source restarts through `tsx watch`.
- Root `pnpm dev` builds libraries and starts both apps, but the default UI can silently fall back to another port. For agent sessions, select free ports and start the apps separately with strict UI binding.
- Example assignments below use UI 5174 and API 5051; replace both if occupied. Inspect listeners (for example, `ss -ltnp`), record task ownership and commands, and verify the actual ready listeners. A free-port check is not a reservation.

```sh
pnpm --filter @littlejay/tokens --filter @littlejay/server --filter @littlejay/http --filter @littlejay/ui build
HOST=127.0.0.1 PORT=5051 pnpm --filter @littlejay/api dev
API_PROXY_TARGET=http://127.0.0.1:5051 pnpm --filter @littlejay/playground dev --host 127.0.0.1 --port 5174 --strictPort
```

- Run the API and UI commands in separate task-owned terminals/jobs. Do not point the UI at an unrelated existing API. On a port conflict, choose another pair and update the proxy target; retry at most three times.
- Preview uses `pnpm --filter @littlejay/playground preview --host 127.0.0.1 --port 4174 --strictPort` after a build, with a separately allocated port. The development API proxy is not provided by preview/production; do not assume API examples work there without a configured reverse proxy.
- Record URLs, API target, checkout path, and process/job IDs. Stop only task-owned processes when finished. Rebuild/restart after token, HTTP/server library, or UI build-config changes; do not rebuild underneath another task's running apps.
