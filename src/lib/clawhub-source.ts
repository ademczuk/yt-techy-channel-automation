import { execSync } from "child_process";
import type { CandidateTool } from "./candidate-types";

/**
 * Skills known from default-episode.ts used as a static fallback when
 * the ClawHub site returns no data and the CLI is unavailable.
 */
const STATIC_SEED_SKILLS: Array<{
  slug: string;
  name: string;
  description: string;
  author: string;
  stars: number;
  downloads: number;
}> = [
  {
    slug: "self-improving-agent",
    name: "self-improving-agent",
    description:
      "Captures learnings, errors, and corrections to enable continuous improvement.",
    author: "pskoett",
    stars: 1004,
    downloads: 84448,
  },
  {
    slug: "find-skills",
    name: "Find Skills",
    description:
      "Helps users discover and install agent skills when they ask questions.",
    author: "JimLiuxinghai",
    stars: 298,
    downloads: 69499,
  },
  {
    slug: "polymarketodds",
    name: "Polymarket",
    description:
      "Query Polymarket prediction markets - check odds, trending markets, search events.",
    author: "joelchance",
    stars: 124,
    downloads: 49483,
  },
  {
    slug: "memory-consolidate",
    name: "memory-consolidate",
    description: "Consolidate agent learnings into Obsidian vault for long-term persistence.",
    author: "openclaw",
    stars: 88,
    downloads: 31200,
  },
  {
    slug: "web-research",
    name: "web-research",
    description: "Automated web research and summarisation using browser tools.",
    author: "openclaw",
    stars: 76,
    downloads: 28900,
  },
];

interface ClawHubSkillCard {
  slug: string;
  name: string;
  description: string;
  author: string;
  stars?: number;
  downloads?: number;
}

/**
 * Parse skill cards from the ClawHub skills listing HTML.
 * The site renders skill cards with data attributes or structured markup;
 * this parser targets the most stable identifiers available.
 */
function parseSkillCards(html: string): ClawHubSkillCard[] {
  const cards: ClawHubSkillCard[] = [];

  // Match skill card blocks — adapt selector patterns as the site evolves.
  // Pattern: href="/skills/<slug>" anchors within card containers.
  const skillLinkPattern = /href="\/skills\/([a-z0-9][a-z0-9-]{0,64})"/g;
  const slugsSeen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = skillLinkPattern.exec(html)) !== null) {
    const slug = match[1];
    if (!slug || slugsSeen.has(slug)) continue;
    slugsSeen.add(slug);

    // Extract a nearby name — look for the next heading-like text after the link.
    const surroundingText = html.slice(match.index, match.index + 800);

    const nameMatch =
      surroundingText.match(/<h[1-6][^>]*>\s*([^<]{2,80})\s*<\/h[1-6]>/) ||
      surroundingText.match(/class="[^"]*title[^"]*"[^>]*>\s*([^<]{2,80})\s*</) ||
      surroundingText.match(/class="[^"]*name[^"]*"[^>]*>\s*([^<]{2,80})\s*</);

    const descMatch =
      surroundingText.match(/class="[^"]*desc[^"]*"[^>]*>\s*([^<]{10,200})\s*</) ||
      surroundingText.match(/<p[^>]*>\s*([^<]{10,200})\s*<\/p>/);

    const authorMatch =
      surroundingText.match(/class="[^"]*author[^"]*"[^>]*>\s*([^<]{2,40})\s*</) ||
      surroundingText.match(/by\s+([A-Za-z0-9_-]{2,30})/i);

    const starsMatch = surroundingText.match(/(\d[\d,]*)\s*(?:star|★)/i);
    const downloadsMatch = surroundingText.match(/(\d[\d,]*)\s*(?:download|install)/i);

    cards.push({
      slug,
      name: nameMatch ? nameMatch[1].trim() : slug,
      description: descMatch ? descMatch[1].trim() : "",
      author: authorMatch ? authorMatch[1].trim() : "unknown",
      stars: starsMatch
        ? parseInt(starsMatch[1].replace(/,/g, ""), 10)
        : undefined,
      downloads: downloadsMatch
        ? parseInt(downloadsMatch[1].replace(/,/g, ""), 10)
        : undefined,
    });
  }

  return cards;
}

/**
 * Attempt to fetch skills from the ClawHub website.
 * Returns an empty array on any network or parse failure.
 */
async function fetchFromSite(limit: number): Promise<ClawHubSkillCard[]> {
  try {
    const res = await fetch("https://clawhub.ai/skills", {
      headers: { "User-Agent": "yt-techy-pipeline/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const html = await res.text();

    // Detect "No skills yet" placeholder — site is empty.
    if (/no skills yet/i.test(html)) return [];

    const cards = parseSkillCards(html);
    return cards.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Attempt to fetch skills via the ClawHub CLI.
 * Returns an empty array if the CLI is unavailable or returns no data.
 */
function fetchFromCli(limit: number): ClawHubSkillCard[] {
  try {
    const raw = execSync(`npx clawhub@latest search "*" --json --limit ${limit}`, {
      timeout: 30_000,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const parsed = JSON.parse(raw) as Array<{
      slug?: string;
      name?: string;
      description?: string;
      author?: string;
      stars?: number;
      downloads?: number;
    }>;

    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    return parsed
      .filter((item) => typeof item.slug === "string" && item.slug.length > 0)
      .map((item) => ({
        slug: item.slug!,
        name: item.name ?? item.slug!,
        description: item.description ?? "",
        author: item.author ?? "unknown",
        stars: item.stars,
        downloads: item.downloads,
      }));
  } catch {
    return [];
  }
}

/**
 * Convert a raw ClawHub skill card into a CandidateTool.
 */
function toCandidate(card: ClawHubSkillCard, collectedAt: string): CandidateTool {
  return {
    slug: card.slug,
    name: card.name,
    source: "clawhub",
    url: `https://clawhub.ai/skills/${card.slug}`,
    description: card.description || undefined,
    starsToday: card.stars,
    collectedAt,
  };
}

/**
 * Fetch ClawHub skills using a three-tier fallback strategy:
 *   1. Scrape the ClawHub website
 *   2. Use the ClawHub CLI (`npx clawhub@latest search`)
 *   3. Return the static seed list from default-episode.ts
 */
export async function fetchClawHubSkills(
  limit = 30,
  collectedAt = new Date().toISOString(),
): Promise<CandidateTool[]> {
  // Tier 1: website scrape
  const siteCards = await fetchFromSite(limit);
  if (siteCards.length > 0) {
    console.log(`ClawHub: fetched ${siteCards.length} skills from site`);
    return siteCards.map((c) => toCandidate(c, collectedAt));
  }

  // Tier 2: CLI
  const cliCards = fetchFromCli(limit);
  if (cliCards.length > 0) {
    console.log(`ClawHub: fetched ${cliCards.length} skills via CLI`);
    return cliCards.map((c) => toCandidate(c, collectedAt));
  }

  // Tier 3: static seed
  console.log(
    `ClawHub: site and CLI both unavailable — using ${STATIC_SEED_SKILLS.length} static seed skills`,
  );
  return STATIC_SEED_SKILLS.slice(0, limit).map((seed) =>
    toCandidate(seed, collectedAt),
  );
}
