import fs from "node:fs";
import path from "node:path";
import type { RankedCandidate } from "./ranker";

export interface ResearchShortlistEntry {
  slug: string;
  name: string;
  url: string;
  score: number;
  fitBucket: RankedCandidate["fitBucket"];
  summary: string;
  reasons: string[];
  recommendedAngle: string;
  visualProof: string[];
}

export interface GitHubResearchStageResult {
  selected: ResearchShortlistEntry[];
  shortlistPath: string;
  briefPath: string;
}

export async function runGitHubResearchStage(input: {
  runDir: string;
  selectionCount?: number;
}): Promise<GitHubResearchStageResult> {
  const discoveryPath = path.join(input.runDir, "discovery-candidates.json");
  if (!fs.existsSync(discoveryPath)) {
    throw new Error(`Discovery output not found: ${discoveryPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(discoveryPath, "utf8")) as RankedCandidate[];
  const selectionCount = Math.max(1, input.selectionCount ?? 3);
  const selected = raw.slice(0, selectionCount).map(toResearchEntry);

  const shortlistPath = path.join(input.runDir, "research-shortlist.json");
  const briefPath = path.join(input.runDir, "research-brief.md");
  fs.writeFileSync(shortlistPath, `${JSON.stringify(selected, null, 2)}\n`, "utf8");
  fs.writeFileSync(briefPath, `${buildResearchBrief(selected)}\n`, "utf8");

  return {
    selected,
    shortlistPath,
    briefPath,
  };
}

function toResearchEntry(candidate: RankedCandidate): ResearchShortlistEntry {
  const summary = candidate.readmeSummary ?? candidate.description ?? "Needs deeper README enrichment.";
  return {
    slug: candidate.slug,
    name: candidate.name,
    url: candidate.url,
    score: candidate.score,
    fitBucket: candidate.fitBucket,
    summary,
    reasons: candidate.reasons,
    recommendedAngle: recommendAngle(candidate, summary),
    visualProof: buildVisualProof(candidate, summary),
  };
}

function recommendAngle(candidate: RankedCandidate, summary: string): string {
  const text = `${candidate.name} ${candidate.description ?? ""} ${summary}`.toLowerCase();
  if (/\b(agent|multi-agent|workflow|automation|browser|research)\b/.test(text)) {
    return "Lead with the workflow payoff, then show the repo header, README proof, and one concrete interaction.";
  }

  if (/\b(video|screen|record|demo|media|player)\b/.test(text)) {
    return "Open on the most visual proof point first, then explain the developer use case with one strong README section.";
  }

  return "Anchor the story on the clearest README explanation, then support it with one proof-of-work section and one code sample.";
}

function buildVisualProof(candidate: RankedCandidate, summary: string): string[] {
  const text = `${candidate.description ?? ""} ${summary}`.toLowerCase();
  const cues = [
    "Repository header and social proof",
    "README opening section",
  ];

  if (/\b(code|sdk|api|command|cli|install)\b/.test(text)) {
    cues.push("Command or code sample block");
  }

  if (/\b(video|demo|gif|preview|browser)\b/.test(text)) {
    cues.push("Demo link or embedded preview");
  }

  if (/\b(agent|workflow|plan|execution|memory)\b/.test(text)) {
    cues.push("Workflow or architecture section");
  }

  return cues;
}

function buildResearchBrief(selected: ResearchShortlistEntry[]): string {
  const lines = [
    "# Research Brief",
    "",
    `Selected repos: ${selected.length}`,
    "",
  ];

  for (const [index, candidate] of selected.entries()) {
    lines.push(
      `## ${index + 1}. ${candidate.slug}`,
      "",
      `- Score: ${candidate.score.toFixed(1)} (${candidate.fitBucket})`,
      `- Summary: ${candidate.summary}`,
      `- Angle: ${candidate.recommendedAngle}`,
      `- Reasons: ${candidate.reasons.join("; ")}`,
      `- Visual proof: ${candidate.visualProof.join("; ")}`,
      "",
    );
  }

  return lines.join("\n");
}
