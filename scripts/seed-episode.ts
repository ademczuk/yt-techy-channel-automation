import { DEFAULT_EPISODE_DATA } from "../src/lib/default-episode";
import fs from "fs";
import path from "path";

const date = new Date().toISOString().slice(0, 10);
const episodeDir = path.join(process.cwd(), "runtime", "episodes", date);
fs.mkdirSync(episodeDir, { recursive: true });

const manifestPath = path.join(episodeDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(DEFAULT_EPISODE_DATA, null, 2));

// Create latest junction
const latestDir = path.join(process.cwd(), "runtime", "episodes", "latest");
try {
  fs.rmSync(latestDir, { recursive: true, force: true });
} catch {}
fs.symlinkSync(path.resolve(episodeDir), latestDir, "junction");

console.log(`Manifest: ${manifestPath}`);
console.log(`Movers: ${DEFAULT_EPISODE_DATA.movers.length} | Rockets: ${DEFAULT_EPISODE_DATA.rockets.length}`);
console.log(`Latest → ${path.resolve(episodeDir)}`);
