import type { ReactNode } from "react";
import { LocaleLink } from "../locale-link";
import { useLocale } from "../use-locale";
import { Card } from "../ui";

function Tip({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <div>
      <h2 className="m-0 font-heading text-[15.5px] font-bold text-ink">{t(title)}</h2>
      <p className="m-0 mt-1 text-sm leading-[1.75] text-body">{children}</p>
    </div>
  );
}

/** Side column (design-home §8 "侧栏"): where the issue will be created, then four short tips. */
export function FeedbackAside({ targetLabel, repo }: { targetLabel: string; repo: string }) {
  const { t } = useLocale();
  return (
    <aside className="flex max-w-full min-w-0 flex-[1_1_300px] flex-col gap-3.5" aria-label={t("反馈说明")}>
      <Card tone="muted" className="rounded-tile px-6 py-[22px]">
        <p className="m-0 text-[13px] text-muted">{t("提交到")}</p>
        <p className="m-0 mt-1.5 font-heading text-lg font-bold text-ink">{t(targetLabel)}</p>
        <a className="mt-1.5 inline-block font-mono text-[13.5px] [overflow-wrap:anywhere]" href={`https://github.com/metasequoiaime/${repo}/issues`} target="_blank" rel="noreferrer">
          {repo} ↗
        </a>
      </Card>
      <Card className="flex flex-col gap-4 rounded-tile px-6 py-[22px]">
        <Tip title="先查常见问题">
          {t("字体方框、设置打不开或快捷键冲突？先在")}
          <LocaleLink to="/faq/" target="_blank" rel="noreferrer">{t("常见问题")}</LocaleLink>
          {t("里试试已有的排查办法。")}
        </Tip>
        <Tip title="描述清楚，方便排查">
          {t("说清楚遇到的问题、目前的做法，以及你希望的结果。提交前也可以搜索已有 Issue，避免重复。")}
        </Tip>
        <Tip title="打不出来的词">
          {t("缺词请用")}
          <LocaleLink to="/words/" target="_blank" rel="noreferrer">{t("词库共建")}</LocaleLink>
          {t("提交，词条会汇入词库仓库公开的 Pull Request。")}
        </Tip>
        <Tip title="隐私与安全">
          {t("表单内容会公开。安全漏洞请按")}
          <a href="https://github.com/metasequoiaime/.github/blob/main/SECURITY.md" target="_blank" rel="noreferrer">{t("安全策略")}</a>
          {t("私下报告。")}
        </Tip>
      </Card>
    </aside>
  );
}
