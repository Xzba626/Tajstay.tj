const major = Number.parseInt(process.versions.node.split(".")[0] || "0", 10);

if (!Number.isFinite(major) || major < 18 || major > 20) {
  console.error(
    [
      "",
      "Unsupported Node.js version for this project.",
      `Current: v${process.versions.node}`,
      "Required: Node 20 LTS (recommended) or Node 18 LTS.",
      "",
      "Install Node 20 and run again.",
      ""
    ].join("\n")
  );
  process.exit(1);
}
