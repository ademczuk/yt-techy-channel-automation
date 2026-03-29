import test from "node:test";
import assert from "node:assert/strict";
import { buildProcessInvocation } from "../src/lib/process-runner";

test("builds direct executable invocations without shell wrapping", () => {
  const invocation = buildProcessInvocation(["npx", "tsx", "scripts/build-episode.ts"]);

  if (process.platform === "win32") {
    assert.match(invocation.file, /cmd\.exe$/i);
    assert.deepEqual(invocation.args, [
      "/d",
      "/c",
      "npx tsx scripts/build-episode.ts",
    ]);
  } else {
    assert.equal(invocation.file, "npx");
    assert.deepEqual(invocation.args, ["tsx", "scripts/build-episode.ts"]);
  }
});

test("rejects empty command arrays", () => {
  assert.throws(
    () => buildProcessInvocation([]),
    /Cannot run an empty command/,
  );
});
