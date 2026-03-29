import type { CandidateTool } from "./candidate-types";

const CONVERSATIONAL_OPENERS = [
  (name: string) => `${name} is one of the projects moving today.`,
  (name: string) => `${name} is built for a pretty specific workflow.`,
  (name: string) => `${name} looks geared toward developers who want something more hands-on.`,
  (name: string) => `${name} leans into a more technical use case than the name first suggests.`,
  (name: string) => `${name} is the kind of repo that makes more sense once you see the page.`,
];

const OPTIONAL_CLOSERS = [
  "The practical use case is easier to spot once you get into the README.",
  "The interesting part here is how quickly you can picture where this fits.",
  "This reads a lot better as a workflow tool than a hype project.",
];

export function selectDailySummary(candidate: CandidateTool): string {
  const description = normalizeToEnglishFriendlyText(candidate.description?.trim());
  const readmeSummary = normalizeToEnglishFriendlyText(candidate.readmeSummary?.trim());

  if (!readmeSummary) {
    return description ?? `${candidate.name} is trending today.`;
  }

  if (!description) {
    return sanitizeSummary(readmeSummary);
  }

  const cleanDescription = sanitizeSummary(description);
  const cleanReadme = sanitizeSummary(readmeSummary);

  if (!isEnglishEnough(cleanReadme) && isEnglishEnough(cleanDescription)) {
    return cleanDescription;
  }

  if (isGenericTagline(cleanDescription) && !isGenericTagline(cleanReadme)) {
    return cleanReadme;
  }

  return scoreSummary(cleanReadme) >= scoreSummary(cleanDescription)
    ? cleanReadme
    : cleanDescription;
}

export function buildDailyToolScript(
  candidate: CandidateTool,
  rank: number,
): string {
  const opener = CONVERSATIONAL_OPENERS[indexFromSeed(candidate.slug, CONVERSATIONAL_OPENERS.length)](
    candidate.name,
  );
  const summary = selectDailySummary(candidate);

  const parts = [opener, summary];

  if (shouldUseOptionalCloser(candidate.slug, rank)) {
    parts.push(
      OPTIONAL_CLOSERS[indexFromSeed(`${candidate.slug}-${rank}`, OPTIONAL_CLOSERS.length)],
    );
  }

  return parts.join(" ");
}

export function buildMoversHeaderScript(): string {
  return "Here are the developer tools getting the most traction right now.";
}

export function isDailyEnglishReady(candidate: CandidateTool): boolean {
  return Boolean(
    normalizeToEnglishFriendlyText(candidate.description?.trim()) ||
      normalizeToEnglishFriendlyText(candidate.readmeSummary?.trim()),
  );
}

function sanitizeSummary(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeToEnglishFriendlyText(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const sanitized = sanitizeSummary(value);
  const englishSentence = sanitized.match(/[A-Za-z0-9][A-Za-z0-9 ,.'":;()!/?-]{20,}/)?.[0]?.trim();

  if (/[^\x00-\x7F]/.test(sanitized) && englishSentence && englishSentence.length >= 30) {
    return englishSentence;
  }

  if (isEnglishEnough(sanitized)) {
    return sanitized;
  }

  if (!englishSentence || englishSentence.length < 30) {
    return undefined;
  }

  return englishSentence;
}

function isEnglishEnough(value: string): boolean {
  const letters = Array.from(value).filter((char) => /[A-Za-z]/.test(char)).length;
  const nonAsciiLetters = Array.from(value).filter((char) => /[^\x00-\x7F]/.test(char)).length;
  return letters >= Math.max(12, nonAsciiLetters * 2);
}

function isGenericTagline(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.length < 45 ||
    /\b(the agent that grows with you|grow[s]? with you|simple|easy|powerful)\b/.test(normalized)
  );
}

function scoreSummary(value: string): number {
  const normalized = value.toLowerCase();
  let score = 0;

  if (value.length >= 45 && value.length <= 220) {
    score += 3;
  }

  if (/[.!?]$/.test(value)) {
    score += 1;
  }

  if (/\b(is|helps|makes|framework|platform|agent|tool|workflow|automation|browser|memory|research)\b/.test(normalized)) {
    score += 4;
  }

  if (/\b(public url|benchmark|open source:|full benchmark|repository|issue|hostname)\b/.test(normalized)) {
    score -= 6;
  }

  if (!isEnglishEnough(value)) {
    score -= 5;
  }

  if (isGenericTagline(value)) {
    score -= 4;
  }

  return score;
}

function shouldUseOptionalCloser(seed: string, rank: number): boolean {
  return indexFromSeed(`${seed}-${rank}-closer`, 100) < 35;
}

function indexFromSeed(seed: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return hash % modulo;
}
