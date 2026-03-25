import fs from "fs";
import path from "path";
import { DEFAULT_EPISODE_DATA } from "./default-episode";
import {
  SkillsWeeklyPropsSchema,
  type SkillsWeeklyProps,
} from "./episode-types";

export const DEFAULT_MANIFEST_PATH = path.join(
  process.cwd(),
  "runtime",
  "episodes",
  "latest",
  "manifest.json",
);

export function loadEpisodeManifest(
  manifestPath?: string,
): SkillsWeeklyProps {
  const resolvedPath = manifestPath ?? DEFAULT_MANIFEST_PATH;

  if (!fs.existsSync(resolvedPath)) {
    return DEFAULT_EPISODE_DATA;
  }

  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);
  return SkillsWeeklyPropsSchema.parse(parsed);
}

export function resolveOutputPath(manifestPath?: string): string {
  const resolvedPath = manifestPath ?? DEFAULT_MANIFEST_PATH;
  return path.resolve(resolvedPath);
}
