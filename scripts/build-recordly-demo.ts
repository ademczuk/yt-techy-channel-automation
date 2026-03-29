import fs from "node:fs";
import path from "node:path";

import type { FocusCue, SkillsWeeklyProps } from "../src/lib/episode-types";

function main() {
  const rootDir = process.cwd();
  const dateStamp = getDateStamp();
  const testDir = path.join(rootDir, "runtime", "tests", dateStamp, "recordly");
  const episodeDir = path.join(rootDir, "runtime", "episodes", `${dateStamp}-recordly-demo`);
  const manifestPath = path.join(episodeDir, "manifest.json");

  const repos = [
    {
      slug: "bytedance-deer-flow",
      displayName: "deer-flow",
      author: "ByteDance",
      summary:
        "deer-flow is a multi-agent research and execution framework aimed at more structured AI workflows.",
      script:
        "deer-flow is built for teams that want more structure around multi-agent work. The interesting part here is how it packages planning, execution, and coordination into something that looks a lot closer to a usable workflow than a toy demo.",
      rank: 1,
      stars: 3200,
      downloads: 0,
      installsAllTime: 0,
    },
    {
      slug: "nousresearch-hermes-agent",
      displayName: "hermes-agent",
      author: "Nous Research",
      summary:
        "hermes-agent is an agent platform focused on reusable skills, memory, messaging, and self-improving workflows.",
      script:
        "hermes-agent leans harder into the long-running assistant idea. Instead of just answering prompts, it is trying to become a reusable working system with skills, memory, and enough structure to keep improving across sessions.",
      rank: 2,
      stars: 2100,
      downloads: 0,
      installsAllTime: 0,
    },
  ] as const;

  const movers = repos.map((repo) => {
    const clipPath = path.join(testDir, `${repo.slug}.raw.mp4`);
    const cuePath = path.join(testDir, `${repo.slug}.focus-cues.json`);

    if (!fs.existsSync(clipPath)) {
      throw new Error(`Missing Recordly clip: ${clipPath}`);
    }

    const cues = fs.existsSync(cuePath)
      ? (JSON.parse(fs.readFileSync(cuePath, "utf8")) as FocusCue[])
      : [];

    return {
      slug: repo.slug,
      displayName: repo.displayName,
      summary: repo.summary,
      author: repo.author,
      downloads: repo.downloads,
      stars: repo.stars,
      installsCurrent: 0,
      installsAllTime: repo.installsAllTime,
      clawhubUrl: `https://github.com/${repo.author.replace(/\s+/g, "")}/${repo.displayName}`,
      createdAt: null,
      track: "mover" as const,
      rank: repo.rank,
      script: repo.script,
      clipPath: toRuntimeAssetPath(clipPath),
      focusCues: cues,
    };
  });

  const manifest: SkillsWeeklyProps = {
    episodeNumber: 1,
    weekLabel: "Recordly Demo",
    generatedAt: new Date().toISOString(),
    fps: 30,
    movers,
    rockets: [],
    introScript:
      "This is a short Recordly test for Code Search. Two GitHub repos, real walkthrough capture, and the current packaging pass through Remotion.",
    moversHeaderScript:
      "Here are the two walkthroughs from today’s Recordly test.",
    outroScript:
      "That closes the test pass. Next up is tightening the editing automation so the final pipeline stays smooth and repeatable.",
    backgroundMusicVolume: 0.1,
    introDurationFrames: 90,
    pulseDurationFrames: 1,
    sectionHeaderDurationFrames: 60,
    outroDurationFrames: 75,
    defaultSkillDurationFrames: 240,
    transitionDurationFrames: 12,
  };

  fs.mkdirSync(episodeDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`Wrote Recordly demo manifest: ${manifestPath}`);
}

function getDateStamp(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toRuntimeAssetPath(absolutePath: string): string {
  return absolutePath.replace(/\\/g, "/").split("/runtime/")[1]
    ? `runtime/${absolutePath.replace(/\\/g, "/").split("/runtime/")[1]}`
    : absolutePath.replace(/\\/g, "/");
}

main();
