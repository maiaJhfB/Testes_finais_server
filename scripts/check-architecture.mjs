import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

const repositoryRoot = process.cwd();
const uiDirectories = [
  join(repositoryRoot, "apps/mobile/app"),
  join(repositoryRoot, "apps/mobile/src/components"),
].map(normalize);

const layers = [
  { name: "services", directory: "apps/mobile/src/services" },
  { name: "stores", directory: "apps/mobile/src/store" },
];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const importPattern =
  /(?:import|export)\s+(?:[^"'\n]*?\s+from\s+)?["']([^"']+)["']/g;

function normalize(path) {
  return resolve(path).split(sep).join("/");
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = join(directory, entry.name);
      return entry.isDirectory()
        ? walk(target)
        : sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))
          ? [target]
          : [];
    }),
  );
  return files.flat();
}

function resolveLocalImport(sourceFile, specifier) {
  if (specifier.startsWith("@/")) {
    return normalize(join(repositoryRoot, "apps/mobile/src", specifier.slice(2)));
  }
  if (specifier.startsWith(".")) {
    return normalize(resolve(dirname(sourceFile), specifier));
  }
  return null;
}

const violations = [];
for (const layer of layers) {
  const files = await walk(join(repositoryRoot, layer.directory));
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(importPattern)) {
      const target = resolveLocalImport(file, match[1]);
      if (target && uiDirectories.some((uiDirectory) => target.startsWith(uiDirectory))) {
        violations.push(
          `${relative(repositoryRoot, file)} (${layer.name}) imports UI: ${match[1]}`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Clean Architecture boundary violations found:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries are respected.");
}
