import { createHash } from "node:crypto";
/* eslint-disable no-await-in-loop -- Closed static inventory, ordered bounded I/O. */
// Read-only public artifact verifier; no dependencies or private-repository access.
import { readFile, readdir, lstat } from "node:fs/promises";
const manifest = JSON.parse(await readFile("site-manifest.json", "utf8"));
const allowed =
  /^(?:index\.html|404\.html|search\/index\.html|docs\/[a-z0-9-]+\/index\.html|assets\/search\.(?:js|json)|assets\/graphfold\.svg|LICENSE\.txt|NOTICE\.txt|\.nojekyll)$/;
if (
  manifest.base !== "/denton-docs/" ||
  !Array.isArray(manifest.files) ||
  manifest.files.length > 256
)
  throw Error("Invalid static inventory");
const expected = new Map(manifest.files.map((f) => [f.path, f]));
if (expected.size !== manifest.files.length)
  throw Error("Duplicate static path");
let bytes = 0,
  count = 0;
async function inspect(dir) {
  for (const name of await readdir(dir)) {
    const path = dir + "/" + name,
      s = await lstat(path);
    if (s.isSymbolicLink()) throw Error("Symlink rejected");
    if (s.isDirectory()) {
      if (
        ![...expected.keys()].some((key) => key.startsWith(path.slice(5) + "/"))
      )
        throw Error("Unexpected static directory");
      await inspect(path);
      continue;
    }
    const logical = path.slice(5),
      entry = expected.get(logical);
    if (
      !s.isFile() ||
      s.nlink !== 1 ||
      !allowed.test(logical) ||
      !entry ||
      s.size > 2097152 ||
      (bytes += s.size) > 16777216
    )
      throw Error("Unexpected static file");
    const data = await readFile(path);
    if (
      data.length !== entry.bytes ||
      createHash("sha256").update(data).digest("hex") !== entry.sha256
    )
      throw Error("Static commitment mismatch");
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    if (
      /sourceMappingURL|\/workspace\/|\/Users\/|file:\/\/|github\.com\/brybrophy\/(?!denton-docs(?:[/#?]|$))|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
        text,
      )
    )
      throw Error("Private material rejected");
    count++;
  }
}
await inspect("site");
if (count !== expected.size) throw Error("Missing static file");
console.log(
  `Verified ${count} static files (${bytes} bytes). No source or runtime is deployed.`,
);
