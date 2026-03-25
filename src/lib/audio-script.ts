import type { CandidateTool } from "./candidate-types";

export function buildToolVoiceScript(candidate: {
  name: string;
  readmeSummary?: string;
  description?: string;
}): string {
  const description =
    candidate.readmeSummary ??
    candidate.description ??
    `${candidate.name} is trending on GitHub today.`;

  return `${candidate.name} is trending right now. ${description} Keep an eye on this one if you're tracking developer tools and automation workflows.`;
}
