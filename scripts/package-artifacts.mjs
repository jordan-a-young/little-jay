import assert from "node:assert/strict";

export function tarballFilename(name, version) {
  assert.match(name, /^@littlejay\/[a-z0-9-]+$/);
  assert.match(version, /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
  return `${name.slice(1).replace("/", "-")}-${version}.tgz`;
}
