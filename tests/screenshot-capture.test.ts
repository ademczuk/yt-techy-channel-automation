import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CAPTURE_CONFIG,
  buildCaptureUrl,
  buildReadmeFocusScript,
  getScreenshotFailureReason,
  isScreenshotUsable,
} from "../src/lib/screenshot-capture";

test("github repo urls capture from the readme anchor by default", () => {
  assert.equal(
    buildCaptureUrl("https://github.com/NousResearch/hermes-agent"),
    "https://github.com/NousResearch/hermes-agent#readme",
  );
});

test("non github urls stay unchanged for capture", () => {
  assert.equal(
    buildCaptureUrl("https://example.com/tool"),
    "https://example.com/tool",
  );
});

test("viewport-sized screenshots pass validation", () => {
  assert.equal(
    isScreenshotUsable(
      {
        size: 250_000,
        width: 1920,
        height: 1080,
      },
      DEFAULT_CAPTURE_CONFIG,
    ),
    true,
  );
});

test("tiny or malformed screenshots are rejected with a reason", () => {
  assert.equal(
    getScreenshotFailureReason(
      {
        size: 3_695,
        width: 1264,
        height: 625,
      },
      DEFAULT_CAPTURE_CONFIG,
    ),
    "file-too-small",
  );

  assert.equal(
    getScreenshotFailureReason(
      {
        size: 967_684,
        width: 1920,
        height: 100_001,
      },
      DEFAULT_CAPTURE_CONFIG,
    ),
    "height-too-tall",
  );
});

test("readme focus script targets markdown content when present", () => {
  const script = buildReadmeFocusScript();

  assert.match(script, /#readme/);
  assert.match(script, /markdown-body/);
  assert.match(script, /scrollIntoView/);
});
