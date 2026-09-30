/** Joins class names, skipping falsy entries. Later classes do not override conflicting utilities (Tailwind orders by utility, not by class order), so pass only additive classes. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
