import test from "node:test";
import assert from "node:assert/strict";
import { getRecordingVideoStyle } from "../src/lib/screen-demo-remotion";

test("getRecordingVideoStyle uses contain so the captured browser window is not cropped on the left edge", () => {
  assert.deepEqual(getRecordingVideoStyle(), {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    backgroundColor: "#05070a",
  });
});
