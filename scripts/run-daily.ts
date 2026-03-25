import { execFileSync } from "child_process";
import { buildProcessInvocation } from "../src/lib/process-runner";

async function main() {
  const args = process.argv.slice(2);
  const limit = findArgValue(args, "--limit");
  const screenshotLimit = findArgValue(args, "--screenshot-limit") ?? limit;
  const audioLimit = findArgValue(args, "--audio-limit") ?? limit;

  runStep("Collect candidates", ["npx", "tsx", "scripts/collect-candidates.ts"]);
  runStep("Build episode", ["npx", "tsx", "scripts/build-episode.ts"]);

  if (!args.includes("--skip-screenshots")) {
    const screenshotArgs = ["npx", "tsx", "scripts/capture-screenshots.ts"];
    if (screenshotLimit) {
      screenshotArgs.push("--limit", screenshotLimit);
    }
    runStep("Capture screenshots", screenshotArgs);
  }

  if (!args.includes("--skip-audio")) {
    const audioArgs = ["npx", "tsx", "scripts/generate-audio.ts"];
    if (audioLimit) {
      audioArgs.push("--limit", audioLimit);
    }
    runStep("Generate audio", audioArgs);
  }
}

function runStep(label: string, command: string[]) {
  console.log(`\n== ${label} ==`);
  const invocation = buildProcessInvocation(command);
  execFileSync(invocation.file, invocation.args, {
    stdio: "inherit",
  });
}

function findArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : undefined;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
