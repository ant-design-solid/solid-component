export function getShadowRoot(node?: Node | null) {
  const root = node?.getRootNode?.();
  return root instanceof ShadowRoot ? root : null;
}
