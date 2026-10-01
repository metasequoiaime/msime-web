import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ApiError, patchCommunityItem, rateItem, saveItem, type CommunityItemKind } from "../data/account";
import { HeartIcon, StarIcon, cx, useToast } from "../ui";
import { useLocale } from "../use-locale";
import { useAccount } from "./session";

export type ReactionProps = {
  kind: CommunityItemKind;
  id: string;
  ratingCount: number;
  ratingAverage: number;
  /** The viewer's own rating, 0 when they have not rated. Absent for anonymous lists. */
  myRating?: number;
  owned?: boolean;
  saved?: boolean;
  /** Shown next to the heart only when the list reported it. */
  saves?: number;
  /** Shown before the rating, so a gallery card needs no separate downloads line. */
  downloads?: number;
};

const ERRORS: Record<number, string> = {
  403: "不能给自己的作品评分。",
  404: "该作品已下架或不存在。",
  429: "操作太频繁，请稍后再试。",
};

/** `communityRating` in the App's community-helpers.ts. */
export const ratingText = (count: number, average: number) => (count === 0 ? "暂无评分" : `${average.toFixed(1)} 分`);

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * Favourite and 1–5 star rating for a community card, in one compact row: downloads and the rating summary ("★ 4.6 · 12", or 暂无评分) on the left, the heart on the right. The summary is a button that swaps itself for a five-star picker in place; picking a star rates and closes it, Escape or leaving it closes it, and focus goes back to the summary either way. Signed-out visitors see the same controls; pressing one opens the sign-in dialog. The viewer's own works cannot be rated, which the backend enforces too, so for them the summary is plain text.
 */
export function Reactions({ kind, id, ratingCount, ratingAverage, myRating = 0, owned = false, saved = false, saves, downloads }: ReactionProps) {
  const { t } = useLocale();
  const { show } = useToast();
  const { status, openLogin } = useAccount();
  const queryClient = useQueryClient();
  const [state, setState] = useState({ saved, saves, myRating, count: ratingCount, average: ratingAverage });
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState(0);
  const summaryRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLFieldSetElement>(null);
  // Set when the picker closes from the keyboard or a pick, so the summary that replaces it takes focus once it is back in the DOM.
  const refocus = useRef(false);

  useEffect(() => {
    setState({ saved, saves, myRating, count: ratingCount, average: ratingAverage });
  }, [saved, saves, myRating, ratingCount, ratingAverage]);

  const closePicker = (restoreFocus: boolean) => {
    refocus.current = restoreFocus;
    setHover(0);
    setPicking(false);
  };

  // Focus moves only when the picker opens or closes, not when the rating it shows changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: state.myRating is read once, as the star to start on
  useEffect(() => {
    if (picking) {
      const stars = pickerRef.current?.querySelectorAll<HTMLButtonElement>("button");
      stars?.[Math.max(0, state.myRating - 1)]?.focus();
      return;
    }
    if (refocus.current) summaryRef.current?.focus();
    refocus.current = false;
  }, [picking]);

  // A press outside the picker, or focus moving out of it, closes it without pulling focus back.
  useEffect(() => {
    if (!picking) return;
    const onOutside = (event: Event) => {
      if (pickerRef.current?.contains(event.target as Node)) return;
      refocus.current = false;
      setHover(0);
      setPicking(false);
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [picking]);

  const fail = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) return;
    show(t(error instanceof ApiError ? ERRORS[error.status] ?? "操作失败，请稍后再试。" : "网络连接失败，请稍后再试。"));
  };

  const toggleSave = async () => {
    if (status !== "signed-in") return status === "signed-out" ? openLogin() : undefined;
    setBusy(true);
    try {
      const result = await saveItem(kind, id, !state.saved);
      setState(current => ({ ...current, saved: result.saved, saves: result.saves ?? current.saves }));
      patchCommunityItem(queryClient, kind, id, result.saves === undefined ? { saved: result.saved } : { saved: result.saved, saves: result.saves });
      show(t(result.saved ? "已收藏" : "已取消收藏"));
      // The favourites lists gain or lose the item itself, which only a new read can place.
      void queryClient.invalidateQueries({ queryKey: ["account"], predicate: query => query.queryKey.includes("saved") });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const rate = async (stars: number) => {
    closePicker(true);
    setBusy(true);
    try {
      const result = await rateItem(kind, id, stars);
      // The new average is worked out locally; the next list read brings the backend's own. `busy` keeps a second rating from starting before this one lands, so `state` is current here.
      const count = state.myRating ? state.count : state.count + 1;
      const average = count ? (state.average * state.count - state.myRating + result.stars) / count : 0;
      setState(current => ({ ...current, myRating: result.stars, count, average }));
      patchCommunityItem(queryClient, kind, id, { my_rating: result.stars, rating_count: count, rating_average: average });
      show(t(`已评 ${result.stars} 星`));
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => {
    if (busy) return;
    if (status !== "signed-in") return status === "signed-out" ? openLogin() : undefined;
    setPicking(true);
  };

  const onPickerKey = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePicker(true);
      return;
    }
    const step = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const stars = [...(pickerRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const at = stars.indexOf(document.activeElement as HTMLButtonElement);
    stars[Math.min(stars.length - 1, Math.max(0, at + step))]?.focus();
  };

  const rated = state.count > 0;
  const mine = state.myRating > 0;
  // What the summary says to a screen reader: the score, how many rated it, the viewer's own stars.
  const summaryLabel = t([ratingText(state.count, state.average), rated && `${state.count} 人评价`, mine && `我的评分 ${state.myRating} 星`].filter(Boolean).join("，"));
  const summary = (
    <>
      <StarIcon size={14} filled={mine} className={mine ? "text-accent" : undefined} />
      <span>{rated ? `${state.average.toFixed(1)} · ${state.count.toLocaleString("en-US")}` : t("暂无评分")}</span>
    </>
  );
  const summaryClass = cx("inline-flex h-6 min-w-0 items-center gap-1 rounded-full px-1.5 text-[13px] whitespace-nowrap pointer-coarse:h-8", mine && "text-accent-ink");

  return (
    <div className="mt-3 flex items-center gap-2 text-[13px] text-muted tabular-nums">
      <div className="flex min-w-0 items-center gap-1.5">
        {downloads !== undefined && (
          <span className="flex-none">
            <span aria-hidden="true">↓ {downloads.toLocaleString("en-US")}</span>
            <span className="sr-only">{t(`下载 ${downloads.toLocaleString("en-US")} 次`)}</span>
          </span>
        )}
        {owned ? (
          <span className={cx(summaryClass, downloads !== undefined && "-ml-0.5")} title={t("不能给自己的作品评分")}>
            <span className="sr-only">{summaryLabel}</span>
            <span className="contents" aria-hidden="true">{summary}</span>
          </span>
        ) : picking ? (
          <fieldset ref={pickerRef} className="m-0 flex min-w-0 rounded-full border-0 bg-panel-2 px-1 py-0 shadow-ring-2" onKeyDown={onPickerKey} onPointerLeave={() => setHover(0)}>
            <legend className="sr-only">{t(mine ? `评分（当前 ${state.myRating} 星），按 Esc 取消` : "评分，按 Esc 取消")}</legend>
            {STARS.map(stars => (
              <button
                key={stars}
                type="button"
                className={cx("inline-flex size-[22px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 transition-colors pointer-coarse:size-8", stars <= (hover || state.myRating) ? "text-accent" : "text-muted hover:text-ink")}
                aria-label={t(`评 ${stars} 星`)}
                aria-pressed={state.myRating === stars}
                onPointerEnter={() => setHover(stars)}
                // Keyboard focus previews the stars Enter would give; focus that followed a click leaves the preview to the pointer.
                onFocus={event => event.currentTarget.matches(":focus-visible") && setHover(stars)}
                onClick={() => void rate(stars)}
              >
                <StarIcon filled={stars <= (hover || state.myRating)} />
              </button>
            ))}
          </fieldset>
        ) : (
          <button
            ref={summaryRef}
            type="button"
            className={cx(summaryClass, "cursor-pointer border-0 bg-transparent transition-colors hover:bg-hover hover:text-ink", downloads !== undefined && "-ml-0.5")}
            aria-label={`${summaryLabel}${t(mine ? "，修改评分" : "，评分")}`}
            title={t(mine ? "修改评分" : "评分")}
            onClick={openPicker}
          >
            {summary}
          </button>
        )}
      </div>
      <button
        type="button"
        className={cx("ml-auto inline-flex h-6 flex-none cursor-pointer items-center gap-1 rounded-full border-0 bg-transparent px-1.5 text-[13px] transition-colors disabled:opacity-45 pointer-coarse:h-8", state.saved ? "text-accent-ink" : "text-muted hover:text-ink")}
        aria-pressed={state.saved}
        aria-label={t(state.saved ? "取消收藏" : "收藏")}
        disabled={busy}
        onClick={() => void toggleSave()}
      >
        <HeartIcon filled={state.saved} />
        {state.saves !== undefined && <span aria-hidden="true">{state.saves.toLocaleString("en-US")}</span>}
      </button>
    </div>
  );
}
