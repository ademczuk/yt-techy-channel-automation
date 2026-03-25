/**
 * render.ts — Single-command renderer for ClawHub Weekly.
 *
 * Usage:
 *   npm run render
 *   npm run render -- --output my-video.mp4 --crf 18
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  loadEpisodeManifest,
  resolveOutputPath,
} from "./src/lib/load-manifest";
import { stageRuntimeAssets } from "./src/lib/runtime-assets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      opts[args[i].replace(/^--/, "")] = args[i + 1] || "";
      i++;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const fps = parseInt(opts.fps || "30", 10);
  const crf = parseInt(opts.crf || "18", 10);
  const manifestPath = opts.manifest || undefined;
  const outputPath = opts.output || path.join("out", "clawhub-weekly.mp4");
  const inputProps = loadEpisodeManifest(manifestPath);

  stageRuntimeAssets(process.cwd(), inputProps);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  console.log("Bundling Remotion project...");
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, "src", "index.ts"),
  });

  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "SkillsWeekly",
    inputProps,
  });

  console.log(
    `\nRendering Code Search video`,
  );
  console.log(`  Manifest: ${resolveOutputPath(manifestPath)}`);
  console.log(
    `  Duration: ${composition.durationInFrames} frames (${(composition.durationInFrames / fps).toFixed(1)}s)`,
  );
  console.log(`  Output: ${outputPath}\n`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    inputProps,
    codec: "h264",
    outputLocation: outputPath,
    crf,
    onProgress: ({ progress }) => {
      process.stdout.write(`\rRendering: ${Math.round(progress * 100)}%`);
    },
  });

  console.log(`\n\nDone! Output: ${outputPath}`);
  console.log(
    `  ${(composition.durationInFrames / fps).toFixed(1)}s | ${composition.width}x${composition.height} @ ${fps}fps`,
  );
}

main().catch((err) => {
  console.error("\nRender failed:", err);
  process.exit(1);
});
