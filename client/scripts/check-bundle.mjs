import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(dist, ".vite/manifest.json"), "utf8"));
const visited = new Set();
function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  for (const dependency of manifest[key]?.imports || []) visit(dependency);
}
visit("index.html");
const files = [...visited].map((key) => manifest[key]?.file).filter((file) => file?.endsWith(".js"));
let bytes = 0, gzip = 0;
for (const file of files) {
  const buffer = fs.readFileSync(path.join(dist, file));
  bytes += buffer.length;
  gzip += gzipSync(buffer).length;
}
const brandFiles = ["tadaruj-logo.webp", "tadaruj-logo-dark.webp", "tadaruj-logo-ar.webp", "tadaruj-logo-ar-dark.webp", "default-avatar.webp", "brand-mark.webp", "favicon-32.png"];
const brandAssetsBytes = brandFiles.reduce((total, file) => total + fs.statSync(path.join(dist, file)).size, 0);
console.log(JSON.stringify({ initialJavaScriptBytes: bytes, initialJavaScriptGzipBytes: gzip, brandAssetsBytes, initialChunks: files }, null, 2));
// Budget applies to startup code, not optional video engines loaded during playback.
if (bytes > 650000 || gzip > 200000 || brandAssetsBytes > 350 * 1024) {
  console.error("Initial JavaScript exceeds the startup budget.");
  process.exitCode = 1;
}
