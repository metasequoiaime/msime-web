import { Fragment } from "react";

/** Message text with `backtick` spans rendered as inline code. Nothing else is interpreted, so messages stay plain strings. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) =>
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string never reorder.
        index % 2 ? <code key={index} className="rounded-[6px] bg-panel-2 px-1.5 py-0.5 font-code text-[.9em] text-ink">{part}</code> : <Fragment key={index}>{part}</Fragment>
      )}
    </>
  );
}
