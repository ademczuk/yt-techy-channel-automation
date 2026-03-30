import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getEpisodeDir, getLocalDateStamp } from "../src/lib/episode-paths";
import { readAudioDurationMs } from "../src/lib/audio-metadata";

async function main() {
  const date = getLocalDateStamp();
  const rootDir = process.cwd();
  const manifestPath = path.join(getEpisodeDir(rootDir, date), "manifest.json");
  const episodeDir = path.dirname(manifestPath);
  const audioDir = path.join(episodeDir, "audio");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest file: ${manifestPath}`);
  }

  fs.mkdirSync(audioDir, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  async function generateQwenTTS(text: string, outputPath: string) {
    if (fs.existsSync(outputPath)) return;
    
    console.log(`TTS -> ${path.basename(outputPath)}`);
    const payload = {
      text,
      instruct: "Excited, professional, fast-paced YouTube automation tech channel voiceover",
      language: "English"
    };

    try {
      const response = await fetch("http://localhost:5094/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const tempWav = outputPath.replace(".mp3", ".wav");
      fs.writeFileSync(tempWav, buffer);
      
      // Convert WAV to MP3 using ffmpeg
      execSync(`ffmpeg -y -i "${tempWav}" -c:a libmp3lame -q:a 2 "${outputPath}"`, { stdio: "pipe" });
      fs.unlinkSync(tempWav);
    } catch (e: any) {
      console.error(`Error with Qwen TTS for ${path.basename(outputPath)}:`, e.message);
      console.log("Falling back to placeholder audio...");
      const wordCount = text.split(/\s+/).length;
      const durationSec = Math.max(2, (wordCount / 2.5)).toFixed(2);
      execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${durationSec} -c:a libmp3lame -q:a 9 "${outputPath}"`, { stdio: "pipe" });
    }
  }

  const sceneAudio = [
    { key: "intro", script: manifest.introScript, durationKey: "introAudioDurationMs", pathKey: "introAudioPath", file: "scene-intro.mp3" },
    { key: "pulse", script: manifest.pulseScript, durationKey: "pulseAudioDurationMs", pathKey: "pulseAudioPath", file: "scene-pulse.mp3" },
    { key: "moversHeader", script: manifest.moversHeaderScript, durationKey: "moversHeaderAudioDurationMs", pathKey: "moversHeaderAudioPath", file: "scene-movers-header.mp3" },
    { key: "rocketsHeader", script: manifest.rocketsHeaderScript, durationKey: "rocketsHeaderAudioDurationMs", pathKey: "rocketsHeaderAudioPath", file: "scene-rockets-header.mp3" },
    { key: "outro", script: manifest.outroScript, durationKey: "outroAudioDurationMs", pathKey: "outroAudioPath", file: "scene-outro.mp3" },
  ];

  for (const scene of sceneAudio) {
    if (scene.script) {
      const outputPath = path.join(audioDir, scene.file);
      await generateQwenTTS(scene.script, outputPath);
      manifest[scene.pathKey] = `audio/${scene.file}`;
      manifest[scene.durationKey] = await readAudioDurationMs(outputPath);
    }
  }

  const allSkills = [...manifest.movers, ...manifest.rockets];
  for (const skill of allSkills) {
    if (skill.script) {
      const fileName = `${skill.slug.replace(/[^a-z0-9-]/g, "-")}.mp3`;
      const outputPath = path.join(audioDir, fileName);
      await generateQwenTTS(skill.script, outputPath);
      skill.audioPath = `audio/${fileName}`;
      skill.audioDurationMs = await readAudioDurationMs(outputPath);
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log("Done generating real audio!");
}

main().catch(console.error);
