import type { CandidateTool } from "./candidate-types";

export function parseGitHubTrending(
  html: string,
  collectedAt: string,
): CandidateTool[] {
  const articleBlocks = html.match(/<article[\s\S]*?<\/article>/g) ?? [];

  return articleBlocks
    .map((article) => {
      const repoMatch = article.match(/href="\/([^"/]+\/[^"/]+)"/);
      if (!repoMatch) {
        return null;
      }

      const slug = repoMatch[1];
      const descriptionMatch = article.match(
        /<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/,
      );
      const languageMatch = article.match(
        /<span itemprop="programmingLanguage">([\s\S]*?)<\/span>/,
      );
      const starsTodayMatch = article.match(/([\d,]+)\s+stars today/);

      return {
        slug,
        name: slug.split("/")[1] ?? slug,
        source: "github-trending",
        url: `https://github.com/${slug}`,
        description: stripHtml(descriptionMatch?.[1]),
        language: stripHtml(languageMatch?.[1]),
        starsToday: starsTodayMatch?.[1]
          ? parseInt(starsTodayMatch[1].replace(/,/g, ""), 10)
          : undefined,
        collectedAt,
      } satisfies CandidateTool;
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null) as CandidateTool[];
}

function stripHtml(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
