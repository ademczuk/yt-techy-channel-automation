import fs from "node:fs";
import path from "node:path";
import { buildDailyToolScript } from "./daily-copy";

export interface HarnessScriptSop {
  styleKey: "github-awesome-close-mimic";
  episodeMode: "demo-3-repo" | "standard-10-15-repo";
  mimicRatio: number;
  houseStyleDelta: string;
  voiceDirection: string;
}

export interface HarnessScriptRepoInput {
  slug: string;
  name: string;
  url: string;
  summary: string;
  recommendedAngle?: string;
  visualProof?: string[];
}

export interface HarnessScriptRepo {
  slug: string;
  name: string;
  url: string;
  summary: string;
  narration: string;
  recommendedAngle?: string;
  visualProof?: string[];
}

export interface HarnessScriptPacket {
  generatedAt: string;
  sop: HarnessScriptSop;
  episodeTitle: string;
  intro: {
    narration: string;
  };
  repos: HarnessScriptRepo[];
}

export interface HarnessScriptPromptPacket {
  mode: "bounded-agent-script";
  generatedAt: string;
  sop: {
    styleKey: HarnessScriptSop["styleKey"];
    defaultEpisodeMode: HarnessScriptSop["episodeMode"];
    mimicRatio: number;
    houseStyleDelta: string;
    voiceDirection: string;
    framingRules: string[];
  };
  constraints: {
    titlePrefix: string;
    tone: string;
    repoCount: number;
    introMaxSeconds: number;
    repoMaxSeconds: number;
    outputContract: string;
  };
  repos: HarnessScriptRepoInput[];
}

export interface HarnessScriptStageResult {
  packet: HarnessScriptPacket;
  packetPath: string;
  promptPath: string;
  scriptPath: string;
}

export async function runHarnessScriptStage(input: {
  runDir: string;
  titlePrefix?: string;
  generateScriptPacket?: (promptPacket: HarnessScriptPromptPacket) => Promise<HarnessScriptPacket>;
}): Promise<HarnessScriptStageResult> {
  const shortlistPath = path.join(input.runDir, "research-shortlist.json");
  if (!fs.existsSync(shortlistPath)) {
    throw new Error(`Research shortlist not found: ${shortlistPath}`);
  }

  const shortlist = JSON.parse(fs.readFileSync(shortlistPath, "utf8")) as HarnessScriptRepoInput[];
  const promptPacket = buildScriptPromptPacket({
    titlePrefix: input.titlePrefix ?? "Code Search",
    repos: shortlist,
  });

  const generator = input.generateScriptPacket ?? defaultGenerateScriptPacket;
  const packet = normalizeScriptPacketDurations(await generator(promptPacket), promptPacket);
  validateNarrationOnlyPacket(packet);

  const promptPath = path.join(input.runDir, "script-prompt.json");
  const packetPath = path.join(input.runDir, "script-packet.json");
  const scriptPath = path.join(input.runDir, "script.md");
  fs.writeFileSync(promptPath, `${JSON.stringify(promptPacket, null, 2)}\n`, "utf8");
  fs.writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  fs.writeFileSync(scriptPath, `${buildScriptMarkdown(packet)}\n`, "utf8");

  return {
    packet,
    packetPath,
    promptPath,
    scriptPath,
  };
}

export function buildScriptPromptPacket(input: {
  titlePrefix: string;
  repos: HarnessScriptRepoInput[];
}): HarnessScriptPromptPacket {
  return {
    mode: "bounded-agent-script",
    generatedAt: new Date().toISOString(),
    sop: {
      styleKey: "github-awesome-close-mimic",
      defaultEpisodeMode: input.repos.length <= 3 ? "demo-3-repo" : "standard-10-15-repo",
      mimicRatio: 0.92,
      houseStyleDelta:
        "Occasional light flirty jokes, small pattern-interrupts, and practical builder-world value add in small doses.",
      voiceDirection: "Slightly sultry, clear, practical, and creator-friendly.",
      framingRules: [
        "Stay close to Github Awesome pacing and wording style.",
        "Narration only. Do not write recording directions.",
        "Each repo section should explain the problem, what it is, why it matters, and who should care.",
        "Keep the original house-style touches light and occasional, not constant.",
      ],
    },
    constraints: {
      titlePrefix: input.titlePrefix,
      tone: "close-mimic creator narration, concrete, conversational, non-robotic",
      repoCount: input.repos.length,
      introMaxSeconds: input.repos.length <= 3 ? 10 : 15,
      repoMaxSeconds: input.repos.length <= 3 ? 30 : 50,
      outputContract: "Return JSON with sop, episodeTitle, intro.narration, and one narration field per repo.",
    },
    repos: input.repos,
  };
}

async function defaultGenerateScriptPacket(
  promptPacket: HarnessScriptPromptPacket,
): Promise<HarnessScriptPacket> {
  const config = loadScriptAgentConfig();
  if (!config) {
    return buildDeterministicScriptPacket(promptPacket);
  }

  try {
    return await generateWithOpenAI(promptPacket, config);
  } catch {
    return buildDeterministicScriptPacket(promptPacket);
  }
}

function buildDeterministicScriptPacket(
  promptPacket: HarnessScriptPromptPacket,
): HarnessScriptPacket {
  return {
    generatedAt: new Date().toISOString(),
    sop: {
      styleKey: promptPacket.sop.styleKey,
      episodeMode: promptPacket.sop.defaultEpisodeMode,
      mimicRatio: promptPacket.sop.mimicRatio,
      houseStyleDelta: promptPacket.sop.houseStyleDelta,
      voiceDirection: promptPacket.sop.voiceDirection,
    },
    episodeTitle: `${promptPacket.constraints.titlePrefix} GitHub Project Rundown`,
    intro: {
      narration: buildIntroNarration(promptPacket.repos.length),
    },
    repos: promptPacket.repos.map((repo, index) => ({
      slug: repo.slug,
      name: repo.name,
      url: repo.url,
      summary: repo.summary,
      recommendedAngle: repo.recommendedAngle,
      visualProof: repo.visualProof,
      narration: buildRepoNarration(repo, index + 1),
    })),
  };
}

async function generateWithOpenAI(
  promptPacket: HarnessScriptPromptPacket,
  config: {
    apiKey: string;
    baseUrl: string;
    model: string;
  },
): Promise<HarnessScriptPacket> {
  const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "You are the bounded script-writing step in a deterministic video harness.",
                "Stay inside the provided repo set.",
                "Write concise narration for a Github Awesome close-mimic GitHub walkthrough.",
                "Do not add extra repos or change URLs.",
                "Do not include screen directions, recording instructions, or editor notes.",
                "Return only JSON matching the requested schema.",
              ].join(" "),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(promptPacket, null, 2),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "harness_script_packet",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["sop", "episodeTitle", "intro", "repos"],
            properties: {
              sop: {
                type: "object",
                additionalProperties: false,
                required: ["styleKey", "episodeMode", "mimicRatio", "houseStyleDelta", "voiceDirection"],
                properties: {
                  styleKey: { type: "string" },
                  episodeMode: { type: "string" },
                  mimicRatio: { type: "number" },
                  houseStyleDelta: { type: "string" },
                  voiceDirection: { type: "string" },
                },
              },
              episodeTitle: { type: "string" },
              intro: {
                type: "object",
                additionalProperties: false,
                required: ["narration"],
                properties: {
                  narration: { type: "string" },
                },
              },
              repos: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["slug", "name", "url", "summary", "narration", "recommendedAngle", "visualProof"],
                  properties: {
                    slug: { type: "string" },
                    name: { type: "string" },
                    url: { type: "string" },
                    summary: { type: "string" },
                    narration: { type: "string" },
                    recommendedAngle: {
                      anyOf: [
                        { type: "string" },
                        { type: "null" },
                      ],
                    },
                    visualProof: {
                      anyOf: [
                        {
                          type: "array",
                          items: { type: "string" },
                        },
                        { type: "null" },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI script request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const rawText = extractOutputText(payload);
  if (!rawText) {
    throw new Error("OpenAI script request returned no text output.");
  }

  const parsed = JSON.parse(rawText) as Omit<HarnessScriptPacket, "generatedAt">;
  validateNarrationOnlyPacket(parsed);
  return {
    generatedAt: new Date().toISOString(),
    sop: parsed.sop,
    episodeTitle: parsed.episodeTitle,
    intro: parsed.intro,
    repos: parsed.repos,
  };
}

function extractOutputText(payload: Record<string, unknown>): string | null {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        return text.trim();
      }
    }
  }

  return null;
}

function buildScriptMarkdown(packet: HarnessScriptPacket): string {
  const lines = [
    `# ${packet.episodeTitle}`,
    "",
    "## SOP",
    "",
    `- Style: ${packet.sop.styleKey}`,
    `- Mode: ${packet.sop.episodeMode}`,
    `- Voice direction: ${packet.sop.voiceDirection}`,
    "",
    "## Intro",
    "",
    packet.intro.narration,
    "",
  ];

  for (const repo of packet.repos) {
    lines.push(`## ${repo.name}`, "", repo.narration, "");
  }

  return lines.join("\n");
}

function buildIntroNarration(repoCount: number): string {
  const repoPhrase = repoCount <= 3
    ? `${repoCount} GitHub projects`
    : "the GitHub projects worth watching";
  return `Welcome back to Code Search. I pulled together ${repoPhrase} that deserve a closer look today, so let's get straight into it.`;
}

function buildRepoNarration(repo: HarnessScriptRepoInput, index: number): string {
  const baseScript = buildDailyToolScript(
    {
      slug: repo.slug,
      name: repo.name,
      url: repo.url,
      source: "harness-research",
      description: repo.summary,
      readmeSummary: repo.summary,
      collectedAt: new Date().toISOString(),
    },
    index,
  );
  const lead = `${repo.name} is the kind of project that starts looking good fast when a workflow feels too messy or too slow.`;
  const whyCare = repo.recommendedAngle
    ? `The real payoff here is ${repo.recommendedAngle.toLowerCase().replace(/\.$/, "")}.`
    : "The real payoff here is practical developer leverage, not just novelty.";
  return [lead, baseScript, whyCare].join(" ");
}

export function estimateSpeechDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerSecond = 2.6;
  return Math.round((words / wordsPerSecond) * 1000);
}

export function trimNarrationToDuration(text: string, maxDurationMs: number): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return normalized;
  }

  if (estimateSpeechDurationMs(normalized) <= maxDurationMs) {
    return normalized;
  }

  const sentences = normalized.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [normalized];
  let candidate = "";

  for (const sentence of sentences) {
    const nextCandidate = candidate ? `${candidate} ${sentence}` : sentence;
    if (estimateSpeechDurationMs(nextCandidate) > maxDurationMs && candidate) {
      break;
    }
    candidate = nextCandidate;
    if (estimateSpeechDurationMs(candidate) >= maxDurationMs) {
      break;
    }
  }

  if (candidate && estimateSpeechDurationMs(candidate) <= maxDurationMs) {
    return candidate;
  }

  const maxWords = Math.max(8, Math.floor((maxDurationMs / 1000) * 2.6));
  return `${normalized.split(/\s+/).slice(0, maxWords).join(" ").replace(/[,:;]+$/, "").trim()}.`;
}

function normalizeScriptPacketDurations(
  packet: HarnessScriptPacket,
  promptPacket: HarnessScriptPromptPacket,
): HarnessScriptPacket {
  return {
    ...packet,
    intro: {
      narration: trimNarrationToDuration(packet.intro.narration, promptPacket.constraints.introMaxSeconds * 1000),
    },
    repos: packet.repos.map((repo) => ({
      ...repo,
      narration: trimNarrationToDuration(repo.narration, promptPacket.constraints.repoMaxSeconds * 1000),
    })),
  };
}

function validateNarrationOnlyPacket(packet: Omit<HarnessScriptPacket, "generatedAt"> | HarnessScriptPacket): void {
  const snippets = [packet.intro.narration, ...packet.repos.map((repo) => repo.narration)];
  const forbiddenPatterns = [
    /\bclick (on|the)\b/i,
    /\bscroll (down|up|to)\b/i,
    /\bhover (over|on)\b/i,
    /\bmove the mouse\b/i,
    /\bon screen\b/i,
  ];

  for (const snippet of snippets) {
    if (forbiddenPatterns.some((pattern) => pattern.test(snippet))) {
      throw new Error("Generated script packet included recording instructions instead of narration-only copy.");
    }
  }
}

export function loadScriptAgentConfig():
  | {
    apiKey: string;
    baseUrl: string;
    model: string;
  }
  | null {
  const configPath = path.join(process.cwd(), "runtime", "script-agent-config.json");
  const fileConfig = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf8")) as Partial<{
      apiKey: string;
      baseUrl: string;
      model: string;
    }>
    : {};

  const envConfig = resolveOpenAiEnvConfig();
  const midsceneConfig = loadMidsceneOpenAiLikeConfig(path.join(process.cwd(), "runtime", "midscene.env"));
  const apiKey = fileConfig.apiKey ?? envConfig.apiKey ?? midsceneConfig?.apiKey;
  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: fileConfig.baseUrl ?? envConfig.baseUrl ?? midsceneConfig?.baseUrl ?? "https://api.openai.com/v1",
    model: fileConfig.model ?? envConfig.model ?? midsceneConfig?.model ?? "gpt-5.2",
  };
}

function resolveOpenAiEnvConfig(): {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
} {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL,
  };
}

function loadMidsceneOpenAiLikeConfig(envPath: string):
  | {
    apiKey: string;
    baseUrl: string;
    model: string;
  }
  | null {
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const entries = parseSimpleEnvFile(fs.readFileSync(envPath, "utf8"));
  const candidates = [
    "MIDSCENE_PLANNING_MODEL",
    "MIDSCENE_INSIGHT_MODEL",
    "MIDSCENE_MODEL",
  ];

  for (const prefix of candidates) {
    const apiKey = entries[`${prefix}_API_KEY`];
    const baseUrl = entries[`${prefix}_BASE_URL`];
    const model = entries[`${prefix}_NAME`];
    if (!apiKey || !baseUrl || !model) {
      continue;
    }
    if (!looksOpenAiCompatibleBaseUrl(baseUrl) || !looksScriptCapableModel(model)) {
      continue;
    }

    return {
      apiKey,
      baseUrl,
      model,
    };
  }

  return null;
}

function parseSimpleEnvFile(contents: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    output[key] = value;
  }
  return output;
}

function looksOpenAiCompatibleBaseUrl(baseUrl: string): boolean {
  return /openai|api\.openai\.com/i.test(baseUrl);
}

function looksScriptCapableModel(model: string): boolean {
  return /\bgpt\b|\bo[134]\b|gpt-5|gpt-4/i.test(model);
}
