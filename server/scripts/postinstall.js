const { spawnSync } = require("child_process");

function run() {
  // Run Prisma generate, but never fail the install on Windows.
  // Prisma on Windows can intermittently fail with EPERM when the query engine DLL is locked.
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(cmd, ["prisma", "generate"], {
    stdio: "inherit",
    shell: false,
  });

  if (result.status === 0) return 0;

  console.warn("\n[postinstall] Prisma client generation failed.");
  console.warn("This is often caused by a locked Prisma engine file on Windows (EPERM/operation not permitted).\n");
  console.warn("Fix:");
  console.warn("- Close other Node/Prisma processes, then run: npm run prisma:generate\n");

  // Do NOT fail `npm install`.
  return 0;
}

process.exit(run());
