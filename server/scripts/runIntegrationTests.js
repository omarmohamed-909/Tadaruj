// Requires the isolated local replica set; never reads the application's MONGO_URI.
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const base = "mongodb://127.0.0.1:27028";
const connection = await mongoose.createConnection(`${base}/admin?replicaSet=codex-test`, { serverSelectionTimeoutMS: 10000 }).asPromise();
try {
  const hello = await connection.db.admin().command({ hello: 1 });
  if (hello.setName !== "codex-test" || !hello.isWritablePrimary) throw new Error("The isolated codex-test replica set must have a writable primary.");
} finally { await connection.close(); }

const database = () => `${base}/tadaruj_test_${randomBytes(12).toString("hex")}?replicaSet=codex-test`;
const args = process.argv.includes("--all") ? [] : ["__tests__/journey.integration.test.js", "__tests__/googleAuth.integration.test.js", "__tests__/catalog.integration.test.js"];
const child = spawn(process.execPath, [fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url)), "run", ...args], {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  stdio: "inherit",
  windowsHide: true,
  env: { ...process.env, NODE_ENV: "test", EMAIL_DELIVERY_ENABLED: "false", TEST_MONGO_URI: database(), TEST_GOOGLE_MONGO_URI: database(), TEST_CATALOG_MONGO_URI: database() },
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
