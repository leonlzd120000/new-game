// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { OutputChunk } from "rollup";
import type { Plugin } from "vite";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";
const pagesRepositoryName =
  process.env.GITHUB_PAGES_REPOSITORY ?? process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "new-game";
const isUserOrOrgPages = pagesRepositoryName.endsWith(".github.io");
const githubPagesBase = isGitHubPagesBuild
  ? isUserOrOrgPages
    ? "/"
    : `/${pagesRepositoryName}/`
  : "/";

function githubPagesServerEntryPlugin(): Plugin {
  return {
    name: "github-pages-server-entry",
    enforce: "pre",
    writeBundle(options, bundle) {
      if (!isGitHubPagesBuild) return;
      if (Object.values(bundle).some((item) => item.fileName === "server.js")) return;

      const serverChunk = Object.values(bundle).find(
        (item): item is OutputChunk =>
          item.type === "chunk" && item.name === "server" && item.isDynamicEntry,
      );
      if (!serverChunk || !options.dir?.endsWith("dist/server")) return;

      const serverEntryPath = join(options.dir, "server.js");
      const serverChunkPath = join(options.dir, serverChunk.fileName);
      const importPath = relative(dirname(serverEntryPath), serverChunkPath).replaceAll("\\", "/");
      mkdirSync(dirname(serverEntryPath), { recursive: true });
      writeFileSync(
        serverEntryPath,
        [
          `import * as serverModule from "./${importPath}";`,
          "const serverEntry =",
          "  serverModule.default ??",
          "  Object.values(serverModule).find((value) => value?.fetch || value?.default?.fetch);",
          "export default serverEntry?.default ?? serverEntry;",
          "",
        ].join("\n"),
      );
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  nitro: isGitHubPagesBuild ? false : undefined,
  vite: {
    base: githubPagesBase,
    plugins: [githubPagesServerEntryPlugin()],
  },
  tanstackStart: {
    prerender: { enabled: isGitHubPagesBuild },
    server: { entry: "server" },
  },
});
