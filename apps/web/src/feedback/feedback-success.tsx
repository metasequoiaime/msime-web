import type { Ref } from "react";
import { useLocale } from "../use-locale";
import { AnchorButton, Button, CheckIcon } from "../ui";

/** Completion view (design-home §8 "完成视图"), shown in place of the form card once GitHub has returned the created issue. */
export function FeedbackSuccess({ issueUrl, repo, onReset, panelRef }: { issueUrl: string; repo: string; onReset: () => void; panelRef: Ref<HTMLElement> }) {
  const { t } = useLocale();
  const number = issueUrl.slice(issueUrl.lastIndexOf("/") + 1);
  return (
    <section
      className="min-w-0 flex-[1_1_min(100%,560px)] rounded-card bg-panel p-[clamp(28px,4vw,48px)] shadow-card outline-none"
      aria-live="polite"
      aria-labelledby="feedback-success-title"
      tabIndex={-1}
      ref={panelRef}
    >
      <span className="grid size-[52px] place-items-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
        <CheckIcon size={24} strokeWidth={2.4} />
      </span>
      <h2 id="feedback-success-title" className="m-0 mt-[18px] font-heading text-2xl font-bold text-ink">
        {t("已提交，谢谢你")}
      </h2>
      <p className="m-0 mt-2.5 text-[15.5px] leading-[1.9] text-body">
        {t(`已在 ${repo} 创建 Issue。维护者会在对应仓库讨论、评估并跟进；提交并不代表已经排入开发计划。`)}
      </p>
      <div className="mt-[22px] flex flex-wrap gap-2.5">
        <AnchorButton href={issueUrl}>{t(`查看 Issue #${number} ↗`)}</AnchorButton>
        <Button variant="ghost" onClick={onReset}>
          {t("再提交一条")}
        </Button>
      </div>
    </section>
  );
}
