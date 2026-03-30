import fs from "node:fs";
import path from "node:path";
import { readAudioDurationMs } from "./audio-metadata";
import { loadScriptAgentConfig } from "./harness-script";

export interface AudioManifestSegment {
  id: string;
  label: string;
  path: string;
  durationMs: number;
  segmentType: "intro" | "repo";
  repoSlug?: string;
}

export interface HarnessAudioManifest {
  provider: string;
  generatedAt: string;
  totalDurationMs: number;
  voice: {
    provider: string;
    voiceId: string;
    voiceLabel: string;
  };
  segments: AudioManifestSegment[];
}

export interface HarnessAudioStageResult {
  manifest: HarnessAudioManifest;
  manifestPath: string;
}

interface VoiceConfig {
  provider: string;
  apiKey?: string;
  voiceId?: string;
  voiceLabel?: string;
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  openAiVoice?: string;
  openAiTtsModel?: string;
}

type SynthesizeAudioFn = (input: {
  text: string;
  outputPath: string;
  label: string;
}) => Promise<number | undefined>;

export async function runHarnessAudioStage(input: {
  runDir: string;
  synthesizeAudio?: SynthesizeAudioFn;
}): Promise<HarnessAudioStageResult> {
  const packetPath = path.join(input.runDir, "script-packet.json");
  if (!fs.existsSync(packetPath)) {
    throw new Error(`Script packet not found: ${packetPath}`);
  }

  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8")) as {
    intro?: { narration?: string };
    introScript?: string;
    repos: Array<{ slug: string; name: string; narration?: string; script?: string }>;
  };

  const audioDir = path.join(input.runDir, "audio");
  fs.mkdirSync(audioDir, { recursive: true });
  const { synthesizeAudio, provider, voiceId, voiceLabel } = input.synthesizeAudio
    ? { synthesizeAudio: input.synthesizeAudio, provider: "custom", voiceId: "custom", voiceLabel: "Custom test voice" }
    : createDefaultAudioSynthesizer();
  const segments: AudioManifestSegment[] = [];

  const introNarration = packet.intro?.narration ?? packet.introScript;
  if (introNarration) {
    const introPath = path.join(audioDir, "intro.mp3");
    const durationMs = await ensureSegment({
      synthesizeAudio,
      text: introNarration,
      outputPath: introPath,
      label: "Intro",
    });
    segments.push({
      id: "intro",
      label: "Intro",
      path: introPath,
      durationMs,
      segmentType: "intro",
    });
  }

  for (const repo of packet.repos) {
    const outputPath = path.join(audioDir, `${sanitizeFileName(repo.slug)}.mp3`);
    const durationMs = await ensureSegment({
      synthesizeAudio,
      text: repo.narration ?? repo.script ?? repo.name,
      outputPath,
      label: repo.name,
    });
    segments.push({
      id: `repo-${sanitizeFileName(repo.slug)}`,
      label: repo.name,
      path: outputPath,
      durationMs,
      segmentType: "repo",
      repoSlug: repo.slug,
    });
  }

  const manifest: HarnessAudioManifest = {
    provider,
    generatedAt: new Date().toISOString(),
    totalDurationMs: segments.reduce((total, segment) => total + segment.durationMs, 0),
    voice: {
      provider,
      voiceId,
      voiceLabel,
    },
    segments,
  };

  const manifestPath = path.join(input.runDir, "audio-manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    manifest,
    manifestPath,
  };
}

async function ensureSegment(input: {
  synthesizeAudio: SynthesizeAudioFn;
  text: string;
  outputPath: string;
  label: string;
}): Promise<number> {
  const maybeDuration = await input.synthesizeAudio({
    text: input.text,
    outputPath: input.outputPath,
    label: input.label,
  });
  if (typeof maybeDuration === "number") {
    return maybeDuration;
  }
  return readAudioDurationMs(input.outputPath);
}

async function synthesizeWithElevenLabs(input: {
  text: string;
  outputPath: string;
}): Promise<void> {
  const config = loadVoiceConfig();

  if (!config.apiKey || !config.voiceId || config.voiceId === "replace-me") {
    throw new Error("Voice config is incomplete. Add runtime/voice-config.json with ElevenLabs credentials.");
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": config.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: input.text,
      model_id: config.modelId ?? "eleven_multilingual_v2",
      output_format: config.outputFormat ?? "mp3_44100_128",
      voice_settings: {
        stability: config.stability ?? 0.45,
        similarity_boost: config.similarityBoost ?? 0.8,
        style: config.style ?? 0.2,
        use_speaker_boost: config.useSpeakerBoost ?? true,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs request failed: ${response.status} ${body}`);
  }

  fs.writeFileSync(input.outputPath, Buffer.from(await response.arrayBuffer()));
}

async function synthesizeWithOpenAiSpeech(input: {
  text: string;
  outputPath: string;
}): Promise<void> {
  const config = loadOpenAiAudioConfig();
  if (!config) {
    throw new Error("OpenAI audio config is incomplete.");
  }

  const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      voice: config.voice,
      input: input.text,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI speech request failed: ${response.status} ${body}`);
  }

  fs.writeFileSync(input.outputPath, Buffer.from(await response.arrayBuffer()));
}

function createDefaultAudioSynthesizer(): {
  provider: string;
  voiceId: string;
  voiceLabel: string;
  synthesizeAudio: SynthesizeAudioFn;
} {
  const voiceConfig = loadVoiceConfig();
  if (voiceConfig.provider === "openai") {
    const voiceId = voiceConfig.openAiVoice ?? "alloy";
    return {
      provider: "openai",
      voiceId,
      voiceLabel: voiceConfig.voiceLabel ?? voiceId,
      synthesizeAudio: async ({ text, outputPath }) => {
        await synthesizeWithOpenAiSpeech({ text, outputPath });
        return undefined;
      },
    };
  }

  return {
    provider: "elevenlabs",
    voiceId: voiceConfig.voiceId ?? "replace-me",
    voiceLabel: voiceConfig.voiceLabel ?? voiceConfig.voiceId ?? "replace-me",
    synthesizeAudio: async ({ text, outputPath }) => {
      await synthesizeWithElevenLabs({ text, outputPath });
      return undefined;
    },
  };
}

export function createFallbackSynthesizeAudio(input: {
  primary: SynthesizeAudioFn;
  fallback?: SynthesizeAudioFn;
}): SynthesizeAudioFn {
  return async (args) => {
    try {
      return await input.primary(args);
    } catch (error) {
      if (!input.fallback || !isElevenLabsQuotaExceededError(error)) {
        throw error;
      }
      return input.fallback(args);
    }
  };
}

export function isElevenLabsQuotaExceededError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ElevenLabs request failed/i.test(message) && /quota_exceeded/i.test(message);
}

function loadVoiceConfig(): VoiceConfig {
  const configPath = path.join(process.cwd(), "runtime", "voice-config.json");
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as VoiceConfig;
  }

  return {
    provider: "elevenlabs",
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: "replace-me",
    voiceLabel: process.env.ELEVENLABS_VOICE_LABEL,
    modelId: "eleven_multilingual_v2",
    outputFormat: "mp3_44100_128",
    stability: 0.45,
    similarityBoost: 0.8,
    style: 0.2,
    useSpeakerBoost: true,
    openAiVoice: process.env.OPENAI_TTS_VOICE,
    openAiTtsModel: process.env.OPENAI_TTS_MODEL,
  };
}

function loadOpenAiAudioConfig():
  | {
    apiKey: string;
    baseUrl: string;
    model: string;
    voice: string;
  }
  | null {
  const voiceConfig = loadVoiceConfig();
  const scriptConfig = loadScriptAgentConfig();
  const apiKey = process.env.OPENAI_API_KEY ?? scriptConfig?.apiKey;
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL ?? scriptConfig?.baseUrl ?? "https://api.openai.com/v1",
    model: process.env.OPENAI_TTS_MODEL ?? voiceConfig.openAiTtsModel ?? "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TTS_VOICE ?? voiceConfig.openAiVoice ?? "alloy",
  };
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:"*?<>|]+/g, "-").replace(/\s+/g, "-");
}
