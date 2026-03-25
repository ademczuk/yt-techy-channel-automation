import { execFileSync } from "child_process";

export interface ProcessInvocation {
  file: string;
  args: string[];
}

export function buildProcessInvocation(command: string[]): ProcessInvocation {
  if (command.length === 0) {
    throw new Error("Cannot run an empty command");
  }

  const [file, ...args] = command;

  if (
    process.platform === "win32" &&
    (file === "npx" || file === "npm" || file === "pnpm" || file === "yarn")
  ) {
    return {
      file: "cmd.exe",
      args: ["/d", "/s", "/c", [file, ...args].map(quoteWindowsArg).join(" ")],
    };
  }

  return { file, args };
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"]/g.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}
