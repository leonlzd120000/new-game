process.env.GITHUB_PAGES = "true";
process.env.GITHUB_PAGES_REPOSITORY ??= "new-game";
process.env.CI ??= "true";

if (process.stdin && typeof process.stdin.off !== "function") {
  process.stdin.off = process.stdin.removeListener.bind(process.stdin);
}

process.argv = [process.argv[0] ?? "node", "vite", "build"];
await import(new URL("../node_modules/vite/bin/vite.js", import.meta.url).href);
