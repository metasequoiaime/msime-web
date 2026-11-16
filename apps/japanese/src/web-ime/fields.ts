/**
 * Which fields the site-wide web IME types into: every editable `<textarea>`, and `<input>` of type text or search. Email and number fields throw from `setRangeText`, which the SDK writes with, and url and password fields take no Chinese, so those stay with the browser.
 *
 * A field that takes codes rather than words (a pinyin spelling, a lookup code, a GitHub user name) opts out with `data-msime="off"` on itself or an ancestor, so the IME does not start composing the letters typed there. In every other field a single Shift switches to English.
 */
export type ImeField = HTMLInputElement | HTMLTextAreaElement;

const TEXT_INPUT_TYPES = new Set(["text", "search"]);

export const isImeField = (target: EventTarget | null): target is ImeField => {
  const isText = target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type));
  return isText && !target.readOnly && !target.disabled && !target.closest('[data-msime="off"]');
};
