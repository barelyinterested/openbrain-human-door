import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp } from "fs/promises";

const allowlist = [
  "cookie-parser",
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-google-oauth20",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server (local dev)...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  // Standard server (local dev / traditional hosting)
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Vercel serverless build — ALL deps bundled inline, no external requires
  // This compiles directly to api/index.js so Vercel recognizes it as a function
  console.log("building Vercel serverless bundle...");
  await esbuild({
    entryPoints: ["server/vercel.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.js",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
    // No external — bundle EVERYTHING so Vercel doesn't need node_modules
    external: [
      // Only exclude native Node.js built-ins
      "fs", "path", "http", "https", "net", "tls", "crypto", "os", "url",
      "stream", "buffer", "util", "events", "querystring", "zlib", "child_process",
      "dns", "dgram", "cluster", "module", "readline", "repl", "vm",
      "assert", "perf_hooks", "async_hooks", "worker_threads", "timers",
    ],
    logLevel: "info",
  });

  // Copy dist/public into api/public so Vercel's function can always find static files
  console.log("copying static files into api/public...");
  await cp("dist/public", "api/public", { recursive: true });

  console.log("done!");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
