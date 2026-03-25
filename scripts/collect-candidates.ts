import fs from "fs";
import path from "path";
import { parseGitHubTrending } from "../src/lib/github-trending";

interface SourceConfig {
  githubTrending: {
    enabled: boolean;
    since?: "daily" | "weekly" | "monthly";
    language?: string;
  };
}

const DEFAULT_CONFIG: SourceConfig = {
  githubTrending: {
    enabled: true,
    since: "daily",
  },
};

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const episodeDir = path.join(process.cwd(), "runtime", "episodes", date);
  const config = loadConfig();
  const collectedAt = new Date().toISOString();

  fs.mkdirSync(episodeDir, { recursive: true });

  const candidates = [];

  if (config.githubTrending.enabled) {
    const url = new URL("https://github.com/trending");
    if (config.githubTrending.since) {
      url.searchParams.set("since", config.githubTrending.since);
    }
    if (config.githubTrending.language) {
      url.searchParams.set("l", config.githubTrending.language);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Code-Search-Daily/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub Trending: ${response.status}`);
    }

    const html = await response.text();
    candidates.push(...parseGitHubTrending(html, collectedAt));
  }

  const outputPath = path.join(episodeDir, "candidates.raw.json");
  fs.writeFileSync(outputPath, JSON.stringify(candidates, null, 2), "utf8");

  console.log(`Collected ${candidates.length} candidates`);
  console.log(`Output: ${outputPath}`);
}

function loadConfig(): SourceConfig {
  const configPath = path.join(
    process.cwd(),
    "runtime",
    "source-config.json",
  );

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const raw = fs.readFileSync(configPath, "utf8");
  return {
    ...DEFAULT_CONFIG,
    ...JSON.parse(raw),
  } as SourceConfig;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
