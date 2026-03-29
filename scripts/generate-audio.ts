import fs from "fs";
import path from "path";
import { readAudioDurationMs } from "../src/lib/audio-metadata";
import type { SkillsWeeklyProps } from "../src/lib/episode-types";
import { getEpisodeDir, getLocalDateStamp } from "../src/lib/episode-paths";

interface VoiceConfig {
  provider: "elevenlabs";
  apiKey?: string;
  voiceId: string;
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  provider: "elevenlabs",
  voiceId: "replace-me",
  modelId: "eleven_multilingual_v2",
  outputFormat: "mp3_44100_128",
  stability: 0.45,
  similarityBoost: 0.8,
  style: 0.2,
  useSpeakerBoost: true,
};

async function main() {
  const opts = parseArgs();
  const date = getLocalDateStamp();
  const rootDir = process.cwd();
  const manifestPath = opts.manifest
    ? path.resolve(rootDir, opts.manifest)
    : path.join(getEpisodeDir(rootDir, date), "manifest.json");
  const episodeDir = path.dirname(manifestPath);
  const audioDir = path.join(episodeDir, "audio");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest file: ${manifestPath}`);
  }

  fs.mkdirSync(audioDir, { recursive: true });

  const config = loadVoiceConfig(rootDir);
  if (!config.apiKey || config.voiceId === "replace-me") {
    throw new Error(
      "Voice config is incomplete. Add runtime/voice-config.json with ElevenLabs apiKey and voiceId.",
    );
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as SkillsWeeklyProps;

  if (manifest.introScript) {
    const introPath = path.join(audioDir, "scene-intro.mp3");
    await ensureAudioForText(manifest.introScript, introPath, config, opts.overwrite);
    manifest.introAudioPath = toRuntimeAssetPath(introPath);
    manifest.introAudioDurationMs = await readAudioDurationMs(introPath);
  }

  if (manifest.outroScript) {
    const outroPath = path.join(audioDir, "scene-outro.mp3");
    await ensureAudioForText(manifest.outroScript, outroPath, config, opts.overwrite);
    manifest.outroAudioPath = toRuntimeAssetPath(outroPath);
    manifest.outroAudioDurationMs = await readAudioDurationMs(outroPath);
  }

  if (manifest.moversHeaderScript) {
    const moversHeaderPath = path.join(audioDir, "scene-movers-header.mp3");
    await ensureAudioForText(
      manifest.moversHeaderScript,
      moversHeaderPath,
      config,
      opts.overwrite,
    );
    manifest.moversHeaderAudioPath = toRuntimeAssetPath(moversHeaderPath);
    manifest.moversHeaderAudioDurationMs = await readAudioDurationMs(moversHeaderPath);
  }

  if (manifest.rocketsHeaderScript) {
    const rocketsHeaderPath = path.join(audioDir, "scene-rockets-header.mp3");
    await ensureAudioForText(
      manifest.rocketsHeaderScript,
      rocketsHeaderPath,
      config,
      opts.overwrite,
    );
    manifest.rocketsHeaderAudioPath = toRuntimeAssetPath(rocketsHeaderPath);
    manifest.rocketsHeaderAudioDurationMs = await readAudioDurationMs(rocketsHeaderPath);
  }

  if (manifest.pulseScript) {
    const pulsePath = path.join(audioDir, "scene-pulse.mp3");
    await ensureAudioForText(manifest.pulseScript, pulsePath, config, opts.overwrite);
    manifest.pulseAudioPath = toRuntimeAssetPath(pulsePath);
    manifest.pulseAudioDurationMs = await readAudioDurationMs(pulsePath);
  }

  const tools = manifest.movers.slice(
    Math.max(0, (opts.startAt ?? 1) - 1),
    Math.max(0, (opts.startAt ?? 1) - 1) + (opts.limit ?? manifest.movers.length),
  );

  for (const tool of tools) {
    const audioPath = path.join(audioDir, `${sanitizeFileName(tool.slug)}.mp3`);
    await ensureAudioForText(tool.script, audioPath, config, opts.overwrite);
    tool.audioPath = toRuntimeAssetPath(audioPath);
    tool.audioDurationMs = await readAudioDurationMs(audioPath);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Generated audio for ${tools.length} tools`);
  console.log(`Updated manifest: ${manifestPath}`);
}

async function ensureAudioForText(
  text: string,
  outputPath: string,
  config: VoiceConfig,
  overwrite = false,
) {
  if (fs.existsSync(outputPath) && !overwrite) {
    return;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": config.apiKey!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: config.modelId,
        output_format: config.outputFormat,
        voice_settings: {
          stability: config.stability,
          similarity_boost: config.similarityBoost,
          style: config.style,
          use_speaker_boost: config.useSpeakerBoost,
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs request failed: ${response.status} ${body}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, audioBuffer);
}

function loadVoiceConfig(rootDir: string): VoiceConfig {
  const configPath = path.join(rootDir, "runtime", "voice-config.json");
  if (!fs.existsSync(configPath)) {
    return {
      ...DEFAULT_VOICE_CONFIG,
      apiKey: process.env.ELEVENLABS_API_KEY,
    };
  }

  return {
    ...DEFAULT_VOICE_CONFIG,
    ...JSON.parse(fs.readFileSync(configPath, "utf8")),
    apiKey:
      JSON.parse(fs.readFileSync(configPath, "utf8")).apiKey ??
      process.env.ELEVENLABS_API_KEY,
  } as VoiceConfig;
}

function parseArgs(): {
  limit?: number;
  startAt?: number;
  overwrite?: boolean;
  manifest?: string;
} {
  const args = process.argv.slice(2);
  const result: {
    limit?: number;
    startAt?: number;
    overwrite?: boolean;
    manifest?: string;
  } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      result.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--start-at" && args[i + 1]) {
      result.startAt = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--manifest" && args[i + 1]) {
      result.manifest = args[i + 1];
      i++;
    } else if (args[i] === "--overwrite") {
      result.overwrite = true;
    }
  }

  return result;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:"*?<>|]+/g, "-").replace(/\s+/g, "-");
}

function toRuntimeAssetPath(absolutePath: string): string {
  return absolutePath.replace(/\\/g, "/").split("/runtime/")[1]
    ? `runtime/${absolutePath.replace(/\\/g, "/").split("/runtime/")[1]}`
    : absolutePath.replace(/\\/g, "/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
