---
"@littlejay/http": patch
---

Accept JSON Content-Type headers with semicolons or charset-like text inside quoted extension parameters, respecting escaped quotes and backslashes. Actual unsupported charset parameters remain rejected. Unterminated quoted parameters now return the safe `content_type` error; servers must close quoted parameter values.
