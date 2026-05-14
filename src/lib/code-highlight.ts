import { createHighlighter, type BuiltinLanguage, type BuiltinTheme } from "shiki";

const codeTheme = "github-light" satisfies BuiltinTheme;

const languageAliases: Record<string, BuiltinLanguage> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  html: "html",
  css: "css",
  json: "json",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  md: "markdown",
  markdown: "markdown",
  diff: "diff",
};

const highlighterPromise = createHighlighter({
  themes: [codeTheme],
  langs: [
    "javascript",
    "jsx",
    "typescript",
    "tsx",
    "html",
    "css",
    "json",
    "bash",
    "markdown",
    "diff",
  ],
});

export function normalizeCodeLanguage(language?: string): BuiltinLanguage {
  const normalized = language?.trim().toLowerCase() ?? "tsx";
  return languageAliases[normalized] ?? "tsx";
}

export function getCodeTheme() {
  return codeTheme;
}

export async function highlightCodeToHtml(code: string, language?: string) {
  const highlighter = await highlighterPromise;

  return highlighter.codeToHtml(code, {
    lang: normalizeCodeLanguage(language),
    theme: codeTheme,
  });
}
