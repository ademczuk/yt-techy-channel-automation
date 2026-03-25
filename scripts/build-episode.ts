import fs from "fs";
import path from "path";
import type { CandidateTool } from "../src/lib/candidate-types";
import {
  buildDailyToolScript,
  buildMoversHeaderScript,
  isDailyEnglishReady,
  selectDailySummary,
} from "../src/lib/daily-copy";
import { rankCandidates } from "../src/lib/ranker";
import type { SkillsWeeklyProps } from "../src/lib/episode-types";
import { enrichCandidatesWithReadmes } from "../src/lib/readme-enrichment";

const DEFAULT_TOOL_LIMIT = 10;

async function main() {
  const date = getLocalDateStamp();
  const episodeDir = path.join(process.cwd(), "runtime", "episodes", date);
  const rawCandidatesPath = path.join(episodeDir, "candidates.raw.json");

  if (!fs.existsSync(rawCandidatesPath)) {
    throw new Error(`Missing raw candidates file: ${rawCandidatesPath}`);
  }

  const rawCandidates = JSON.parse(
    fs.readFileSync(rawCandidatesPath, "utf8"),
  ) as CandidateTool[];

  const preRanked = rankCandidates(
    rawCandidates,
    Math.max(DEFAULT_TOOL_LIMIT + 5, 15),
  );
  const enriched = await enrichCandidatesWithReadmes(
    preRanked,
    path.join(episodeDir, "readmes"),
  );
  const ranked = rankCandidates(enriched, DEFAULT_TOOL_LIMIT + 5)
    .filter((candidate) => isDailyEnglishReady(candidate))
    .slice(0, DEFAULT_TOOL_LIMIT);
  const manifest = buildManifest(ranked, date);

  fs.writeFileSync(
    path.join(episodeDir, "selection.json"),
    JSON.stringify(ranked, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(episodeDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  console.log(`Selected ${ranked.length} tools`);
  console.log(`Output: ${path.join(episodeDir, "manifest.json")}`);
}

function buildManifest(
  ranked: ReturnType<typeof rankCandidates>,
  date: string,
): SkillsWeeklyProps {
  return {
    episodeNumber: 1,
    weekLabel: `Daily scan for ${date}`,
    generatedAt: new Date().toISOString(),
    fps: 30,
    movers: ranked.map((candidate, index) => ({
      slug: candidate.slug,
      displayName: candidate.name,
      summary: selectDailySummary(candidate),
      author: candidate.slug.split("/")[0] ?? "unknown",
      downloads: 0,
      stars: candidate.starsToday ?? 0,
      installsCurrent: 0,
      installsAllTime: 0,
      clawhubUrl: candidate.url,
      createdAt: candidate.collectedAt,
      track: "mover" as const,
      rank: index + 1,
      script: buildDailyToolScript(candidate, index + 1),
      starsDelta: candidate.starsToday,
      score: candidate.score,
    })),
    rockets: [],
    catalog: [],
    openclawProject: [],
    introScript: "Code Search Daily. Here are the developer tools worth a look today.",
    moversHeaderScript: buildMoversHeaderScript(),
    outroScript: "That is today's code search. More tomorrow.",
    backgroundMusicVolume: 0.12,
    introDurationFrames: 75,
    pulseDurationFrames: 0,
    sectionHeaderDurationFrames: 45,
    outroDurationFrames: 75,
    defaultSkillDurationFrames: 210,
    transitionDurationFrames: 12,
  };
}

function getLocalDateStamp(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
