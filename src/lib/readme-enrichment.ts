import fs from "fs";
import path from "path";
import type { CandidateTool } from "./candidate-types";

export function extractGitHubRepo(url: string): {
  owner: string;
  repo: string;
} | null {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2],
  };
}

export function summarizeReadme(
  markdown: string,
  fallback?: string,
): string | undefined {
  const candidates = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line, index) => {
      const isHeading = /^#+\s/.test(line);
      const content = isHeading ? line.replace(/^#+\s*/, "") : line;
      const stripped = stripMarkdown(content);
      return {
        originalIndex: index,
        isHeading,
        raw: content.trim(),
        line: stripped,
      };
    })
    .filter((entry) => entry.line.length > 20)
    .filter((entry) => !/[<>]/.test(entry.line))
    .filter((entry) => /[A-Za-z\u00C0-\u024F\u4E00-\u9FFF]/.test(entry.line))
    .filter((entry) => !shouldIgnoreLine(entry.line));

  const ranked = candidates
    .map((entry) => ({
      ...entry,
      score: scoreSummaryLine(
        entry.line,
        entry.originalIndex,
        entry.isHeading,
        entry.raw,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.line ?? fallback;
}

export async function enrichCandidatesWithReadmes(
  candidates: CandidateTool[],
  cacheDir: string,
): Promise<CandidateTool[]> {
  fs.mkdirSync(cacheDir, { recursive: true });

  const enriched: CandidateTool[] = [];

  for (const candidate of candidates) {
    const repo = extractGitHubRepo(candidate.url);
    if (!repo) {
      enriched.push(candidate);
      continue;
    }

    const cachePath = path.join(
      cacheDir,
      `${candidate.slug.replace(/[\\/:"*?<>|]+/g, "-")}.md`,
    );

    let markdown: string | undefined;

    if (fs.existsSync(cachePath)) {
      markdown = fs.readFileSync(cachePath, "utf8");
    } else {
      markdown = await fetchReadme(repo.owner, repo.repo);
      if (markdown) {
        fs.writeFileSync(cachePath, markdown, "utf8");
      }
    }

    enriched.push({
      ...candidate,
      readmeSummary: markdown
        ? summarizeReadme(markdown, candidate.description)
        : candidate.description,
    });
  }

  return enriched;
}

async function fetchReadme(
  owner: string,
  repo: string,
): Promise<string | undefined> {
  const branches = ["main", "master"];

  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Code-Search-Daily/1.0",
      },
    });

    if (response.ok) {
      return await response.text();
    }
  }

  return undefined;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^[*-]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/[*_`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldIgnoreLine(line: string): boolean {
  return (
    line.startsWith("![](") ||
    line.startsWith("<img") ||
    line.startsWith("<a ") ||
    line.startsWith("<div") ||
    line.startsWith("<source") ||
    line.startsWith("</") ||
    line.startsWith("[![") ||
    line.startsWith("|") ||
    line.startsWith("```") ||
    line.startsWith("> [!")
  );
}

function scoreSummaryLine(
  line: string,
  originalIndex: number,
  isHeading: boolean,
  rawLine: string,
): number {
  const text = line.toLowerCase();
  let score = 0;

  score += Math.max(0, 10 - originalIndex) * 0.75;

  if (/\b(is|are|helps|makes|built|designed|framework|platform|tool|agent|server)\b/.test(text)) {
    score += 6;
  }

  if (/\b(ai|agent|automation|workflow|browser|developer|research|framework|platform|server|tool)\b/.test(text)) {
    score += 4;
  }

  if (line.length >= 60 && line.length <= 220) {
    score += 2;
  }

  if (line.length > 360) {
    score -= 3;
  }

  if (/[.!?]$/.test(line)) {
    score += 1;
  }

  if (isHeading && /[:\-]/.test(line)) {
    score += 5;
  }

  if (/\b(version|released|launch|launching|trending|claimed|spot on github|thanks|community|changelog|update)\b/.test(text)) {
    score -= 8;
  }

  if (/\b(skip the setup|setup|quick start|installation|install|pip install|npm install|try our cloud|use our cloud)\b/.test(text)) {
    score -= 8;
  }

  if (/\b(without authorization|unauthorized|proprietary code|claimed it as their product|we noticed)\b/.test(text)) {
    score -= 10;
  }

  if (/\b(table of contents|quickstart|how to use|documentation|docs|faq|contributing|license|api documentation)\b/.test(text)) {
    score -= 7;
  }

  if (/\b(repository|issue|database|open a new issue|discussions)\b/.test(text)) {
    score -= 6;
  }

  if (/^\d+\./.test(rawLine)) {
    score -= 10;
  }

  if (line.includes("|")) {
    score -= 6;
  }

  if (/\b(join the community|discord|telegram|follow us|star this repo)\b/.test(text)) {
    score -= 6;
  }

  return score;
}
