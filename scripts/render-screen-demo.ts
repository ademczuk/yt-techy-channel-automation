import path from "path";
import { renderScreenDemoFromProps } from "../src/lib/screen-demo-render";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      opts[args[i].slice(2)] = args[i + 1] ?? "";
      i++;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const propsPath = opts.props;
  const output = opts.output;

  if (!propsPath || !output) {
    throw new Error("Usage: npm run screen-demo:render -- --props <render-props.json> --output <demo.mp4>");
  }

  await renderScreenDemoFromProps({
    rootDir: process.cwd(),
    propsPath: path.resolve(propsPath),
    outputPath: path.resolve(output),
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
