---
"@littlejay/server": minor
---

Move Fastify to a consumer-owned peer dependency (`~5.12.7`), retaining exact development version 5.12.8. Breaking installation change before 1.0: applications must declare a compatible Fastify dependency directly instead of relying on this package's transitive installation. Factory, plugin and response contracts are unchanged.

Document packed ESM and strict NodeNext compatibility checks for Fastify 5.12.7 and 5.12.8 on Node 24.18.0 and 26.13.0. These are tested combinations, not a guarantee for other versions or downstream plugins. Application lifecycle and logging policy remain caller-owned.
