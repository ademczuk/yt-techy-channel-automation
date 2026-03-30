import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "fs";
import path from "path";

export async function renderScreenDemoFromProps(input: {
  rootDir: string;
  propsPath: string;
  outputPath: string;
}) {
  const inputProps = JSON.parse(fs.readFileSync(input.propsPath, "utf8"));
  const bundleLocation = await bundle({
    entryPoint: path.join(input.rootDir, "src", "index.ts"),
  });
  syncRenderAssetsIntoBundle(bundleLocation, input.rootDir, inputProps);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "ScreenDemo",
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    inputProps,
    codec: "h264",
    outputLocation: input.outputPath,
  });
}

function syncRenderAssetsIntoBundle(
  bundleLocation: string,
  rootDir: string,
  inputProps: { recordingSrc?: string; audioTracks?: Array<{ src: string }> },
) {
  const assetPaths = [
    inputProps.recordingSrc,
    ...(inputProps.audioTracks ?? []).map((track) => track.src),
  ].filter((entry): entry is string => Boolean(entry) && entry.startsWith("/"));

  for (const assetSrc of assetPaths) {
    const relativeAssetPath = assetSrc.replace(/^\/+/, "").replace(/\//g, path.sep);
    const sourcePath = path.join(rootDir, "public", relativeAssetPath);
    const destPath = path.join(bundleLocation, relativeAssetPath);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(sourcePath, destPath);
  }
}
