#!/usr/bin/env node
// PostToolUse hook (matcher: Edit|Write). Lints only the file that was just
// touched (not the whole repo) and feeds any lint errors back to Claude.
// Never blocks the edit — this is a fast, non-blocking signal.

import { spawnSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }

  const filePath =
    input?.tool_response?.filePath ?? input?.tool_input?.file_path ?? "";
  if (!/\.(ts|tsx)$/i.test(filePath)) process.exit(0);

  const result = spawnSync("npx", ["eslint", "--fix", filePath], {
    encoding: "utf8",
    timeout: 30000,
    shell: true,
  });

  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status && output) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `eslint on ${filePath}:\n${output.slice(0, 4000)}`,
        },
      })
    );
  }
  process.exit(0);
});
