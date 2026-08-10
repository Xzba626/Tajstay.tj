const major = Number.parseInt(process.versions.node.split(".")[0] || "0", 10);

// Vercel requires Node 24.x (engines in package.json). Locally allow 20–24 LTS range.
if (!Number.isFinite(major) || major < 20 || major > 24) {
  console.error(
    [
      "",
      "Unsupported Node.js version for this project.",
      `Current: v${process.versions.node}`,
      "Required: Node 24.x (Vercel) — locally Node 20–24 LTS is accepted.",
      "",
      "Install Node 24 and run again (see package.json engines).",
      ""
    ].join("\n")
  );
  process.exit(1);
}
