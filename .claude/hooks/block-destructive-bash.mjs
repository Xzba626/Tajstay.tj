#!/usr/bin/env node
// PreToolUse hook (matcher: Bash). Blocks destructive commands unless the
// user explicitly asked for them in this session's own message.
// TajStay treats production DB / auth / booking / payment as protected
// domains — see CLAUDE.md ("Protected domains") and ralph/guardrails.md.

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }

  const command = String(input?.tool_input?.command ?? "");
  if (!command) process.exit(0);

  const patterns = [
    { re: /git\s+push\s+(-f\b|--force\b|--force-with-lease\b)/i, label: "force push" },
    { re: /git\s+reset\s+--hard\b/i, label: "git reset --hard" },
    { re: /git\s+clean\s+.*-[a-z]*f/i, label: "git clean -f" },
    { re: /prisma\s+migrate\s+reset/i, label: "prisma migrate reset" },
    { re: /drop\s+(database|table)\b/i, label: "DROP DATABASE/TABLE" },
    { re: /rm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r/i, label: "rm -rf" },
  ];

  const hit = patterns.find((p) => p.re.test(command));
  if (!hit) process.exit(0);

  const reason =
    `Blocked by TajStay project hook: "${hit.label}" matched in the command. ` +
    "Production DB, auth, booking, and payment paths are protected domains " +
    "(see CLAUDE.md and ralph/guardrails.md) — this needs the user's explicit, " +
    "in-session request before it runs. Ask the user to confirm or run it themselves.";

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
});
