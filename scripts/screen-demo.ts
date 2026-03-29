import path from "path";
import dotenv from "dotenv";
import { runScreenDemoPipeline } from "../src/lib/screen-demo-pipeline";

dotenv.config({
  path: path.join(process.cwd(), "runtime", "screen-demo.env"),
});

function parseArgs() {
  const args = process.argv.slice(2);
  const prompt = args.join(" ").trim();
  if (!prompt) {
    throw new Error('Usage: npm run screen-demo -- "Describe the demo you want"');
  }
  return { prompt };
}

async function main() {
  const { prompt } = parseArgs();
  const result = await runScreenDemoPipeline({
    rootDir: process.cwd(),
    prompt,
  });
  console.log(result.project.projectDir);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
