export function triggerFocus(
  element: HTMLInputElement | HTMLTextAreaElement,
  options: FocusOptions & { cursor?: "start" | "end" | "all" } = {},
) {
  element.focus(options);

  const { cursor } = options;
  if (!cursor) return;
  const len = element.value.length;

  switch (cursor) {
    case "start":
      element.setSelectionRange(0, 0);
      break;
    case "end":
      element.setSelectionRange(len, len);
      break;
    default:
      element.setSelectionRange(0, len);
  }
}
