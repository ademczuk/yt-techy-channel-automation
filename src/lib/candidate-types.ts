export interface CandidateTool {
  slug: string;
  name: string;
  source: string;
  url: string;
  description?: string;
  readmeSummary?: string;
  language?: string;
  starsToday?: number;
  collectedAt: string;
}
