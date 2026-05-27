import { DEV } from "solid-js";

const warnedMessages = new Set<string>();

interface BaseOptions {
  scope?: string;
  package?: string;
}

export interface WarningOptions extends BaseOptions {
  once?: boolean;
}

function formatWarningMessage(message: string, scope?: string) {
  const normalizedScope = scope?.trim();
  return normalizedScope ? `[${normalizedScope}]: ${message}` : message;
}

const SCOPE = "@solid-component";

function _warning(message: string, options: WarningOptions = {}) {
  if (!DEV) return;
  const { once, scope = SCOPE, package: pkg } = options;
  const normalizedPkg = pkg?.trim();

  const text = formatWarningMessage(message, normalizedPkg ? `${scope}/${normalizedPkg}` : scope);

  if (once) {
    if (warnedMessages.has(text)) {
      return;
    }

    warnedMessages.add(text);
  }

  console.warn(text);
}

export const warning = Object.assign(_warning, {
  reset: () => warnedMessages.clear(),
});

export const error = (message: string, options: BaseOptions = {}) => {
  const { scope = SCOPE, package: pkg } = options;
  const normalizedPkg = pkg?.trim();
  const text = formatWarningMessage(message, normalizedPkg ? `${scope}/${normalizedPkg}` : scope);
  throw new Error(text);
};
