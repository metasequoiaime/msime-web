import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ApiError, rateItem, saveItem, type CommunityItemKind } from "../data/account";
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
};

const ERRORS: Record<number, string> = {
  403: "不能给自己的作品评分。",
  404: "该作品已下架或不存在。",
  429: "操作太频繁，请稍后再试。",
};

/** `communityRating` in the App's community-helpers.ts. */
export const ratingText = (count: number, average: number) => (count === 0 ? "暂无评分" : `${average.toFixed(1)} 分`);

/**
 * Favourite and 1–5 star rating for a community card, in one compact row: the average on the left, the viewer's stars and the heart on the right. Signed-out visitors see the same controls; pressing one opens the sign-in dialog. The viewer's own works cannot be rated, which the backend enforces too.
 */
export function Reactions({ kind, id, ratingCount, ratingAverage, myRating = 0, owned = false, saved = false, saves }: ReactionProps) {
  const { t } = useLocale();
  const { show } = useToast();
  const { status, openLogin } = useAccount();
  const queryClient = useQueryClient();
  const [state, setState] = useState({ saved, saves, myRating, count: ratingCount, average: ratingAverage });
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(0);

  useEffect(() => {
    setState({ saved, saves, myRating, count: ratingCount, average: ratingAverage });
  }, [saved, saves, myRating, ratingCount, ratingAverage]);

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
      show(t(result.saved ? "已收藏" : "已取消收藏"));
      void queryClient.invalidateQueries({ queryKey: ["account"], predicate: query => query.queryKey.includes("saved") });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const rate = async (stars: number) => {
    if (status !== "signed-in") return status === "signed-out" ? openLogin() : undefined;
    setBusy(true);
    try {
      const result = await rateItem(kind, id, stars);
      // The new average is worked out locally; the next list read brings the backend's own.
      setState(current => {
        const count = current.myRating ? current.count : current.count + 1;
        const total = current.average * current.count - current.myRating + result.stars;
        return { ...current, myRating: result.stars, count, average: count ? total / count : 0 };
      });
      show(t(`已评 ${result.stars} 星`));
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || state.myRating;
  const rateDisabled = busy || owned;
  return (
    <div className="mt-3 flex items-center gap-2 text-[13px] text-muted tabular-nums">
      <span className="min-w-0 truncate">
        {t(ratingText(state.count, state.average))}
        {state.count > 0 && <span className="sr-only">{t(`，${state.count} 人评价`)}</span>}
      </span>
      <div className="ml-auto flex flex-none items-center gap-0.5">
        <fieldset className="m-0 flex min-w-0 border-0 p-0" title={owned ? t("不能给自己的作品评分") : undefined} onPointerLeave={() => setHover(0)}>
          <legend className="sr-only">{t(state.myRating ? `我的评分：${state.myRating} 星` : "评分")}</legend>
          {[1, 2, 3, 4, 5].map(stars => (
            <button
              key={stars}
              type="button"
              className={cx("inline-flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 transition-colors disabled:cursor-default disabled:opacity-45 pointer-coarse:size-8", stars <= shown ? "text-accent" : "text-muted hover:text-ink")}
              aria-label={t(`评 ${stars} 星`)}
              aria-pressed={state.myRating === stars}
              disabled={rateDisabled}
              onPointerEnter={() => !rateDisabled && setHover(stars)}
              onClick={() => void rate(stars)}
            >
              <StarIcon filled={stars <= shown} />
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          className={cx("inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border-0 bg-transparent px-1.5 text-[13px] transition-colors disabled:opacity-45 pointer-coarse:h-8", state.saved ? "text-accent-ink" : "text-muted hover:text-ink")}
          aria-pressed={state.saved}
          aria-label={t(state.saved ? "取消收藏" : "收藏")}
          disabled={busy}
          onClick={() => void toggleSave()}
        >
          <HeartIcon filled={state.saved} />
          {state.saves !== undefined && <span aria-hidden="true">{state.saves.toLocaleString("en-US")}</span>}
        </button>
      </div>
    </div>
  );
}
