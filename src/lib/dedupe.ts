import fs from "fs";
import path from "path";
import type { RankedCandidate } from "./ranker";

export interface EpisodeLedgerEntry {
  skillId: string;
  slug: string;
  name: string;
  firstSeenEpisode: string; // date YYYY-MM-DD
  lastSeenEpisode: string;
  lastRank: number;
  timesFeatures: number;
}

export interface EpisodeLedger {
  version: 1;
  entries: Record<string, EpisodeLedgerEntry>;
}

const LEDGER_FILENAME = "episodes-ledger.json";
const DEFAULT_COOLDOWN_WEEKS = 8;

/**
 * Cross-source alias map: ClawHub slugs that map to known GitHub repos.
 * When both sources discover the same tool, this ensures canonical merge.
 * Extend this map as new aliases are confirmed.
 */
const CROSS_SOURCE_ALIASES = new Map<string, string>([
  // Format: clawhub slug → gh:owner/repo canonical id
  // Populated as we discover ClawHub skills with known GitHub origins
]);

/**
 * Derive a stable canonical ID for a skill.
 *
 * - clawhub source → "clawhub:<slug>"
 * - GitHub URL → "gh:<owner/repo>"
 * - Fallback → "name:<normalized-name>"
 */
export function canonicalSkillId(skill: {
  slug?: string;
  url?: string;
  name?: string;
  source?: string;
}): string {
  if (skill.source === "clawhub" && skill.slug) {
    // Check cross-source alias first — if this ClawHub skill is known to be
    // the same as a GitHub repo, use the GitHub canonical ID for merge.
    const alias = CROSS_SOURCE_ALIASES.get(skill.slug);
    if (alias) return alias;
    return `clawhub:${skill.slug}`;
  }

  if (skill.url) {
    const ghMatch = skill.url.match(
      /github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/,
    );
    if (ghMatch?.[1]) {
      return `gh:${ghMatch[1]}`;
    }
  }

  const raw = skill.slug ?? skill.name ?? "";
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `name:${normalized}`;
}

/**
 * Register a cross-source alias at runtime. Used when README enrichment
 * discovers that a ClawHub skill maps to a specific GitHub repo.
 */
export function registerCrossSourceAlias(
  clawhubSlug: string,
  githubCanonicalId: string,
): void {
  CROSS_SOURCE_ALIASES.set(clawhubSlug, githubCanonicalId);
}

export function loadLedger(rootDir: string): EpisodeLedger {
  const ledgerPath = path.join(rootDir, "runtime", LEDGER_FILENAME);
  if (!fs.existsSync(ledgerPath)) {
    return { version: 1, entries: {} };
  }
  try {
    const raw = fs.readFileSync(ledgerPath, "utf8");
    const parsed = JSON.parse(raw) as EpisodeLedger;
    if (parsed.version !== 1 || typeof parsed.entries !== "object") {
      return { version: 1, entries: {} };
    }
    return parsed;
  } catch {
    return { version: 1, entries: {} };
  }
}

export function saveLedger(rootDir: string, ledger: EpisodeLedger): void {
  const runtimeDir = path.join(rootDir, "runtime");
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }
  const ledgerPath = path.join(runtimeDir, LEDGER_FILENAME);
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");
}

/**
 * Returns true if the skill is eligible (not within the cooldown window).
 */
export function isEligibleForEpisode(
  skillId: string,
  ledger: EpisodeLedger,
  opts: { allowReturnAfterWeeks?: number } = {},
): boolean {
  const entry = ledger.entries[skillId];
  if (!entry) return true;

  const cooldownWeeks = opts.allowReturnAfterWeeks ?? DEFAULT_COOLDOWN_WEEKS;
  const lastDate = new Date(entry.lastSeenEpisode);
  const cooldownMs = cooldownWeeks * 7 * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - cooldownMs);
  return lastDate < cutoff;
}

export function recordEpisode(
  ledger: EpisodeLedger,
  skillId: string,
  slug: string,
  name: string,
  rank: number,
  date: string,
): void {
  const existing = ledger.entries[skillId];
  if (existing) {
    existing.lastSeenEpisode = date;
    existing.lastRank = rank;
    existing.timesFeatures += 1;
  } else {
    ledger.entries[skillId] = {
      skillId,
      slug,
      name,
      firstSeenEpisode: date,
      lastSeenEpisode: date,
      lastRank: rank,
      timesFeatures: 1,
    };
  }
}

/**
 * Main deduplication function.
 *
 * 1. Within-run dedupe: when the same canonical ID appears from multiple
 *    sources, keep only the highest-scoring instance.
 * 2. Cross-episode filter: skip skills that appeared within the cooldown window.
 * 3. Return up to `target` selected candidates.
 */
export function dedupeAndSelect(
  candidates: RankedCandidate[],
  ledger: EpisodeLedger,
  target: number,
  date: string,
  opts: { allowReturnAfterWeeks?: number } = {},
): RankedCandidate[] {
  // Step 1: within-run dedupe — highest score per canonical ID wins
  const best = new Map<string, RankedCandidate>();
  for (const candidate of candidates) {
    const id = canonicalSkillId(candidate);
    const existing = best.get(id);
    if (!existing || candidate.score > existing.score) {
      best.set(id, candidate);
    }
  }

  // Step 2: cross-episode filter + collect up to target
  const selected: RankedCandidate[] = [];
  for (const [id, candidate] of best) {
    if (selected.length >= target) break;
    if (isEligibleForEpisode(id, ledger, opts)) {
      selected.push(candidate);
    }
  }

  return selected;
}
