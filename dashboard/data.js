export const stageDefinitions = [
  {
    id: "discovery",
    title: "Discovery",
    description: "Fetch GitHub candidates, normalize, dedupe, and rank.",
    owner: "Code",
  },
  {
    id: "research",
    title: "Research",
    description: "Shortlist repos and enrich README context.",
    owner: "Hybrid",
  },
  {
    id: "script",
    title: "Script",
    description: "Agent writes the narration packet from the selected story.",
    owner: "Agent",
  },
  {
    id: "audio",
    title: "Audio",
    description: "Call the TTS API and persist rendered narration assets.",
    owner: "Code",
  },
  {
    id: "recordingPlan",
    title: "Recording Plan",
    description: "Translate script timing into executable browser moves.",
    owner: "Hybrid",
  },
  {
    id: "browserDrive",
    title: "Browser Drive",
    description: "Real mouse movement and real clicks on the local browser.",
    owner: "Code",
  },
  {
    id: "capture",
    title: "Capture",
    description: "Record the browser with the reliable screen-demo shell.",
    owner: "Code",
  },
  {
    id: "trim",
    title: "Trim",
    description: "Cut blank dead time around the action moments.",
    owner: "Code",
  },
  {
    id: "handoff",
    title: "Handoff",
    description: "Export the MP4 for manual Cursorful or Recordly polish.",
    owner: "Code",
  },
  {
    id: "finalAssembly",
    title: "Final Assembly",
    description: "Add the intro, outro, and lower thirds after the return pass.",
    owner: "Code",
  },
];

export function createEmptyRun() {
  return {
    id: "--",
    status: "pending",
    mode: "daily-discovery",
    updatedAt: new Date().toISOString(),
    captureLane: "Screen-demo capture",
    stages: stageDefinitions.map((definition) => ({
      stage: definition.id,
      status: "pending",
      summary: "",
    })),
    artifacts: [],
    qa: [],
    log: [],
  };
}
