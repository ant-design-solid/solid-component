import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, "packages");
const outputPath = path.join(rootDir, "src", "generated", "package-api.ts");

function discoverEntries() {
  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((packageName) => {
      const declarationPath = path.join(packagesDir, packageName, "dist", "index.d.ts");

      if (!fs.existsSync(declarationPath)) {
        return [];
      }

      return [{ packageName, declarationPath }];
    });
}

function unwrapAliasedSymbol(symbol, checker) {
  if (symbol.flags & ts.SymbolFlags.Alias) {
    try {
      return checker.getAliasedSymbol(symbol);
    } catch {
      return symbol;
    }
  }

  return symbol;
}

function getPrimaryDeclaration(symbol) {
  const declarations = symbol.getDeclarations() ?? [];
  return declarations[0];
}

function getLineRegions(sourceFile) {
  const regions = [];
  let currentRegion;

  for (const [index, line] of sourceFile.text.split(/\r?\n/).entries()) {
    const match = line.match(/^\/\/#region\s+(.+)$/);
    if (match) {
      currentRegion = match[1];
    }

    regions[index] = currentRegion;
  }

  return regions;
}

function toSourceLabel(packageName, regionPath) {
  if (!regionPath || !regionPath.startsWith("src/")) {
    return undefined;
  }

  const stem = regionPath.slice(4).replace(/\.d\.ts$/, "");
  const packageSrcDir = path.join(packagesDir, packageName, "src");
  const candidates = [`${stem}.ts`, `${stem}.tsx`];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(packageSrcDir, candidate))) {
      return candidate.replace(/\\/g, "/");
    }
  }

  return `${stem}.d.ts`;
}

function getDeclarationInfo(packageName, declaration) {
  const sourceFile = declaration?.getSourceFile();

  if (!sourceFile) {
    return {};
  }

  const lineRegions = getLineRegions(sourceFile);
  const line = ts.getLineAndCharacterOfPosition(sourceFile, declaration.getStart()).line;
  const regionPath = lineRegions[line];
  const source = toSourceLabel(packageName, regionPath);

  return {
    regionPath,
    source,
    isLocal: !!source,
  };
}

function getDocumentation(symbol, checker) {
  const text = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
  return text || undefined;
}

function hasCallableDeclaration(symbol, declaration, checker) {
  if (
    declaration &&
    (ts.isFunctionDeclaration(declaration) ||
      ts.isMethodDeclaration(declaration) ||
      ts.isMethodSignature(declaration) ||
      ts.isFunctionExpression(declaration) ||
      ts.isArrowFunction(declaration))
  ) {
    return true;
  }

  if (!declaration) {
    return false;
  }

  const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
  return type.getCallSignatures().length > 0;
}

function inferKind(name, symbol, declaration, checker) {
  if (
    symbol.flags & ts.SymbolFlags.Interface ||
    symbol.flags & ts.SymbolFlags.TypeAlias ||
    symbol.flags & ts.SymbolFlags.TypeParameter
  ) {
    return "type";
  }

  if (name.startsWith("use")) {
    return "hook";
  }

  if (hasCallableDeclaration(symbol, declaration, checker) && /^[A-Z]/.test(name)) {
    return "component";
  }

  return "function";
}

function formatDescription(text) {
  if (!text) {
    return undefined;
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function isExternalSource(source) {
  return !source || source.includes("node_modules") || source.startsWith("../");
}

function generate() {
  const entries = discoverEntries();

  if (entries.length === 0) {
    throw new Error("No package declaration files found. Run `pnpm build:packages` first.");
  }

  const program = ts.createProgram({
    rootNames: entries.map((entry) => entry.declarationPath),
    options: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
    },
  });
  const checker = program.getTypeChecker();
  const packageApi = {};

  for (const { packageName, declarationPath } of entries) {
    const sourceFile = program.getSourceFile(declarationPath);

    if (!sourceFile) {
      throw new Error(`Unable to read declaration file: ${declarationPath}`);
    }

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

    if (!moduleSymbol) {
      packageApi[packageName] = [];
      continue;
    }

    const items = checker
      .getExportsOfModule(moduleSymbol)
      .filter((symbol) => symbol.name !== "default")
      .map((symbol) => {
        const exportedDeclaration = getPrimaryDeclaration(symbol);
        const target = unwrapAliasedSymbol(symbol, checker);
        const targetDeclaration = getPrimaryDeclaration(target);
        const exportedInfo = getDeclarationInfo(packageName, exportedDeclaration);
        const targetInfo = getDeclarationInfo(packageName, targetDeclaration);
        const candidateSource = targetInfo.source ?? exportedInfo.source ?? "index.d.ts";
        const source = isExternalSource(candidateSource)
          ? exportedInfo.source ?? "index.d.ts"
          : candidateSource;
        const description = targetInfo.isLocal
          ? getDocumentation(target, checker)
          : exportedInfo.isLocal
            ? getDocumentation(symbol, checker)
            : undefined;

        return {
          name: symbol.name,
          kind: inferKind(symbol.name, target, targetDeclaration, checker),
          description: isExternalSource(candidateSource)
            ? formatDescription(exportedInfo.isLocal ? getDocumentation(symbol, checker) : undefined)
            : formatDescription(description),
          source,
        };
      })
      .sort((a, b) => {
        if (a.kind !== b.kind) {
          return a.kind.localeCompare(b.kind);
        }

        return a.name.localeCompare(b.name);
      });

    packageApi[packageName] = items;
  }

  const fileContents = `export type GeneratedPackageApiItem = {
  name: string;
  kind: "component" | "hook" | "function" | "type";
  description?: string;
  source: string;
};

export const generatedPackageApi: Record<string, GeneratedPackageApiItem[]> = ${JSON.stringify(
    packageApi,
    null,
    2,
  )};
`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, fileContents);
}

generate();
