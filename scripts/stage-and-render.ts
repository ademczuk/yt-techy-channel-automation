/**
 * Stage runtime assets into public/ and trigger the Remotion render.
 */
import fs from "fs";
import path from "path";

const episodeDir = path.join(process.cwd(), "runtime", "episodes", "latest");
const manifestPath = path.join(episodeDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("No manifest at", manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Stage all runtime assets into public/
function stageAsset(relativePath: string | undefined) {
  if (!relativePath) return;
  
  // Try both episode dir and root-relative paths
  const candidates = [
    path.join(episodeDir, relativePath),
    path.join(process.cwd(), relativePath),
  ];
  
  for (const source of candidates) {
    if (fs.existsSync(source)) {
      const dest = path.join(process.cwd(), "public", relativePath);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(source, dest);
      return;
    }
  }
  console.warn(`  ⚠ Missing asset: ${relativePath}`);
}

console.log("Staging assets...");

// Scene audio
stageAsset(manifest.introAudioPath);
stageAsset(manifest.pulseAudioPath);
stageAsset(manifest.moversHeaderAudioPath);
stageAsset(manifest.rocketsHeaderAudioPath);
stageAsset(manifest.outroAudioPath);
stageAsset(manifest.backgroundMusicPath);

// Skill assets
for (const skill of [...manifest.movers, ...manifest.rockets]) {
  stageAsset(skill.screenshotPath);
  stageAsset(skill.audioPath);
  stageAsset(skill.clipPath);
}

console.log("Assets staged. Ready to render.");
