import fs from "fs";
import path from "path";
import type { SkillsWeeklyProps } from "./episode-types";

export function collectRuntimeAssetPaths(manifest: SkillsWeeklyProps): string[] {
  const paths = new Set<string>();

  const maybeAdd = (value?: string) => {
    if (value?.startsWith("runtime/")) {
      paths.add(value);
    }
  };

  maybeAdd(manifest.introAudioPath);
  maybeAdd(manifest.pulseAudioPath);
  maybeAdd(manifest.moversHeaderAudioPath);
  maybeAdd(manifest.rocketsHeaderAudioPath);
  maybeAdd(manifest.outroAudioPath);
  maybeAdd(manifest.backgroundMusicPath);

  for (const skill of [...manifest.movers, ...manifest.rockets]) {
    maybeAdd(skill.clipPath);
    maybeAdd(skill.screenshotPath);
    maybeAdd(skill.audioPath);
  }

  return Array.from(paths);
}

export function stageRuntimeAssets(
  rootDir: string,
  manifest: SkillsWeeklyProps,
): void {
  for (const relativeAssetPath of collectRuntimeAssetPaths(manifest)) {
    const sourcePath = path.join(rootDir, relativeAssetPath);
    const publicPath = path.join(rootDir, "public", relativeAssetPath);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing runtime asset: ${sourcePath}`);
    }

    fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    fs.copyFileSync(sourcePath, publicPath);
  }
}
