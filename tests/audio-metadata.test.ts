import test from "node:test";
import assert from "node:assert/strict";
import { parseDurationToMs } from "../src/lib/audio-metadata";

test("parses ffprobe duration strings into milliseconds", () => {
  assert.equal(parseDurationToMs("1.234000"), 1234);
  assert.equal(parseDurationToMs("0.000000"), 0);
});

test("rejects invalid ffprobe duration values", () => {
  assert.throws(() => parseDurationToMs("N/A"), /Invalid audio duration/);
});
