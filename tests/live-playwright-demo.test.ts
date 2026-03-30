import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFullscreenBrowserLaunchArgs,
  buildRegionCaptureArgs,
  buildWindowCaptureArgs,
  buildTrimmedLivePlaywrightEditConfig,
  isBoxMostlyVisibleInViewport,
  isRedundantSelfClick,
  isRepoScopedLink,
  resolveSafeBrowserChromePoint,
  resolveSafeBrowserScreenPoint,
} from "../src/lib/live-playwright-demo";

test("buildTrimmedLivePlaywrightEditConfig normalizes moments and keeps natural playback speed", () => {
  const { normalizedMoments, editConfig } = buildTrimmedLivePlaywrightEditConfig(
    [
      { timeMs: 1000, endMs: 1800, action: "hover", label: "header" },
      { timeMs: 2200, endMs: 2600, action: "click", label: "link" },
      { timeMs: 7000, endMs: 7600, action: "scroll", label: "readme" },
    ],
    7600,
  );

  assert.equal(normalizedMoments.length, 3);
  assert.equal(editConfig.playbackRate, 1);
  assert.equal(editConfig.fps, 60);
  assert.deepEqual(editConfig.camera, []);
  assert.equal(editConfig.clips.length, 2);
  assert.equal(editConfig.clips[0]?.startMs, 500);
  assert.equal(editConfig.clips[0]?.endMs, 3600);
  assert.equal(editConfig.clips[1]?.startMs, 6500);
  assert.equal(editConfig.clips[1]?.endMs, 7600);
});

test("buildFullscreenBrowserLaunchArgs locks the browser to a fullscreen primary-screen launch", () => {
  const args = buildFullscreenBrowserLaunchArgs({ width: 1920, height: 1080 });

  assert.ok(args.includes("--start-fullscreen"));
  assert.ok(args.includes("--start-maximized"));
  assert.ok(args.includes("--disable-gpu"));
  assert.ok(args.includes("--disable-direct-composition"));
  assert.ok(args.includes("--window-position=0,0"));
  assert.ok(args.includes("--window-size=1920,1080"));
});

test("buildWindowCaptureArgs records a single browser window with the mouse visible", () => {
  const args = buildWindowCaptureArgs({
    hwnd: 4242,
    outputPath: "C:\\demo.mp4",
  });

  assert.ok(args.includes("gdigrab"));
  assert.ok(args.includes("-draw_mouse"));
  assert.ok(args.includes("1"));
  assert.ok(args.includes("hwnd=4242"));
  assert.equal(args.at(-1), "C:\\demo.mp4");
});

test("buildRegionCaptureArgs records a specific desktop region with the mouse visible", () => {
  const args = buildRegionCaptureArgs({
    x: 20,
    y: 40,
    width: 1920,
    height: 1080,
    outputPath: "C:\\region.mp4",
  });

  assert.ok(args.includes("desktop"));
  assert.ok(args.includes("-offset_x"));
  assert.ok(args.includes("20"));
  assert.ok(args.includes("-offset_y"));
  assert.ok(args.includes("40"));
  assert.ok(args.includes("-video_size"));
  assert.ok(args.includes("1920x1080"));
  assert.equal(args.at(-1), "C:\\region.mp4");
});

test("isRedundantSelfClick catches same-page repo links and ignores different targets", () => {
  assert.equal(
    isRedundantSelfClick(
      "https://github.com/openai/codex",
      "https://github.com/openai/codex",
    ),
    true,
  );
  assert.equal(
    isRedundantSelfClick(
      "https://github.com/openai/codex",
      "https://github.com/openai/codex#readme",
    ),
    true,
  );
  assert.equal(
    isRedundantSelfClick(
      "https://github.com/openai/codex",
      "https://github.com/openai/openai-agents-python",
    ),
    false,
  );
});

test("resolveSafeBrowserScreenPoint keeps the OS mouse inside the browser client area", () => {
  const safe = resolveSafeBrowserScreenPoint(
    {
      screenX: -8,
      screenY: -8,
      outerWidth: 1936,
      outerHeight: 1048,
      innerWidth: 1920,
      innerHeight: 960,
    },
    { x: 1918, y: 958 },
  );

  assert.deepEqual(safe, {
    screenX: 1916,
    screenY: 1028,
  });

  assert.equal(
    resolveSafeBrowserScreenPoint(
      {
        screenX: -8,
        screenY: -8,
        outerWidth: 1936,
        outerHeight: 1048,
        innerWidth: 1920,
        innerHeight: 960,
      },
      { x: 2200, y: 300 },
    ),
    null,
  );
});

test("resolveSafeBrowserChromePoint allows tab-strip coordinates but blocks outside-window motion", () => {
  const safe = resolveSafeBrowserChromePoint(
    {
      screenX: -8,
      screenY: -8,
      outerWidth: 1936,
      outerHeight: 1048,
      innerWidth: 1920,
      innerHeight: 960,
    },
    { x: 320, y: 30 },
  );

  assert.deepEqual(safe, {
    screenX: 312,
    screenY: 22,
  });

  assert.equal(
    resolveSafeBrowserChromePoint(
      {
        screenX: -8,
        screenY: -8,
        outerWidth: 1936,
        outerHeight: 1048,
        innerWidth: 1920,
        innerHeight: 960,
      },
      { x: 320, y: 120 },
    ),
    null,
  );
});

test("isBoxMostlyVisibleInViewport rejects offscreen targets and keeps visible ones", () => {
  assert.equal(
    isBoxMostlyVisibleInViewport(
      { x: 300, y: 120, width: 200, height: 48 },
      { width: 1920, height: 960 },
    ),
    true,
  );
  assert.equal(
    isBoxMostlyVisibleInViewport(
      { x: 300, y: -57, width: 136, height: 43 },
      { width: 1920, height: 960 },
    ),
    false,
  );
});

test("isRepoScopedLink prefers same-repo GitHub links and rejects external destinations", () => {
  assert.equal(
    isRepoScopedLink(
      "https://github.com/bytedance/deer-flow",
      "/bytedance/deer-flow/blob/main/README_zh.md",
    ),
    true,
  );
  assert.equal(
    isRepoScopedLink(
      "https://github.com/browser-use/browser-use",
      "https://cloud.browser-use.com/signup",
    ),
    false,
  );
});
