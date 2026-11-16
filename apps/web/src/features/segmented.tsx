import { cx } from "../ui";
import { useLocale } from "../use-locale";

type SegmentedProps<T extends string> = {
  /** Accessible name of the group; shown above the options when `showLegend` is set, otherwise read by screen readers only. */
  legend: string;
  showLegend?: boolean;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * A row of mutually exclusive options in the design's tab style: a tinted well with the selected option raised on a panel. Each option is a toggle button with `aria-pressed`; the `fieldset` + `legend` pair names the group.
 */
export function Segmented<T extends string>({ legend, showLegend = false, options, value, onChange, className }: SegmentedProps<T>) {
  const { t } = useLocale();
  return (
    <fieldset className={cx("m-0 min-w-0 border-0 p-0", className)}>
      <legend className={showLegend ? "mb-2 p-0 text-sm font-semibold text-body" : "sr-only"}>{t(legend)}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-field bg-panel-2 p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onChange(option.value);
              }}
              className={cx(
                "min-h-10 cursor-pointer rounded-tab px-2.5 text-sm sm:px-4 font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150",
                active ? "bg-panel text-ink shadow-tab" : "bg-transparent text-muted hover:text-ink"
              )}
            >
              {t(option.label)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
