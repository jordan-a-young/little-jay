# Applications

- These are consumers and examples, not shared libraries. Import workspace packages through their public exports; do not reach into another package's source or dist files. The existing development-only UI CSS alias is intentional.
- Keep routes, domain validation, Query caching, logging policy, process lifecycle, and demo state application-owned. Shared components must not import application code.
- Read `playground/AGENTS.md` or `api/AGENTS.md` for the selected app. Tests run from the root with `pnpm test apps/<app>/src`; build workspace dependencies first on a fresh checkout.

## Isolated development

- For an already-running development session, follow the [fast development loop](../AGENTS.md#fast-development-loop): playground and UI component source/styles hot-reload without manual builds or restarts. The setup commands below are for starting a session, not steps to repeat after every edit. API app source restarts through `tsx watch`.
- Root `pnpm dev` builds UI dependencies and starts only the frontend catalog; `pnpm dev:server` separately builds the server dependency and starts the synthetic async demo. The default UI can silently fall back to another port. For agent sessions, select free ports and use strict UI binding.
- Example assignments below use UI 5174 and API 5051; replace both if occupied. Inspect listeners (for example, `ss -ltnp`), record task ownership and commands, and verify the actual ready listeners. A free-port check is not a reservation.

```sh
pnpm --filter '@littlejay/ui...' --filter @littlejay/server build
HOST=127.0.0.1 PORT=5051 pnpm --filter @littlejay/api dev:demo
pnpm --filter @littlejay/playground dev --host 127.0.0.1 --port 5174 --strictPort
```

- Run the optional API and UI commands in separate task-owned terminals/jobs. The frontend has no API target or proxy and must work with the API stopped. On a port conflict, choose a free replacement; retry at most three times. The original API watcher remains `pnpm --filter @littlejay/api dev` after building its dependency; it is not started by the catalog.
- Preview uses `pnpm --filter @littlejay/playground preview --host 127.0.0.1 --port 4174 --strictPort` after a build, with a separately allocated port. Static guide and hooks pages must work there without an API or reverse proxy too.
- Record URLs, checkout path, and process/job IDs. Stop only task-owned processes when finished. Rebuild/restart affected services after token/server library or UI build-config changes; do not rebuild underneath another task's running apps.
