/** Tailwind class strings shared by the feedback form, its template fields and the issue preview (design-home §8). Kept in one module so the page and the field renderer stay visually identical. */

/** Step title ("确认并提交"). */
export const stepTitleClass = "m-0 font-heading text-base font-bold text-ink";

/** Muted explanatory text under a step title or a field. */
export const hintClass = "m-0 text-[13.5px] leading-[1.75] text-muted";

/** Label above a single input or textarea. */
export const fieldLabelClass = "block text-sm font-normal text-ink";

/** Text input: 44px tall, tinted panel, no border; the outline comes from the global focus ring and an invalid state ring. */
export const inputClass =
  "mt-2 block h-11 w-full min-w-0 rounded-field border-0 bg-panel-2 px-3.5 font-sans text-[15px] text-ink placeholder:text-muted user-invalid:shadow-ring-warn disabled:opacity-60";

/** Multi-line input with the same surface as `inputClass`. */
export const textareaClass =
  "mt-2 block w-full min-w-0 resize-y rounded-field border-0 bg-panel-2 px-3.5 py-3 font-sans text-[14.5px] leading-[1.7] text-ink placeholder:text-muted user-invalid:shadow-ring-warn disabled:opacity-60";

/** Selectable row for template checkbox and radio options; the control stays visible because several can be ticked. */
export const optionRowClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-field bg-panel-2 px-3 py-2 text-sm leading-[1.6] text-ink transition-[background-color,box-shadow] duration-150 has-[:checked]:bg-accent-soft has-[:checked]:shadow-ring-accent has-[:disabled]:cursor-default has-[:disabled]:opacity-60";

/** Native checkbox or radio inside an option row or the consent line. */
export const checkClass = "m-0 size-[18px] flex-none accent-accent";

/** Required marker: the design's warn-coloured asterisk. */
export const requiredMarkClass = "ml-1 text-warn";

/** Inline error or warning block. */
export const alertClass = "m-0 rounded-field bg-warn-soft px-4 py-3 text-sm leading-[1.75] text-body";

/** Rendered Markdown: template notes and descriptions, and the issue preview body. The markup comes from markdown-it, so its elements are styled through descendant variants. */
export const markdownClass = [
  "text-[14.5px] leading-[1.85] text-body [overflow-wrap:anywhere]",
  "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
  "[&_:is(h1,h2,h3,h4,h5,h6)]:mt-5 [&_:is(h1,h2,h3,h4,h5,h6)]:mb-1.5 [&_:is(h1,h2,h3,h4,h5,h6)]:font-heading [&_:is(h1,h2,h3,h4,h5,h6)]:text-[15px] [&_:is(h1,h2,h3,h4,h5,h6)]:leading-normal [&_:is(h1,h2,h3,h4,h5,h6)]:font-bold [&_:is(h1,h2,h3,h4,h5,h6)]:text-ink",
  "[&_:is(p,ul,ol,blockquote,pre,table)]:my-2.5",
  "[&_:is(ul,ol)]:pl-6 [&_ul>li]:list-disc [&_ol>li]:list-decimal [&_li]:my-1",
  "[&_blockquote]:border-l-[3px] [&_blockquote]:border-hair-2 [&_blockquote]:pl-4 [&_blockquote]:text-muted",
  "[&_code]:rounded-[5px] [&_code]:bg-panel-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-field [&_pre]:bg-panel-2 [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_:is(th,td)]:border [&_:is(th,td)]:border-hair-2 [&_:is(th,td)]:px-2.5 [&_:is(th,td)]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink",
  "[&_hr]:my-5 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-hair-2",
  "[&_img]:block [&_img]:h-auto [&_img]:max-w-full",
].join(" ");

/** Button that wraps a local screenshot inside the issue preview so it opens the viewer. Applied from an effect, outside React. */
export const previewImageButtonClass =
  "my-3 block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-field bg-panel p-0 shadow-hair-2 [&_img]:max-h-80 [&_img]:object-contain";
