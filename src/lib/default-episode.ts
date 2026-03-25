import type { SkillsWeeklyProps } from "./episode-types";

/**
 * Temporary fixture episode used for studio/dev until the generator pipeline
 * writes daily manifests into the runtime folder.
 */
export const DEFAULT_EPISODE_DATA: SkillsWeeklyProps = {
  episodeNumber: 2,
  weekLabel: "Week of Mar 02, 2026",
  generatedAt: "2026-03-02T09:11:49.676Z",
  fps: 30,

  movers: [
    {
      slug: "self-improving-agent",
      displayName: "self-improving-agent",
      summary: "Captures learnings, errors, and corrections to enable continuous improvement.",
      author: "pskoett",
      downloads: 84448,
      stars: 1004,
      installsCurrent: 901,
      installsAllTime: 930,
      clawhubUrl: "https://clawhub.ai/skills/self-improving-agent",
      createdAt: 1767632598365,
      track: "mover",
      rank: 1,
      script: "Your agent hallucinates a file path, runs it, crashes, then makes the same mistake twenty minutes later. Self-improving-agent logs the failure, correction, and execution context into a persistent knowledge base that subsequent runs query before attempting operations, collapsing repeated error cycles.",
      downloadsDelta: 2282,
      starsDelta: 30,
      installsDelta: 29,
      pctIncrease: 3.22,
      score: 0.3028,
      history: [
        { date: "2026-03-01", downloads: 82166, stars: 974, installsAllTime: 901, installsCurrent: 872, comments: 45 },
        { date: "2026-03-02", downloads: 84448, stars: 1004, installsAllTime: 930, installsCurrent: 901, comments: 45 },
      ],
      screenshotPath: "screenshots/self-improving-agent.png",
      screenshotHeight: 17967,
      audioPath: "audio/self-improving-agent.mp3",
      audioDurationMs: 20112,
    },
    {
      slug: "find-skills",
      displayName: "Find Skills",
      summary: "Helps users discover and install agent skills when they ask questions.",
      author: "JimLiuxinghai",
      downloads: 69499,
      stars: 298,
      installsCurrent: 551,
      installsAllTime: 564,
      clawhubUrl: "https://clawhub.ai/skills/find-skills",
      createdAt: 1769698710765,
      track: "mover",
      rank: 2,
      script: "User asks how do I automate X and hits a wall. Find Skills intercepts those queries, searches the skill registry via CLI, and surfaces installable extensions that match the request, turning dead ends into working solutions.",
      downloadsDelta: 1904,
      starsDelta: 9,
      installsDelta: 24,
      pctIncrease: 4.44,
      score: 0.1422,
      history: [
        { date: "2026-03-01", downloads: 67595, stars: 289, installsAllTime: 540, installsCurrent: 527, comments: 3 },
        { date: "2026-03-02", downloads: 69499, stars: 298, installsAllTime: 564, installsCurrent: 551, comments: 3 },
      ],
      screenshotPath: "screenshots/find-skills.png",
      screenshotHeight: 3844,
      audioPath: "audio/find-skills.mp3",
      audioDurationMs: 14592,
    },
  ],

  rockets: [
    {
      slug: "polymarketodds",
      displayName: "Polymarket",
      summary: "Query Polymarket prediction markets - check odds, trending markets, search events.",
      author: "joelchance",
      downloads: 49483,
      stars: 124,
      installsCurrent: 30,
      installsAllTime: 30,
      clawhubUrl: "https://clawhub.ai/skills/polymarketodds",
      createdAt: 1771621678924,
      track: "rocket",
      rank: 1,
      script: "You're staring at a Polymarket position and the odds just moved three points in sixty seconds. PolymarketOdds queries live order books, surfaces trending markets, and tracks price momentum across events.",
      downloadsDelta: 914,
      starsDelta: 3,
      installsDelta: 1,
      pctIncrease: 3.45,
      score: 0.636,
      history: [
        { date: "2026-03-01", downloads: 48569, stars: 121, installsAllTime: 29, installsCurrent: 29, comments: 19 },
        { date: "2026-03-02", downloads: 49483, stars: 124, installsAllTime: 30, installsCurrent: 30, comments: 19 },
      ],
      screenshotPath: "screenshots/polymarketodds.png",
      screenshotHeight: 7156,
      audioPath: "audio/polymarketodds.mp3",
      audioDurationMs: 17952,
    },
  ],

  catalog: [
    { date: "2026-03-01", totalSkills: 13018, totalDownloads: 13175801, totalInstalls: 60297, totalStars: 22402 },
    { date: "2026-03-02", totalSkills: 13345, totalDownloads: 13239325, totalInstalls: 61127, totalStars: 22529 },
  ],

  openclawProject: [
    { repo: "openclaw/openclaw", date: "2026-03-02", stars: 245238, forks: 47395, openIssues: 9932, openPrs: 5407, watchers: 1319, weeklyCommits: 518, latestRelease: "v2026.3.1" },
  ],

  introScript: "Welcome to Code Search Daily. Here are a few tools worth a look this week.",
  introAudioPath: "audio/scene-intro.mp3",
  introAudioDurationMs: 16368,

  pulseScript: "Here is the ecosystem pulse.",
  pulseAudioPath: "audio/scene-pulse.mp3",
  pulseAudioDurationMs: 12552,

  moversHeaderScript: "First up, our top movers.",
  moversHeaderAudioPath: "audio/scene-movers-header.mp3",
  moversHeaderAudioDurationMs: 5880,

  rocketsHeaderScript: "Now for the new arrivals.",
  rocketsHeaderAudioPath: "audio/scene-rockets-header.mp3",
  rocketsHeaderAudioDurationMs: 4176,

  outroScript: "That is today's code search. More tomorrow.",
  outroAudioPath: "audio/scene-outro.mp3",
  outroAudioDurationMs: 11808,

  backgroundMusicPath: "music/ambient-bed.mp3",
  backgroundMusicVolume: 0.12,

  introDurationFrames: 75,
  pulseDurationFrames: 180,
  sectionHeaderDurationFrames: 90,
  outroDurationFrames: 90,
  defaultSkillDurationFrames: 240,
  transitionDurationFrames: 15,
};
