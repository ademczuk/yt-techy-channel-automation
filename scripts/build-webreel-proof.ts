import fs from "fs";
import path from "path";
import { getLocalDateStamp } from "../src/lib/episode-paths";
import type { SkillsWeeklyProps } from "../src/lib/episode-types";
import { toRuntimeAssetPath } from "../src/lib/webreel-debug";

const REPOS = [
  {
    slug: "bytedance-deer-flow",
    displayName: "deer-flow",
    author: "ByteDance",
    summary:
      "deer-flow is a long-horizon multi-agent framework that combines planning, research, execution, and memory in one structured system.",
    script:
      "deer-flow is built for teams that want more structure around multi-agent work. The interesting part here is how it packages planning, execution, and coordination into something that feels much closer to a usable workflow than a toy demo.",
    rank: 1,
    stars: 3200,
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
  },
] as const;

function main() {
  const rootDir = process.cwd();
  const dateStamp = getLocalDateStamp();
  const testDir = path.join(rootDir, "runtime", "tests", dateStamp, "webreel");
  const episodeDir = path.join(rootDir, "runtime", "episodes", `${dateStamp}-webreel-proof`);
  const manifestPath = path.join(episodeDir, "manifest.json");

  const movers = REPOS.map((repo) => {
    const clipPath = path.join(testDir, `${repo.slug}.mp4`);
    if (!fs.existsSync(clipPath)) {
      throw new Error(`Missing Webreel clip: ${clipPath}`);
    }

    return {
      slug: repo.slug,
      displayName: repo.displayName,
      summary: repo.summary,
      author: repo.author,
      downloads: 0,
      stars: repo.stars,
      installsCurrent: 0,
      installsAllTime: 0,
      clawhubUrl: `https://github.com/${repo.author.replace(/\s+/g, "")}/${repo.displayName}`,
      createdAt: null,
      track: "mover" as const,
      rank: repo.rank,
      script: repo.script,
      clipPath: toRuntimeAssetPath(clipPath),
    };
  });

  const manifest: SkillsWeeklyProps = {
    episodeNumber: 1,
    weekLabel: "Webreel Proof",
    generatedAt: new Date().toISOString(),
    fps: 30,
    movers,
    rockets: [],
    introScript:
      "This is a short Webreel proof for Code Search. Two GitHub repos, a scripted browser walkthrough, and the current packaging pass through Remotion.",
    moversHeaderScript:
      "Here are the two walkthroughs from the Webreel Windows proof run.",
    outroScript:
      "That closes the Webreel proof. If this stays stable, it becomes the first deterministic capture lane for the larger automation system.",
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

  console.log(`Wrote Webreel proof manifest: ${manifestPath}`);
}

main();
