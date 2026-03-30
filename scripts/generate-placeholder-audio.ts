/**
 * Generate silent MP3 placeholders for all audio slots in the manifest.
 * Uses ffmpeg to create silent audio of appropriate duration.
 * This allows Remotion to render the video without an ElevenLabs API key.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const date = new Date().toISOString().slice(0, 10);
const episodeDir = path.join(process.cwd(), "runtime", "episodes", date);
const manifestPath = path.join(episodeDir, "manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.error("No manifest found at", manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const audioDir = path.join(episodeDir, "audio");
fs.mkdirSync(audioDir, { recursive: true });

// Also create public/ mirrors for Remotion
const publicAudio = path.join(process.cwd(), "public", "audio");
fs.mkdirSync(publicAudio, { recursive: true });

function generateSilentMp3(outputPath: string, durationMs: number) {
  const durationSec = (durationMs / 1000).toFixed(2);
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSec} -c:a libmp3lame -q:a 9 "${outputPath}"`,
    { stdio: "pipe" },
  );
  // Copy to public/ for Remotion
  const publicPath = path.join(publicAudio, path.basename(outputPath));
  fs.copyFileSync(outputPath, publicPath);
}

// Scene audio
const sceneAudio = [
  { key: "intro", script: manifest.introScript, durationKey: "introAudioDurationMs", pathKey: "introAudioPath", file: "scene-intro.mp3", defaultMs: 8000 },
  { key: "pulse", script: manifest.pulseScript, durationKey: "pulseAudioDurationMs", pathKey: "pulseAudioPath", file: "scene-pulse.mp3", defaultMs: 6000 },
  { key: "moversHeader", script: manifest.moversHeaderScript, durationKey: "moversHeaderAudioDurationMs", pathKey: "moversHeaderAudioPath", file: "scene-movers-header.mp3", defaultMs: 4000 },
  { key: "rocketsHeader", script: manifest.rocketsHeaderScript, durationKey: "rocketsHeaderAudioDurationMs", pathKey: "rocketsHeaderAudioPath", file: "scene-rockets-header.mp3", defaultMs: 4000 },
  { key: "outro", script: manifest.outroScript, durationKey: "outroAudioDurationMs", pathKey: "outroAudioPath", file: "scene-outro.mp3", defaultMs: 6000 },
];

for (const scene of sceneAudio) {
  if (scene.script) {
    const outputPath = path.join(audioDir, scene.file);
    const durationMs = manifest[scene.durationKey] || scene.defaultMs;
    console.log(`Generating: ${scene.file} (${(durationMs / 1000).toFixed(1)}s)`);
    generateSilentMp3(outputPath, durationMs);
    manifest[scene.pathKey] = `audio/${scene.file}`;
    manifest[scene.durationKey] = durationMs;
  }
}

// Per-skill audio
const allSkills = [...manifest.movers, ...manifest.rockets];
for (const skill of allSkills) {
  const fileName = `${skill.slug.replace(/[^a-z0-9-]/g, "-")}.mp3`;
  const outputPath = path.join(audioDir, fileName);
  const durationMs = skill.audioDurationMs || 8000;
  console.log(`Generating: ${fileName} (${(durationMs / 1000).toFixed(1)}s) — ${skill.displayName}`);
  generateSilentMp3(outputPath, durationMs);
  skill.audioPath = `audio/${fileName}`;
  skill.audioDurationMs = durationMs;
}

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nGenerated ${sceneAudio.filter(s => s.script).length + allSkills.length} audio files.`);
console.log(`Updated manifest: ${manifestPath}`);
