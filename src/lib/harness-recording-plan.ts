import fs from "node:fs";
import path from "node:path";

export type RecordingBeatAction =
  | "focus-heading"
  | "hover-text-region"
  | "click-link"
  | "follow-reading-lane"
  | "smooth-scroll"
  | "passive-scroll"
  | "circle-region"
  | "idle-hold";

export interface RecordingBeatPlan {
  id: string;
  label: string;
  action: RecordingBeatAction;
  durationMs: number;
  allowedZone: "page" | "tab-strip";
  selectorCandidates?: string[];
  targetKind?: "header" | "description" | "readme" | "link";
  textAnchor?: string;
  deltaY?: number;
}

export interface RecordingTabPlan {
  repoUrl: string;
  slug: string;
  titleFragment: string;
  tabIndex: number;
}

export interface RecordingRepoPlan {
  repoUrl: string;
  slug: string;
  name: string;
  tabIndex: number;
  narration: string;
  segmentDurationMs: number;
  visualProof: string[];
  beats: RecordingBeatPlan[];
}

export interface HarnessRecordingPlan {
  generatedAt: string;
  repoUrls: string[];
  capturePrompt: string;
  viewport: { width: number; height: number };
  audioDurationMs: number;
  introLeadInMs: number;
  tabs: RecordingTabPlan[];
  repos: RecordingRepoPlan[];
}

export interface HarnessRecordingPlanStageResult {
  plan: HarnessRecordingPlan;
  planPath: string;
}

export async function runHarnessRecordingPlanStage(input: {
  runDir: string;
}): Promise<HarnessRecordingPlanStageResult> {
  const packetPath = path.join(input.runDir, "script-packet.json");
  const audioManifestPath = path.join(input.runDir, "audio-manifest.json");
  if (!fs.existsSync(packetPath)) {
    throw new Error(`Script packet not found: ${packetPath}`);
  }
  if (!fs.existsSync(audioManifestPath)) {
    throw new Error(`Audio manifest not found: ${audioManifestPath}`);
  }

  const packet = JSON.parse(fs.readFileSync(packetPath, "utf8")) as {
    repos: Array<{
      slug: string;
      name: string;
      url: string;
      narration?: string;
      script?: string;
      visualProof?: string[];
    }>;
  };
  const audioManifest = JSON.parse(fs.readFileSync(audioManifestPath, "utf8")) as {
    totalDurationMs: number;
    segments: Array<{
      id: string;
      durationMs: number;
      segmentType?: "intro" | "repo";
      repoSlug?: string;
    }>;
  };

  const repoUrls = packet.repos.map((repo) => repo.url);
  const introSegment = audioManifest.segments.find((segment) => segment.segmentType === "intro" || segment.id === "intro");
  const tabs = packet.repos.map((repo, index) => ({
    repoUrl: repo.url,
    slug: repo.slug,
    titleFragment: titleFragmentFromRepoUrl(repo.url),
    tabIndex: index,
  }));
  const repos = packet.repos.map((repo, index) => {
    const matchingSegment = audioManifest.segments.find((segment) =>
      (segment.segmentType === "repo" || segment.id.startsWith("repo-")) && segment.repoSlug === repo.slug,
    );
    const segmentDurationMs = matchingSegment?.durationMs ?? 5500;
    return {
      repoUrl: repo.url,
      slug: repo.slug,
      name: repo.name,
      tabIndex: index,
      narration: repo.narration ?? repo.script ?? repo.name,
      segmentDurationMs,
      visualProof: repo.visualProof ?? [],
      beats: buildRepoBeatPlan({
        slug: repo.slug,
        visualProof: repo.visualProof ?? [],
        segmentDurationMs,
      }),
    };
  });

  const plan: HarnessRecordingPlan = {
    generatedAt: new Date().toISOString(),
    repoUrls,
    capturePrompt: `Create a polished product demo for ${repoUrls.join(" and ")} with real mouse movement, real clicks, smooth scrolling, and trimmed dead time.`,
    viewport: { width: 1920, height: 1080 },
    audioDurationMs: audioManifest.totalDurationMs,
    introLeadInMs: (introSegment?.durationMs ?? 0) + 600,
    tabs,
    repos,
  };

  const planPath = path.join(input.runDir, "recording-plan.json");
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  return {
    plan,
    planPath,
  };
}

function buildRepoBeatPlan(input: {
  slug: string;
  visualProof: string[];
  segmentDurationMs: number;
}): RecordingBeatPlan[] {
  const primaryTextAnchor = input.visualProof[0] ?? "README overview";
  const secondaryTextAnchor = input.visualProof[1] ?? "feature details";
  const baseBeats: RecordingBeatPlan[] = [
    {
      id: `${input.slug}-focus-overview`,
      label: "Orient on the repo header",
      action: "hover-text-region",
      durationMs: 1200,
      allowedZone: "page",
      selectorCandidates: [
        "[itemprop='name'] a",
        "main h1",
        "a[href='#readme-ov-file']",
      ],
      targetKind: "header",
      textAnchor: primaryTextAnchor,
    },
    {
      id: `${input.slug}-overview-proof`,
      label: "Hover over the visible repo overview",
      action: "hover-text-region",
      durationMs: 1400,
      allowedZone: "page",
      selectorCandidates: [
        "div.BorderGrid-cell p",
        "a[href='#readme-ov-file']",
        "main h2",
      ],
      targetKind: "description",
      textAnchor: primaryTextAnchor,
    },
    {
      id: `${input.slug}-smooth-scroll`,
      label: "Smooth scroll into the README",
      action: "smooth-scroll",
      durationMs: 1700,
      allowedZone: "page",
      selectorCandidates: [
        "main",
        "article.markdown-body",
      ],
      targetKind: "readme",
      deltaY: 1040,
    },
    {
      id: `${input.slug}-focus-heading`,
      label: "Focus README heading",
      action: "focus-heading",
      durationMs: 1200,
      allowedZone: "page",
      selectorCandidates: [
        "article.markdown-body h1",
        "article.markdown-body h2",
      ],
      targetKind: "header",
      textAnchor: primaryTextAnchor,
    },
    {
      id: `${input.slug}-reading-lane`,
      label: "Follow the key README text",
      action: "follow-reading-lane",
      durationMs: 1400,
      allowedZone: "page",
      selectorCandidates: [
        "article.markdown-body p",
      ],
      targetKind: "description",
      textAnchor: secondaryTextAnchor,
    },
    {
      id: `${input.slug}-circle-region`,
      label: "Circle the important section",
      action: "circle-region",
      durationMs: 1300,
      allowedZone: "page",
      selectorCandidates: [
        "#readme h2",
        "article.markdown-body h2",
        "article.markdown-body h3",
      ],
      targetKind: "readme",
      textAnchor: secondaryTextAnchor,
    },
    {
      id: `${input.slug}-passive-scroll`,
      label: "Passive smooth scroll to keep motion alive",
      action: "passive-scroll",
      durationMs: 1100,
      allowedZone: "page",
      selectorCandidates: [
        "#readme article",
        "article.markdown-body",
      ],
      targetKind: "readme",
      deltaY: 240,
    },
    {
      id: `${input.slug}-click-link`,
      label: "Open a supporting README link",
      action: "click-link",
      durationMs: 1100,
      allowedZone: "page",
      selectorCandidates: [
        "#readme article a[href]:not([href^='#'])",
        "article.markdown-body a[href]:not([href^='#'])",
      ],
      targetKind: "link",
      textAnchor: secondaryTextAnchor,
    },
  ];

  const filteredBeats = input.segmentDurationMs < 4200
    ? baseBeats.filter((beat) => beat.action !== "circle-region" && beat.action !== "passive-scroll")
    : baseBeats;
  const totalBaseDuration = filteredBeats.reduce((total, beat) => total + beat.durationMs, 0);
  const scaledDurationTarget = Math.max(input.segmentDurationMs, totalBaseDuration);
  const scale = scaledDurationTarget / totalBaseDuration;

  return filteredBeats.map((beat) => ({
    ...beat,
    durationMs: Math.max(700, Math.round(beat.durationMs * scale)),
  }));
}

function titleFragmentFromRepoUrl(repoUrl: string): string {
  const url = new URL(repoUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? repoUrl;
}
