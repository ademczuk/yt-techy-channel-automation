import test from "node:test";
import assert from "node:assert/strict";
import { readPngDimensions, toRuntimeAssetPath } from "../src/lib/image-metadata";

test("reads png dimensions from a minimal png header", () => {
  const buffer = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(1920, 16);
  buffer.writeUInt32BE(1080, 20);

  const result = readPngDimensions(buffer);

  assert.equal(result.width, 1920);
  assert.equal(result.height, 1080);
});

test("converts runtime file paths to manifest asset paths", () => {
  const result = toRuntimeAssetPath(
    "C:\\YT\\Code Search\\clawhub-weekly-master\\runtime\\episodes\\2026-03-24\\screenshots\\demo.png",
  );

  assert.equal(result, "runtime/episodes/2026-03-24/screenshots/demo.png");
});
