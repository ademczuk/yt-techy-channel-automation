import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function checkCommand(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch {
    return "missing";
  }
}

function main() {
  const root = process.cwd();
  const templatePath = path.join(root, "runtime", "templates", "screen-demo.env.example");
  const targetPath = path.join(root, "runtime", "screen-demo.env");

  if (!fs.existsSync(targetPath) && fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, targetPath);
  }

  console.log("Node:", process.version);
  console.log("Python:", checkCommand("python", ["--version"]));
  console.log("FFmpeg:", checkCommand("ffmpeg", ["-version"]).split(/\r?\n/, 1)[0]);
  console.log("Env template:", targetPath);
}

main();
